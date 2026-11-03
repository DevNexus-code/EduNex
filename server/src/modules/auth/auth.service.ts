import { randomBytes } from 'crypto';
import { UnauthorizedError } from '../../common/errors/index.js';
import { store, UserRecord } from '../../common/db/store.js';
import { prisma } from '../../common/db/prisma.js';
import { verifyPassword, hashPassword } from '../../common/utils/password.js';
import { firebaseAdmin } from '../../common/firebase/admin.js';
import { otpService } from '../../common/services/otp.service.js';
import { activationService } from '../../common/services/activation.service.js';
import { emailService } from '../../common/email/email.service.js';
import { config } from '../../common/config/index.js';

export type LoginResult =
  | { requiresOtp: false; token: string; user: Omit<UserRecord, 'passwordHash'> }
  | {
      requiresOtp: true;
      challengeId: string;
      recipientMasked: string;
      expiresInSeconds: number;
      resendAvailableInSeconds: number;
      userId: string;
      email: string;
    };

export class AuthService {
  async login(
    identifier: string,
    plainPassword: string,
    ipAddress?: string,
    userAgent?: string,
    enforceOtp?: boolean
  ): Promise<LoginResult> {
    let user = await store.fetchAndCacheUserByIdentifier(identifier);
    if (!user) {
      user = store.findUserByEmail(identifier);
    }

    if (!user || !user.isActive) {
      store.logAction('USER_LOGIN_FAILURE', 'User', identifier, undefined, { reason: 'User not found or inactive' }, ipAddress, userAgent);
      throw new UnauthorizedError('Invalid credentials or unprovisioned account.');
    }

    if (!user.passwordHash) {
      store.logAction('USER_LOGIN_FAILURE', 'User', user.id, user.id, { reason: 'Account configured for SSO / Firebase' }, ipAddress, userAgent);
      throw new UnauthorizedError('Please sign in using your corporate Google credentials.');
    }

    // Verify Argon2 hash
    const isValid = await verifyPassword(user.passwordHash, plainPassword);

    if (!isValid) {
      store.logAction('USER_LOGIN_FAILURE', 'User', user.id, user.id, { reason: 'Invalid credentials' }, ipAddress, userAgent);
      throw new UnauthorizedError('Invalid credentials or unprovisioned account.');
    }

    // Determine whether Email OTP verification is required
    const hasExternalEmail = user.email && !user.email.endsWith('@internal.edunex.local');
    const isUnverified = (user as any).isEmailVerified === false;
    const is2faActive = (user as any).isTwoFactorEnabled === true;
    const isPrivilegedAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'PRINCIPAL';

    const shouldTriggerOtp =
      hasExternalEmail &&
      (enforceOtp || is2faActive || (isUnverified && isPrivilegedAdmin && process.env.NODE_ENV !== 'test'));

    if (shouldTriggerOtp) {
      const challenge = await otpService.createChallenge({
        email: user.email,
        userId: user.id,
        purpose: 'LOGIN_VERIFICATION',
        userName: user.firstName,
        ipAddress,
        userAgent
      });

      return {
        requiresOtp: true,
        challengeId: challenge.challengeId,
        recipientMasked: challenge.recipientMasked,
        expiresInSeconds: challenge.expiresInSeconds,
        resendAvailableInSeconds: challenge.resendAvailableInSeconds,
        userId: user.id,
        email: user.email
      };
    }

    // Generate cryptographically secure random session token
    const token = randomBytes(32).toString('hex');
    store.createSession(user.id, token, ipAddress, userAgent);

    store.logAction('USER_LOGIN_SUCCESS', 'User', user.id, user.id, { role: user.role }, ipAddress, userAgent);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return { requiresOtp: false, token, user: safeUser };
  }

