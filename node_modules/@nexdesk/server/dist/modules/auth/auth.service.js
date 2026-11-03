"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const crypto_1 = require("crypto");
const index_js_1 = require("../../common/errors/index.js");
const store_js_1 = require("../../common/db/store.js");
const prisma_js_1 = require("../../common/db/prisma.js");
const password_js_1 = require("../../common/utils/password.js");
const admin_js_1 = require("../../common/firebase/admin.js");
const otp_service_js_1 = require("../../common/services/otp.service.js");
const activation_service_js_1 = require("../../common/services/activation.service.js");
const email_service_js_1 = require("../../common/email/email.service.js");
const index_js_2 = require("../../common/config/index.js");
class AuthService {
    async login(identifier, plainPassword, ipAddress, userAgent, enforceOtp) {
        let user = await store_js_1.store.fetchAndCacheUserByIdentifier(identifier);
        if (!user) {
            user = store_js_1.store.findUserByEmail(identifier);
        }
        if (!user || !user.isActive) {
            store_js_1.store.logAction('USER_LOGIN_FAILURE', 'User', identifier, undefined, { reason: 'User not found or inactive' }, ipAddress, userAgent);
            throw new index_js_1.UnauthorizedError('Invalid credentials or unprovisioned account.');
        }
        if (!user.passwordHash) {
            store_js_1.store.logAction('USER_LOGIN_FAILURE', 'User', user.id, user.id, { reason: 'Account configured for SSO / Firebase' }, ipAddress, userAgent);
            throw new index_js_1.UnauthorizedError('Please sign in using your corporate Google credentials.');
        }
        // Verify Argon2 hash
        const isValid = await (0, password_js_1.verifyPassword)(user.passwordHash, plainPassword);
        if (!isValid) {
            store_js_1.store.logAction('USER_LOGIN_FAILURE', 'User', user.id, user.id, { reason: 'Invalid credentials' }, ipAddress, userAgent);
            throw new index_js_1.UnauthorizedError('Invalid credentials or unprovisioned account.');
        }
        // Determine whether Email OTP verification is required
        const hasExternalEmail = user.email && !user.email.endsWith('@internal.edunex.local');
        const isUnverified = user.isEmailVerified === false;
        const is2faActive = user.isTwoFactorEnabled === true;
        const isPrivilegedAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'PRINCIPAL';
        const shouldTriggerOtp = hasExternalEmail &&
            (enforceOtp || is2faActive || (isUnverified && isPrivilegedAdmin && process.env.NODE_ENV !== 'test'));
        if (shouldTriggerOtp) {
            const challenge = await otp_service_js_1.otpService.createChallenge({
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
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        store_js_1.store.createSession(user.id, token, ipAddress, userAgent);
        store_js_1.store.logAction('USER_LOGIN_SUCCESS', 'User', user.id, user.id, { role: user.role }, ipAddress, userAgent);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...safeUser } = user;
        return { requiresOtp: false, token, user: safeUser };
    }
    async verifyLoginOtp(challengeId, otp, ipAddress, userAgent) {
        const verification = await otp_service_js_1.otpService.verifyChallenge({
            challengeId,
            otp,
            purpose: 'LOGIN_VERIFICATION',
            ipAddress,
            userAgent
        });
        if (!verification.userId) {
            throw new index_js_1.UnauthorizedError('Invalid verification challenge session.');
        }
        let user = store_js_1.store.findUserById(verification.userId);
        if (!user) {
            user = await store_js_1.store.fetchAndCacheUserById(verification.userId);
        }
        if (!user || !user.isActive) {
            throw new index_js_1.UnauthorizedError('Account is inactive or not found.');
        }
        // Mark email verified
        const updated = await prisma_js_1.prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                emailVerifiedAt: new Date()
            }
        });
        store_js_1.store.refreshUser(updated);
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        store_js_1.store.createSession(user.id, token, ipAddress, userAgent);
        store_js_1.store.logAction('USER_LOGIN_SUCCESS', 'User', user.id, user.id, { role: user.role, method: 'PASSWORD_PLUS_EMAIL_OTP' }, ipAddress, userAgent);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...safeUser } = user;
        return { token, user: safeUser };
    }
    async requestPasswordReset(identifier, ipAddress, userAgent) {
        const genericResponse = {
            message: 'If an account associated with this email or Login ID exists, password reset instructions have been dispatched.'
        };
        if (!identifier || !identifier.trim()) {
            return genericResponse;
        }
        let user = await store_js_1.store.fetchAndCacheUserByIdentifier(identifier.trim());
        if (!user) {
            user = store_js_1.store.findUserByEmail(identifier.trim());
        }
        if (!user || !user.isActive) {
            return genericResponse;
        }
        if (user.email && !user.email.endsWith('@internal.edunex.local')) {
            const resetToken = await activation_service_js_1.activationService.createActivationToken(user.id, user.email, 24);
            const resetUrl = `${index_js_2.config.APP_URL}/auth/activate?token=${encodeURIComponent(resetToken)}&id=${encodeURIComponent(user.studentId || user.staffId || user.parentId || user.email)}`;
            await email_service_js_1.emailService.sendPasswordResetEmail({
                to: user.email,
                userId: user.id,
                name: user.firstName,
                resetUrl,
                expiresHours: 24
            });
            store_js_1.store.logAction('PASSWORD_RESET_REQUESTED', 'User', user.id, user.id, { email: user.email }, ipAddress, userAgent);
        }
        return genericResponse;
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await prisma_js_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.isActive) {
            throw new index_js_1.UnauthorizedError('User session is invalid.');
        }
        if (user.passwordHash) {
            const isValid = await (0, password_js_1.verifyPassword)(user.passwordHash, currentPassword);
            if (!isValid) {
                throw new index_js_1.UnauthorizedError('Current password verification failed.');
            }
        }
        const newHash = await (0, password_js_1.hashPassword)(newPassword);
        const updated = await prisma_js_1.prisma.user.update({
            where: { id: userId },
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
            catch (fbErr) {
                // Log deferred update
            }
        }
        store_js_1.store.refreshUser(updated);
        return { success: true, message: 'Password updated successfully.' };
    }
    async loginWithFirebase(idToken, ipAddress, userAgent) {
        if (!idToken) {
            throw new index_js_1.UnauthorizedError('Missing Firebase identity token.');
        }
        const decoded = await admin_js_1.firebaseAdmin.verifyIdToken(idToken);
        if (!decoded || (!decoded.uid && !decoded.email)) {
            throw new index_js_1.UnauthorizedError('Invalid or expired Firebase authentication token.');
        }
        const email = decoded.email || '';
        if (!email) {
            throw new index_js_1.UnauthorizedError('Firebase token does not contain a verified corporate email.');
        }
        let user;
        try {
            user = await store_js_1.store.syncFirebaseUser({
                firebaseUid: decoded.uid,
                email,
                avatarUrl: decoded.picture || null
            });
        }
        catch (err) {
            store_js_1.store.logAction('USER_LOGIN_FAILURE', 'User', email, undefined, { reason: err.message, provider: 'firebase' }, ipAddress, userAgent);
            throw new index_js_1.UnauthorizedError(err.message || 'Your account is not registered with EDUNEX. Please contact your administrator.');
        }
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        store_js_1.store.createSession(user.id, token, ipAddress, userAgent);
        store_js_1.store.logAction('USER_LOGIN_SUCCESS', 'User', user.id, user.id, { provider: 'firebase', role: user.role }, ipAddress, userAgent);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...safeUser } = user;
        return { token, user: safeUser };
    }
    async loginWithGoogle(payload, ipAddress, userAgent) {
        if (!payload.email || !payload.googleId) {
            throw new index_js_1.UnauthorizedError('Missing Google authentication identity or email.');
        }
        let user;
        let isNew = false;
        try {
            const res = await store_js_1.store.upsertGoogleUser({
                googleId: payload.googleId,
                email: payload.email,
                firstName: payload.firstName || payload.email.split('@')[0] || 'User',
                lastName: payload.lastName || '',
                avatarUrl: payload.avatarUrl || null
            });
            user = res.user;
            isNew = res.isNew;
        }
        catch (err) {
            store_js_1.store.logAction('USER_LOGIN_FAILURE', 'User', payload.email, undefined, { reason: err.message, provider: 'google' }, ipAddress, userAgent);
            throw new index_js_1.UnauthorizedError(err.message || 'Your account is not registered with EDUNEX. Please contact your administrator.');
        }
        const action = isNew ? 'USER_REGISTER_OAUTH' : 'USER_LOGIN_SUCCESS';
        store_js_1.store.logAction(action, 'User', user.id, user.id, { provider: 'google', role: user.role, isNew }, ipAddress, userAgent);
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        store_js_1.store.createSession(user.id, token, ipAddress, userAgent);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...safeUser } = user;
        return { token, user: safeUser, isNew };
    }
    logout(token, userId, ipAddress, userAgent) {
        store_js_1.store.deleteSession(token);
        if (userId) {
            store_js_1.store.logAction('USER_LOGOUT', 'User', userId, userId, undefined, ipAddress, userAgent);
        }
    }
    async getMe(userId) {
        let user = store_js_1.store.findUserById(userId);
        if (!user) {
            user = await store_js_1.store.fetchAndCacheUserById(userId);
        }
        if (!user || !user.isActive) {
            throw new index_js_1.UnauthorizedError('User session is no longer active.');
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...safeUser } = user;
        return safeUser;
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
