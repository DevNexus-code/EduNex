import { randomBytes, createHash, randomUUID } from 'crypto';
import { prisma } from '../db/prisma.js';
import { hashPassword } from '../utils/password.js';
import { firebaseAdmin } from '../firebase/admin.js';
import { store } from '../db/store.js';
import { logger } from '../utils/logger.js';

class ActivationService {
  private hashToken(token: string): string {
    return createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Generates a secure single-use activation token for account credential setup
   */
  async createActivationToken(userId: string, email: string, expiresHours = 72): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000);

    // Invalidate prior unused tokens for this user
    await prisma.accountActivationToken.updateMany({
      where: { userId, isConsumed: false },
      data: { isConsumed: true, consumedAt: new Date() }
    });

    await prisma.accountActivationToken.create({
      data: {
        id: randomUUID(),
        userId,
        email: email.trim().toLowerCase(),
        tokenHash,
        expiresAt,
        isConsumed: false,
        createdAt: new Date()
      }
    });

    return rawToken;
  }

  /**
   * Verifies an activation token without consuming it (for pre-validating the setup page)
   */
  async verifyActivationToken(rawToken: string): Promise<{
    valid: boolean;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      loginId?: string;
    };
    error?: string;
  }> {
    if (!rawToken || rawToken.trim().length < 16) {
      return { valid: false, error: 'Invalid activation token.' };
    }

    const tokenHash = this.hashToken(rawToken);
    const record = await prisma.accountActivationToken.findUnique({
      where: { tokenHash },
      include: { User: true }
    });

    if (!record || !record.User) {
      return { valid: false, error: 'Activation token not found or invalid.' };
    }

    if (record.isConsumed) {
      return { valid: false, error: 'This activation token has already been used. Please log in.' };
    }

    if (record.expiresAt < new Date()) {
      return { valid: false, error: 'This activation token has expired. Please request a new link.' };
    }

    const u = record.User;
    const loginId = u.studentId || u.staffId || u.parentId || u.email;

    return {
      valid: true,
      user: {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        loginId
      }
    };
  }

  /**
   * Consumes token, establishes permanent password in Supabase & Firebase Auth, activates user
   */
  async completeActivation(
    rawToken: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    userId: string;
    email: string;
    loginId?: string;
  }> {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const check = await this.verifyActivationToken(rawToken);
    if (!check.valid || !check.user) {
      throw new Error(check.error || 'Activation token is invalid or expired.');
    }

    const tokenHash = this.hashToken(rawToken);
    const passwordHash = await hashPassword(newPassword);

    // 1. Update user record in Supabase
    const updatedUser = await prisma.user.update({
      where: { id: check.user.id },
      data: {
        passwordHash,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        mustChangePassword: false,
        isActive: true,
        updatedAt: new Date()
      }
    });

    // 2. Consume the token
    await prisma.accountActivationToken.update({
      where: { tokenHash },
      data: {
        isConsumed: true,
        consumedAt: new Date()
      }
    });

    // 3. Sync or create Firebase Auth credential
    try {
      if (updatedUser.firebaseUid) {
        await firebaseAdmin.updateUser(updatedUser.firebaseUid, {
          password: newPassword,
          displayName: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
          disabled: false
        });
      } else {
        const fbUser = await firebaseAdmin.createUser({
          email: updatedUser.email,
          password: newPassword,
          displayName: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
          disabled: false
        });
        await prisma.user.update({
          where: { id: updatedUser.id },
          data: { firebaseUid: fbUser.uid }
        });
      }
    } catch (fbErr: any) {
      logger.warn({ err: fbErr.message }, 'Firebase Auth sync during activation deferred.');
    }

    // 4. Refresh store & audit log
    store.refreshUser(updatedUser);
    store.logAction(
      'ACCOUNT_ACTIVATED',
      'User',
      updatedUser.id,
      updatedUser.id,
      { role: updatedUser.role, email: updatedUser.email },
      ipAddress,
      userAgent
    );

    return {
      success: true,
      userId: updatedUser.id,
      email: updatedUser.email,
      loginId: check.user.loginId
    };
  }
}

export const activationService = new ActivationService();