  async verifyLoginOtp(
    challengeId: string,
    otp: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; user: Omit<UserRecord, 'passwordHash'> }> {
    const verification = await otpService.verifyChallenge({
      challengeId,
      otp,
      purpose: 'LOGIN_VERIFICATION',
      ipAddress,
      userAgent
    });

    if (!verification.userId) {
      throw new UnauthorizedError('Invalid verification challenge session.');
    }

    let user = store.findUserById(verification.userId);
    if (!user) {
      user = await store.fetchAndCacheUserById(verification.userId);
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Account is inactive or not found.');
    }

    // Mark email verified
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date()
      }
    });
    store.refreshUser(updated);

    const token = randomBytes(32).toString('hex');
    store.createSession(user.id, token, ipAddress, userAgent);

    store.logAction(
      'USER_LOGIN_SUCCESS',
      'User',
      user.id,
      user.id,
      { role: user.role, method: 'PASSWORD_PLUS_EMAIL_OTP' },
      ipAddress,
      userAgent
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return { token, user: safeUser };
  }

  async requestPasswordReset(
    identifier: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ message: string }> {
    const genericResponse = {
      message: 'If an account associated with this email or Login ID exists, password reset instructions have been dispatched.'
    };

    if (!identifier || !identifier.trim()) {
      return genericResponse;
    }

    let user = await store.fetchAndCacheUserByIdentifier(identifier.trim());
    if (!user) {
      user = store.findUserByEmail(identifier.trim());
    }

    if (!user || !user.isActive) {
      return genericResponse;
    }

    if (user.email && !user.email.endsWith('@internal.edunex.local')) {
      const resetToken = await activationService.createActivationToken(user.id, user.email, 24);
      const resetUrl = `${config.APP_URL}/auth/activate?token=${encodeURIComponent(resetToken)}&id=${encodeURIComponent(
        user.studentId || user.staffId || user.parentId || user.email
      )}`;

      await emailService.sendPasswordResetEmail({
        to: user.email,
        userId: user.id,
        name: user.firstName,
        resetUrl,
        expiresHours: 24
      });

      store.logAction('PASSWORD_RESET_REQUESTED', 'User', user.id, user.id, { email: user.email }, ipAddress, userAgent);
    }

    return genericResponse;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User session is invalid.');
    }

    if (user.passwordHash) {
      const isValid = await verifyPassword(user.passwordHash, currentPassword);
      if (!isValid) {
        throw new UnauthorizedError('Current password verification failed.');
      }
    }

    const newHash = await hashPassword(newPassword);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        updatedAt: new Date()
      }
    });

    if (updated.firebaseUid) {
      try {
        await firebaseAdmin.updateUser(updated.firebaseUid, { password: newPassword });
      } catch (fbErr: any) {
        // Log deferred update
      }
    }

    store.refreshUser(updated);
    return { success: true, message: 'Password updated successfully.' };
  }

  async loginWithFirebase(
    idToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; user: Omit<UserRecord, 'passwordHash'> }> {
    if (!idToken) {
      throw new UnauthorizedError('Missing Firebase identity token.');
    }

    const decoded = await firebaseAdmin.verifyIdToken(idToken);
    if (!decoded || (!decoded.uid && !decoded.email)) {
      throw new UnauthorizedError('Invalid or expired Firebase authentication token.');
    }

    const email = decoded.email || '';
    if (!email) {
      throw new UnauthorizedError('Firebase token does not contain a verified corporate email.');
    }

    let user: UserRecord;
    try {
      user = await store.syncFirebaseUser({
        firebaseUid: decoded.uid,
        email,
        avatarUrl: decoded.picture || null
      });
    } catch (err: any) {
      store.logAction(
        'USER_LOGIN_FAILURE',
        'User',
        email,
        undefined,
        { reason: err.message, provider: 'firebase' },
        ipAddress,
        userAgent
      );
      throw new UnauthorizedError(err.message || 'Your account is not registered with EDUNEX. Please contact your administrator.');
    }

    const token = randomBytes(32).toString('hex');
    store.createSession(user.id, token, ipAddress, userAgent);

    store.logAction(
      'USER_LOGIN_SUCCESS',
      'User',
      user.id,
      user.id,
      { provider: 'firebase', role: user.role },
      ipAddress,
      userAgent
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return { token, user: safeUser };
  }

  async loginWithGoogle(
    payload: {
      googleId: string;
      email: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string | null;
    },
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; user: Omit<UserRecord, 'passwordHash'>; isNew: boolean }> {
    if (!payload.email || !payload.googleId) {
      throw new UnauthorizedError('Missing Google authentication identity or email.');
    }

    let user: UserRecord;
    let isNew = false;
    try {
      const res = await store.upsertGoogleUser({
        googleId: payload.googleId,
        email: payload.email,
        firstName: payload.firstName || payload.email.split('@')[0] || 'User',
        lastName: payload.lastName || '',
        avatarUrl: payload.avatarUrl || null
      });
      user = res.user;
      isNew = res.isNew;
    } catch (err: any) {
      store.logAction(
        'USER_LOGIN_FAILURE',
        'User',
        payload.email,
        undefined,
        { reason: err.message, provider: 'google' },
        ipAddress,
        userAgent
      );
      throw new UnauthorizedError(err.message || 'Your account is not registered with EDUNEX. Please contact your administrator.');
    }

    const action = isNew ? 'USER_REGISTER_OAUTH' : 'USER_LOGIN_SUCCESS';
    store.logAction(
      action,
      'User',
      user.id,
      user.id,
      { provider: 'google', role: user.role, isNew },
      ipAddress,
      userAgent
    );

    const token = randomBytes(32).toString('hex');
    store.createSession(user.id, token, ipAddress, userAgent);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return { token, user: safeUser, isNew };
  }

  logout(token: string, userId?: string, ipAddress?: string, userAgent?: string): void {
    store.deleteSession(token);
    if (userId) {
      store.logAction('USER_LOGOUT', 'User', userId, userId, undefined, ipAddress, userAgent);
    }
  }

  async getMe(userId: string): Promise<Omit<UserRecord, 'passwordHash'>> {
    let user = store.findUserById(userId);
    if (!user) {
      user = await store.fetchAndCacheUserById(userId);
    }
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User session is no longer active.');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}

export const authService = new AuthService();
