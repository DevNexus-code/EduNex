"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginController = loginController;
exports.verifyLoginOtpController = verifyLoginOtpController;
exports.resendOtpController = resendOtpController;
exports.verifyActivationTokenController = verifyActivationTokenController;
exports.completeActivationController = completeActivationController;
exports.forgotPasswordController = forgotPasswordController;
exports.resetPasswordWithOtpController = resetPasswordWithOtpController;
exports.changePasswordController = changePasswordController;
exports.logoutController = logoutController;
exports.meController = meController;
exports.googleAuthController = googleAuthController;
exports.firebaseAuthController = firebaseAuthController;
const auth_service_js_1 = require("./auth.service.js");
const activation_service_js_1 = require("../../common/services/activation.service.js");
const otp_service_js_1 = require("../../common/services/otp.service.js");
const index_js_1 = require("../../common/config/index.js");
const auth_js_1 = require("../../common/middleware/auth.js");
const prisma_js_1 = require("../../common/db/prisma.js");
const password_js_1 = require("../../common/utils/password.js");
const admin_js_1 = require("../../common/firebase/admin.js");
const store_js_1 = require("../../common/db/store.js");
async function loginController(req, res, next) {
    try {
        const { identifier, email, password, requireOtp } = req.body;
        const loginIdentifier = identifier || email;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const result = await auth_service_js_1.authService.login(loginIdentifier, password, ip, userAgent, Boolean(requireOtp));
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
            secure: index_js_1.config.COOKIE_SECURE,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });
        res.cookie('nexdesk_session', token, {
            httpOnly: true,
            secure: index_js_1.config.COOKIE_SECURE,
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
    }
    catch (error) {
        next(error);
    }
}
async function verifyLoginOtpController(req, res, next) {
    try {
        const { challengeId, otp } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        if (!challengeId || !otp) {
            res.status(400).json({ title: 'Bad Request', detail: 'Challenge ID and 6-digit OTP code are required.' });
            return;
        }
        const { token, user } = await auth_service_js_1.authService.verifyLoginOtp(challengeId, otp, ip, userAgent);
        res.cookie('edunex_session', token, {
            httpOnly: true,
            secure: index_js_1.config.COOKIE_SECURE,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });
        res.cookie('nexdesk_session', token, {
            httpOnly: true,
            secure: index_js_1.config.COOKIE_SECURE,
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
    }
    catch (error) {
        next(error);
    }
}
async function resendOtpController(req, res, next) {
    try {
        const { challengeId, email, purpose } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        let targetEmail = email;
        let targetUserId;
        if (challengeId) {
            const existing = await prisma_js_1.prisma.otpChallenge.findUnique({ where: { id: challengeId } });
            if (existing) {
                targetEmail = existing.email;
                targetUserId = existing.userId || undefined;
            }
        }
        if (!targetEmail) {
            res.status(400).json({ title: 'Bad Request', detail: 'Target email or valid challenge ID is required.' });
            return;
        }
        const challenge = await otp_service_js_1.otpService.createChallenge({
            email: targetEmail,
            userId: targetUserId,
            purpose: (purpose || 'LOGIN_VERIFICATION'),
            ipAddress: ip,
            userAgent
        });
        res.status(200).json({
            success: true,
            data: challenge
        });
    }
    catch (error) {
        next(error);
    }
}
async function verifyActivationTokenController(req, res, next) {
    try {
        const token = String(req.query.token || '').trim();
        const result = await activation_service_js_1.activationService.verifyActivationToken(token);
        if (!result.valid) {
            res.status(400).json({ title: 'Invalid Token', detail: result.error });
            return;
        }
        res.status(200).json({
            success: true,
            data: result.user
        });
    }
    catch (error) {
        next(error);
    }
}
async function completeActivationController(req, res, next) {
    try {
        const { token, newPassword } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        if (!token || !newPassword) {
            res.status(400).json({ title: 'Bad Request', detail: 'Token and new password are required.' });
            return;
        }
        const result = await activation_service_js_1.activationService.completeActivation(token, newPassword, ip, userAgent);
        res.status(200).json({
            success: true,
            message: 'Account successfully activated and password configured. Please log in.',
            data: result
        });
    }
    catch (error) {
        next(error);
    }
}
async function forgotPasswordController(req, res, next) {
    try {
        const { email, identifier } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const target = identifier || email;
        const result = await auth_service_js_1.authService.requestPasswordReset(target, ip, userAgent);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
}
async function resetPasswordWithOtpController(req, res, next) {
    try {
        const { email, otp, newPassword, token } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        if (token) {
            const result = await activation_service_js_1.activationService.completeActivation(token, newPassword, ip, userAgent);
            res.status(200).json({ success: true, message: 'Password reset successfully.', data: result });
            return;
        }
        if (!email || !otp || !newPassword) {
            res.status(400).json({ title: 'Bad Request', detail: 'Email, OTP, and new password are required.' });
            return;
        }
        const verification = await otp_service_js_1.otpService.verifyChallenge({
            email,
            otp,
            purpose: 'PASSWORD_RESET',
            ipAddress: ip,
            userAgent
        });
        const user = await prisma_js_1.prisma.user.findFirst({
            where: { email: verification.email }
        });
        if (!user) {
            res.status(404).json({ title: 'Not Found', detail: 'Account not found.' });
            return;
        }
        const newHash = await (0, password_js_1.hashPassword)(newPassword);
        const updated = await prisma_js_1.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: newHash,
                mustChangePassword: false,
                updatedAt: new Date()
            }
        });
        if (updated.firebaseUid) {
            try {
                await admin_js_1.firebaseAdmin.updateUser(updated.firebaseUid, { password: newPassword });
            }
            catch {
                // deferred
            }
        }
        store_js_1.store.refreshUser(updated);
        store_js_1.store.logAction('PASSWORD_RESET_COMPLETED', 'User', updated.id, updated.id, { email: updated.email }, ip, userAgent);
        res.status(200).json({ success: true, message: 'Password reset successfully. Please sign in.' });
    }
    catch (error) {
        next(error);
    }
}
async function changePasswordController(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized session.' });
            return;
        }
        const { currentPassword, newPassword } = req.body;
        const result = await auth_service_js_1.authService.changePassword(userId, currentPassword, newPassword);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
}
function logoutController(req, res, next) {
    try {
        const token = (0, auth_js_1.extractSessionToken)(req);
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        if (token) {
            auth_service_js_1.authService.logout(token, req.user?.id, ip, userAgent);
        }
        res.clearCookie('edunex_session', {
            httpOnly: true,
            secure: index_js_1.config.COOKIE_SECURE,
            sameSite: 'lax'
        });
        res.clearCookie('nexdesk_session', {
            httpOnly: true,
            secure: index_js_1.config.COOKIE_SECURE,
            sameSite: 'lax'
        });
        res.status(200).json({
            success: true,
            message: 'Logged out successfully.'
        });
    }
    catch (error) {
        next(error);
    }
}
async function meController(req, res, next) {
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
        const profile = await auth_service_js_1.authService.getMe(req.user.id);
        res.status(200).json({
            success: true,
            data: {
                user: profile
            }
        });
    }
    catch (error) {
        next(error);
    }
}
async function googleAuthController(req, res, next) {
    try {
        const { googleId, email, firstName, lastName, avatarUrl } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const { token, user, isNew } = await auth_service_js_1.authService.loginWithGoogle({ googleId, email, firstName, lastName, avatarUrl }, ip, userAgent);
        res.cookie('edunex_session', token, {
            httpOnly: true,
            secure: index_js_1.config.COOKIE_SECURE,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });
        res.cookie('nexdesk_session', token, {
            httpOnly: true,
            secure: index_js_1.config.COOKIE_SECURE,
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
    }
    catch (error) {
        next(error);
    }
}
async function firebaseAuthController(req, res, next) {
    try {
        const { idToken } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const { token, user } = await auth_service_js_1.authService.loginWithFirebase(idToken, ip, userAgent);
        res.cookie('edunex_session', token, {
            httpOnly: true,
            secure: index_js_1.config.COOKIE_SECURE,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });
        res.cookie('nexdesk_session', token, {
            httpOnly: true,
            secure: index_js_1.config.COOKIE_SECURE,
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
    }
    catch (error) {
        next(error);
    }
}
