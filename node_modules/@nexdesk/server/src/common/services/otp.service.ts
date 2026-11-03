import { randomUUID, randomInt, createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '../db/prisma.js';
import { config } from '../config/index.js';
import { emailService } from '../email/email.service.js';
import { logger } from '../utils/logger.js';
import { store } from '../db/store.js';

export type OtpPurpose =
  | 'LOGIN_VERIFICATION'
  | 'ACCOUNT_ACTIVATION'
  | 'PASSWORD_RESET'
  | 'PROFILE_UPDATE'
  | 'EMAIL_CHANGE';

export interface OtpChallengeResponse {
  challengeId: string;
  recipientMasked: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
  purpose: OtpPurpose;
}

export interface VerifyOtpResult {
  verified: boolean;
  userId?: string;
  email: string;
  purpose: OtpPurpose;
  payload?: any;
}

class OtpService {
  private hashOtp(otp: string): string {
    return createHmac('sha256', config.SESSION_SECRET)
      .update(otp.trim())
      .digest('hex');
  }

  private maskEmail(email: string): string {
    const parts = email.trim().toLowerCase().split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) {
      return `${name[0]}***@${domain}`;
    }
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
  }

  /**
   * Request / issue a 6-digit secure email OTP challenge
   */
  async createChallenge(params: {
    email: string;
    userId?: string;
    purpose: OtpPurpose;
    payload?: any;
    userName?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<OtpChallengeResponse> {
    const normalizedEmail = params.email.trim().toLowerCase();

    // 1. Check existing active challenge to enforce 60-second resend cooldown
    const activeChallenge = await prisma.otpChallenge.findFirst({
      where: {
        email: normalizedEmail,
        purpose: params.purpose,
        isConsumed: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    if (activeChallenge && activeChallenge.resendAfter > now) {
      const waitSeconds = Math.ceil((activeChallenge.resendAfter.getTime() - now.getTime()) / 1000);
      throw new Error(`Please wait ${waitSeconds} seconds before requesting a new verification code.`);
    }

    // 2. Invalidate any existing unconsumed challenges for this email & purpose
    await prisma.otpChallenge.updateMany({
      where: {
        email: normalizedEmail,
        purpose: params.purpose,
        isConsumed: false
      },
      data: {
        isConsumed: true,
        consumedAt: now
      }
    });

    // 3. Generate cryptographically secure 6-digit numeric OTP
    const rawOtp = randomInt(100000, 999999).toString();
    const otpHash = this.hashOtp(rawOtp);

    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes validity
    const resendAfter = new Date(now.getTime() + 60 * 1000); // 60 seconds cooldown
    const challengeId = randomUUID();

    // 4. Record challenge in database (never plain text OTP)
    await prisma.otpChallenge.create({
      data: {
        id: challengeId,
        userId: params.userId || null,
        email: normalizedEmail,
        otpHash,
        purpose: params.purpose,
        payload: params.payload || null,
        expiresAt,
        resendAfter,
        attempts: 0,
        maxAttempts: 5,
        isConsumed: false,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        createdAt: now
      }
    });

    // 5. Audit the OTP request event (without sensitive plaintext)
    store.logAction(
      'OTP_REQUESTED',
      'User',
      params.userId || normalizedEmail,
      params.userId,
      { purpose: params.purpose, challengeId },
      params.ipAddress,
      params.userAgent
    );

    // 6. Send OTP to registered email
    const emailResult = await emailService.sendOtpEmail({
      to: normalizedEmail,
      userId: params.userId,
      name: params.userName,
      otp: rawOtp,
      purpose: params.purpose,
      expiresMinutes: 5
    });

    if (!emailResult.success) {
      logger.warn({ recipient: normalizedEmail, purpose: params.purpose }, 'Failed to deliver OTP email.');
    }

    return {
      challengeId,
      recipientMasked: this.maskEmail(normalizedEmail),
      expiresInSeconds: 300,
      resendAvailableInSeconds: 60,
      purpose: params.purpose
    };
  }

  /**
   * Verify an entered 6-digit OTP
   */
  async verifyChallenge(params: {
    challengeId?: string;
    email?: string;
    otp: string;
    purpose: OtpPurpose;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<VerifyOtpResult> {
    const rawOtp = (params.otp || '').trim();
    if (!/^\d{6}$/.test(rawOtp)) {
      throw new Error('Verification code must be exactly 6 numeric digits.');
    }

    const now = new Date();
    let challenge: any = null;

    if (params.challengeId) {
      challenge = await prisma.otpChallenge.findUnique({
        where: { id: params.challengeId }
      });
    } else if (params.email) {
      challenge = await prisma.otpChallenge.findFirst({
        where: {
          email: params.email.trim().toLowerCase(),
          purpose: params.purpose,
          isConsumed: false
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (!challenge) {
      throw new Error('Verification challenge not found or already consumed. Please request a new code.');
    }

    // Check consumption
    if (challenge.isConsumed) {
      throw new Error('This verification code has already been used. Please request a fresh code.');
    }

    // Check expiration
    if (challenge.expiresAt < now) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { isConsumed: true, consumedAt: now }
      });
      throw new Error('Verification code has expired. Please request a new code.');
    }

    // Check brute-force attempts limit
    if (challenge.attempts >= challenge.maxAttempts) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { isConsumed: true, consumedAt: now }
      });
      throw new Error('Maximum verification attempts exceeded. Code has been invalidated for security.');
    }

    // Timing-safe constant-time hash comparison
    const incomingHash = this.hashOtp(rawOtp);
    const storedBuf = Buffer.from(challenge.otpHash, 'hex');
    const incomingBuf = Buffer.from(incomingHash, 'hex');

    const isMatch = storedBuf.length === incomingBuf.length && timingSafeEqual(storedBuf, incomingBuf);

    if (!isMatch) {
      const nextAttempts = challenge.attempts + 1;
      const remainingAttempts = challenge.maxAttempts - nextAttempts;

      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: {
          attempts: nextAttempts,
          ...(remainingAttempts <= 0 && { isConsumed: true, consumedAt: now })
        }
      });

      store.logAction(
        'OTP_VERIFICATION_FAILED',
        'User',
        challenge.userId || challenge.email,
        challenge.userId,
        { purpose: params.purpose, remainingAttempts: Math.max(0, remainingAttempts) },
        params.ipAddress,
        params.userAgent
      );

      if (remainingAttempts <= 0) {
        throw new Error('Incorrect verification code. Maximum attempts exceeded. Code invalidated.');
      }
      throw new Error(`Incorrect verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`);
    }

    // Verification Succeeded: Mark consumed
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        isConsumed: true,
        consumedAt: now
      }
    });

    store.logAction(
      'OTP_VERIFIED',
      'User',
      challenge.userId || challenge.email,
      challenge.userId,
      { purpose: params.purpose },
      params.ipAddress,
      params.userAgent
    );

    return {
      verified: true,
      userId: challenge.userId || undefined,
      email: challenge.email,
      purpose: challenge.purpose as OtpPurpose,
      payload: challenge.payload
    };
  }
}

export const otpService = new OtpService();
