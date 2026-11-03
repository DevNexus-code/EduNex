"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpService = void 0;
const crypto_1 = require("crypto");
const prisma_js_1 = require("../db/prisma.js");
const index_js_1 = require("../config/index.js");
const email_service_js_1 = require("../email/email.service.js");
const logger_js_1 = require("../utils/logger.js");
const store_js_1 = require("../db/store.js");
class OtpService {
    hashOtp(otp) {
        return (0, crypto_1.createHmac)('sha256', index_js_1.config.SESSION_SECRET)
            .update(otp.trim())
            .digest('hex');
    }
    maskEmail(email) {
        const parts = email.trim().toLowerCase().split('@');
        if (parts.length !== 2)
            return email;
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
    async createChallenge(params) {
        const normalizedEmail = params.email.trim().toLowerCase();
        // 1. Check existing active challenge to enforce 60-second resend cooldown
        const activeChallenge = await prisma_js_1.prisma.otpChallenge.findFirst({
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
        await prisma_js_1.prisma.otpChallenge.updateMany({
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
        const rawOtp = (0, crypto_1.randomInt)(100000, 999999).toString();
        const otpHash = this.hashOtp(rawOtp);
        const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes validity
        const resendAfter = new Date(now.getTime() + 60 * 1000); // 60 seconds cooldown
        const challengeId = (0, crypto_1.randomUUID)();
        // 4. Record challenge in database (never plain text OTP)
        await prisma_js_1.prisma.otpChallenge.create({
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
        store_js_1.store.logAction('OTP_REQUESTED', 'User', params.userId || normalizedEmail, params.userId, { purpose: params.purpose, challengeId }, params.ipAddress, params.userAgent);
        // 6. Send OTP to registered email
        const emailResult = await email_service_js_1.emailService.sendOtpEmail({
            to: normalizedEmail,
            userId: params.userId,
            name: params.userName,
            otp: rawOtp,
            purpose: params.purpose,
            expiresMinutes: 5
        });
        if (!emailResult.success) {
            logger_js_1.logger.warn({ recipient: normalizedEmail, purpose: params.purpose }, 'Failed to deliver OTP email.');
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
    async verifyChallenge(params) {
        const rawOtp = (params.otp || '').trim();
        if (!/^\d{6}$/.test(rawOtp)) {
            throw new Error('Verification code must be exactly 6 numeric digits.');
        }
        const now = new Date();
        let challenge = null;
        if (params.challengeId) {
            challenge = await prisma_js_1.prisma.otpChallenge.findUnique({
                where: { id: params.challengeId }
            });
        }
        else if (params.email) {
            challenge = await prisma_js_1.prisma.otpChallenge.findFirst({
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
            await prisma_js_1.prisma.otpChallenge.update({
                where: { id: challenge.id },
                data: { isConsumed: true, consumedAt: now }
            });
            throw new Error('Verification code has expired. Please request a new code.');
        }
        // Check brute-force attempts limit
        if (challenge.attempts >= challenge.maxAttempts) {
            await prisma_js_1.prisma.otpChallenge.update({
                where: { id: challenge.id },
                data: { isConsumed: true, consumedAt: now }
            });
            throw new Error('Maximum verification attempts exceeded. Code has been invalidated for security.');
        }
        // Timing-safe constant-time hash comparison
        const incomingHash = this.hashOtp(rawOtp);
        const storedBuf = Buffer.from(challenge.otpHash, 'hex');
        const incomingBuf = Buffer.from(incomingHash, 'hex');
        const isMatch = storedBuf.length === incomingBuf.length && (0, crypto_1.timingSafeEqual)(storedBuf, incomingBuf);
        if (!isMatch) {
            const nextAttempts = challenge.attempts + 1;
            const remainingAttempts = challenge.maxAttempts - nextAttempts;
            await prisma_js_1.prisma.otpChallenge.update({
                where: { id: challenge.id },
                data: {
                    attempts: nextAttempts,
                    ...(remainingAttempts <= 0 && { isConsumed: true, consumedAt: now })
                }
            });
            store_js_1.store.logAction('OTP_VERIFICATION_FAILED', 'User', challenge.userId || challenge.email, challenge.userId, { purpose: params.purpose, remainingAttempts: Math.max(0, remainingAttempts) }, params.ipAddress, params.userAgent);
            if (remainingAttempts <= 0) {
                throw new Error('Incorrect verification code. Maximum attempts exceeded. Code invalidated.');
            }
            throw new Error(`Incorrect verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`);
        }
        // Verification Succeeded: Mark consumed
        await prisma_js_1.prisma.otpChallenge.update({
            where: { id: challenge.id },
            data: {
                isConsumed: true,
                consumedAt: now
            }
        });
        store_js_1.store.logAction('OTP_VERIFIED', 'User', challenge.userId || challenge.email, challenge.userId, { purpose: params.purpose }, params.ipAddress, params.userAgent);
        return {
            verified: true,
            userId: challenge.userId || undefined,
            email: challenge.email,
            purpose: challenge.purpose,
            payload: challenge.payload
        };
    }
}
exports.otpService = new OtpService();
