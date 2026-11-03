import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { activationService } from '../../common/services/activation.service.js';
import { otpService, OtpPurpose } from '../../common/services/otp.service.js';
import { config } from '../../common/config/index.js';
import { extractSessionToken } from '../../common/middleware/auth.js';
import { prisma } from '../../common/db/prisma.js';
import { hashPassword } from '../../common/utils/password.js';
import { firebaseAdmin } from '../../common/firebase/admin.js';
import { store } from '../../common/db/store.js';

export async function loginController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { identifier, email, password, requireOtp } = req.body;
    const loginIdentifier = identifier || email;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(loginIdentifier, password, ip, userAgent, Boolean(requireOtp));

    if (result.requiresOtp) {
      res.status(200).json({
        success: true,
        requiresOtp: true,
        data: {
          requiresOtp: true,
          challengeId: result.challengeId,
          recipientMasked: result.recipientMasked,
          expiresInSeconds: result.expiresInSeconds,
          resendAvailableInSeconds: result.resendAvailableInSeconds,
          userId: result.userId
        }
      });
      return;
    }

    const { token, user } = result;

    res.cookie('edunex_session', token, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.cookie('nexdesk_session', token, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      requiresOtp: false,
      data: {
        requiresOtp: false,
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyLoginOtpController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { challengeId, otp } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!challengeId || !otp) {
      res.status(400).json({ title: 'Bad Request', detail: 'Challenge ID and 6-digit OTP code are required.' });
      return;
    }

    const { token, user } = await authService.verifyLoginOtp(challengeId, otp, ip, userAgent);

    res.cookie('edunex_session', token, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.cookie('nexdesk_session', token, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function resendOtpController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { challengeId, email, purpose } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    let targetEmail = email;
    let targetUserId: string | undefined;

    if (challengeId) {
      const existing = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });
      if (existing) {
        targetEmail = existing.email;
        targetUserId = existing.userId || undefined;
      }
    }

    if (!targetEmail) {
      res.status(400).json({ title: 'Bad Request', detail: 'Target email or valid challenge ID is required.' });
      return;
    }

    const challenge = await otpService.createChallenge({
      email: targetEmail,
      userId: targetUserId,
      purpose: (purpose || 'LOGIN_VERIFICATION') as OtpPurpose,
      ipAddress: ip,
      userAgent
    });

    res.status(200).json({
      success: true,
      data: challenge
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyActivationTokenController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = String(req.query.token || '').trim();
    const result = await activationService.verifyActivationToken(token);
    if (!result.valid) {
      res.status(400).json({ title: 'Invalid Token', detail: result.error });
      return;
    }
    res.status(200).json({
      success: true,
      data: result.user
    });
  } catch (error) {
    next(error);
  }
}

export async function completeActivationController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, newPassword } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!token || !newPassword) {
      res.status(400).json({ title: 'Bad Request', detail: 'Token and new password are required.' });
      return;
    }

    const result = await activationService.completeActivation(token, newPassword, ip, userAgent);
    res.status(200).json({
      success: true,
      message: 'Account successfully activated and password configured. Please log in.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPasswordController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, identifier } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const target = identifier || email;
    const result = await authService.requestPasswordReset(target, ip, userAgent);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function resetPasswordWithOtpController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, otp, newPassword, token } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (token) {
      const result = await activationService.completeActivation(token, newPassword, ip, userAgent);
      res.status(200).json({ success: true, message: 'Password reset successfully.', data: result });
      return;
    }

    if (!email || !otp || !newPassword) {
      res.status(400).json({ title: 'Bad Request', detail: 'Email, OTP, and new password are required.' });
      return;
    }

    const verification = await otpService.verifyChallenge({
      email,
      otp,
      purpose: 'PASSWORD_RESET',
      ipAddress: ip,
      userAgent
    });

    const user = await prisma.user.findFirst({
      where: { email: verification.email }
    });

    if (!user) {
      res.status(404).json({ title: 'Not Found', detail: 'Account not found.' });
      return;
    }

    const newHash = await hashPassword(newPassword);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        updatedAt: new Date()
      }
    });

    if (updated.firebaseUid) {
      try {
        await firebaseAdmin.updateUser(updated.firebaseUid, { password: newPassword });
      } catch {
        // deferred
      }
    }

    store.refreshUser(updated);
    store.logAction('PASSWORD_RESET_COMPLETED', 'User', updated.id, updated.id, { email: updated.email }, ip, userAgent);

    res.status(200).json({ success: true, message: 'Password reset successfully. Please sign in.' });
  } catch (error) {
    next(error);
  }
}

export async function changePasswordController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized session.' });
      return;
    }
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export function logoutController(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractSessionToken(req);
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (token) {
      authService.logout(token, req.user?.id, ip, userAgent);
    }

    res.clearCookie('edunex_session', {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax'
    });
    res.clearCookie('nexdesk_session', {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    next(error);
  }
}

export async function meController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        type: 'https://api.edunex.internal/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required.'
      });
      return;
    }

    const profile = await authService.getMe(req.user.id);
    res.status(200).json({
      success: true,
      data: {
        user: profile
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function googleAuthController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { googleId, email, firstName, lastName, avatarUrl } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const { token, user, isNew } = await authService.loginWithGoogle(
      { googleId, email, firstName, lastName, avatarUrl },
      ip,
      userAgent
    );

    res.cookie('edunex_session', token, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.cookie('nexdesk_session', token, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        token,
        isNew
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function firebaseAuthController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { idToken } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const { token, user } = await authService.loginWithFirebase(idToken, ip, userAgent);

    res.cookie('edunex_session', token, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.cookie('nexdesk_session', token, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
}
