"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_controller_js_1 = require("./auth.controller.js");
const validateRequest_js_1 = require("../../common/middleware/validateRequest.js");
const auth_schemas_js_1 = require("./auth.schemas.js");
const auth_js_1 = require("../../common/middleware/auth.js");
const rateLimiter_js_1 = require("../../common/middleware/rateLimiter.js");
exports.authRouter = (0, express_1.Router)();
const loginRateLimiter = (0, rateLimiter_js_1.createRateLimiter)({ maxRequests: 15, windowMs: 60 * 1000 });
const otpRateLimiter = (0, rateLimiter_js_1.createRateLimiter)({ maxRequests: 10, windowMs: 60 * 1000 });
// Core Authentication
exports.authRouter.post('/login', loginRateLimiter, (0, validateRequest_js_1.validateRequest)({ body: auth_schemas_js_1.loginSchema }), auth_controller_js_1.loginController);
exports.authRouter.post('/verify-login-otp', otpRateLimiter, auth_controller_js_1.verifyLoginOtpController);
exports.authRouter.post('/resend-otp', otpRateLimiter, auth_controller_js_1.resendOtpController);
// Single-Use Account Activation & Password Setup
exports.authRouter.get('/activate/verify', auth_controller_js_1.verifyActivationTokenController);
exports.authRouter.post('/activate/complete', auth_controller_js_1.completeActivationController);
// Password Recovery
exports.authRouter.post('/forgot-password', otpRateLimiter, auth_controller_js_1.forgotPasswordController);
exports.authRouter.post('/reset-password', otpRateLimiter, auth_controller_js_1.resetPasswordWithOtpController);
// SSO & Firebase
exports.authRouter.post('/firebase', loginRateLimiter, (0, validateRequest_js_1.validateRequest)({ body: auth_schemas_js_1.firebaseAuthSchema }), auth_controller_js_1.firebaseAuthController);
exports.authRouter.post('/google', loginRateLimiter, (0, validateRequest_js_1.validateRequest)({ body: auth_schemas_js_1.googleAuthSchema }), auth_controller_js_1.googleAuthController);
// Authenticated session controls
exports.authRouter.post('/change-password', auth_js_1.authenticate, (0, validateRequest_js_1.validateRequest)({ body: auth_schemas_js_1.changePasswordSchema }), auth_controller_js_1.changePasswordController);
exports.authRouter.post('/logout', auth_controller_js_1.logoutController);
exports.authRouter.get('/me', auth_js_1.authenticate, auth_controller_js_1.meController);
