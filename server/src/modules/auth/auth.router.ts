import { Router } from 'express';
import {
  loginController,
  verifyLoginOtpController,
  resendOtpController,
  verifyActivationTokenController,
  completeActivationController,
  forgotPasswordController,
  resetPasswordWithOtpController,
  logoutController,
  meController,
  googleAuthController,
  firebaseAuthController,
  changePasswordController
} from './auth.controller.js';
import { validateRequest } from '../../common/middleware/validateRequest.js';
import { loginSchema, googleAuthSchema, firebaseAuthSchema, changePasswordSchema } from './auth.schemas.js';
import { authenticate } from '../../common/middleware/auth.js';
import { createRateLimiter } from '../../common/middleware/rateLimiter.js';

export const authRouter = Router();

const loginRateLimiter = createRateLimiter({ maxRequests: 15, windowMs: 60 * 1000 });
const otpRateLimiter = createRateLimiter({ maxRequests: 10, windowMs: 60 * 1000 });

// Core Authentication
authRouter.post('/login', loginRateLimiter, validateRequest({ body: loginSchema }), loginController);
authRouter.post('/verify-login-otp', otpRateLimiter, verifyLoginOtpController);
authRouter.post('/resend-otp', otpRateLimiter, resendOtpController);

// Single-Use Account Activation & Password Setup
authRouter.get('/activate/verify', verifyActivationTokenController);
authRouter.post('/activate/complete', completeActivationController);

// Password Recovery
authRouter.post('/forgot-password', otpRateLimiter, forgotPasswordController);
authRouter.post('/reset-password', otpRateLimiter, resetPasswordWithOtpController);

// SSO & Firebase
authRouter.post('/firebase', loginRateLimiter, validateRequest({ body: firebaseAuthSchema }), firebaseAuthController);
authRouter.post('/google', loginRateLimiter, validateRequest({ body: googleAuthSchema }), googleAuthController);

// Authenticated session controls
authRouter.post('/change-password', authenticate, validateRequest({ body: changePasswordSchema }), changePasswordController);
authRouter.post('/logout', logoutController);
authRouter.get('/me', authenticate, meController);
