"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const crypto_1 = require("crypto");
const prisma_js_1 = require("../../common/db/prisma.js");
const auth_js_1 = require("../../common/middleware/auth.js");
const password_js_1 = require("../../common/utils/password.js");
const store_js_1 = require("../../common/db/store.js");
const admin_js_1 = require("../../common/firebase/admin.js");
const activation_service_js_1 = require("../../common/services/activation.service.js");
const email_service_js_1 = require("../../common/email/email.service.js");
const otp_service_js_1 = require("../../common/services/otp.service.js");
const index_js_1 = require("../../common/config/index.js");
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.use(auth_js_1.authenticate);
function mapUser(u) {
    const loginId = u.studentId || u.staffId || u.parentId || u.email;
    return {
        id: u.id,
        loginId,
        email: u.email && !u.email.endsWith('@internal.edunex.local') ? u.email : null,
        displayEmail: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        name: `${u.firstName} ${u.lastName}`.trim(),
        role: u.role,
        avatarUrl: u.avatarUrl,
        phone: u.phone,
        designation: u.designation,
        gender: u.gender,
        dateOfBirth: u.dateOfBirth ? u.dateOfBirth.toISOString().split('T')[0] : null,
        bloodGroup: u.bloodGroup,
        address: u.address,
        city: u.city,
        state: u.state,
        postalCode: u.postalCode,
        bio: u.bio,
        departmentId: u.departmentId,
        department: u.Department_User_departmentIdToDepartment || null,
        isActive: u.isActive,
        isEmailVerified: Boolean(u.isEmailVerified),
        emailVerifiedAt: u.emailVerifiedAt ? u.emailVerifiedAt.toISOString() : null,
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        createdAt: u.createdAt.toISOString()
    };
}
// --- SELF-SERVICE PROFILE ---
exports.usersRouter.get('/me/profile', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const user = await prisma_js_1.prisma.user.findUnique({
            where: { id: userId },
            include: { Department_User_departmentIdToDepartment: true }
        });
        if (!user) {
            return res.status(404).json({ title: 'Not Found', detail: 'User profile not found.' });
        }
        res.json({ data: mapUser(user) });
    }
    catch (err) {
        next(err);
    }
});
/**
 * Request OTP verification code for sensitive profile updates
 */
exports.usersRouter.post('/me/profile/request-update', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const user = await prisma_js_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ title: 'Not Found', detail: 'User not found.' });
        }
        const { firstName, lastName, phone, address, city, state, postalCode, bio, gender, bloodGroup } = req.body;
        const pendingPayload = {
            firstName,
            lastName,
            phone,
            address,
            city,
            state,
            postalCode,
            bio,
            gender,
            bloodGroup
        };
        if (user.email && !user.email.endsWith('@internal.edunex.local')) {
            const challenge = await otp_service_js_1.otpService.createChallenge({
                email: user.email,
                userId: user.id,
                purpose: 'PROFILE_UPDATE',
                payload: pendingPayload,
                userName: user.firstName,
                ipAddress: ip,
                userAgent
            });
            return res.json({
                success: true,
                requiresOtp: true,
                data: {
                    requiresOtp: true,
                    ...challenge
                }
            });
        }
        // Direct update if user has no external email
        const updated = await prisma_js_1.prisma.user.update({
            where: { id: userId },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(phone !== undefined && { phone }),
                ...(address !== undefined && { address }),
                ...(city !== undefined && { city }),
                ...(state !== undefined && { state }),
                ...(postalCode !== undefined && { postalCode }),
                ...(bio !== undefined && { bio }),
                ...(gender !== undefined && { gender }),
                ...(bloodGroup !== undefined && { bloodGroup }),
                updatedAt: new Date()
            },
            include: { Department_User_departmentIdToDepartment: true }
        });
        store_js_1.store.refreshUser(updated);
        res.json({ success: true, requiresOtp: false, data: mapUser(updated) });
    }
    catch (err) {
        next(err);
    }
});
/**
 * Verify OTP and apply sensitive profile updates
 */
exports.usersRouter.post('/me/profile/verify-update', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { challengeId, otp } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        if (!challengeId || !otp) {
            return res.status(400).json({ title: 'Bad Request', detail: 'Challenge ID and 6-digit OTP code are required.' });
        }
        const verification = await otp_service_js_1.otpService.verifyChallenge({
            challengeId,
            otp,
            purpose: 'PROFILE_UPDATE',
            ipAddress: ip,
            userAgent
        });
        if (verification.userId !== userId) {
            return res.status(403).json({ title: 'Forbidden', detail: 'Challenge does not belong to the current authenticated session.' });
        }
        const payload = verification.payload || {};
        const updated = await prisma_js_1.prisma.user.update({
            where: { id: userId },
            data: {
                ...(payload.firstName && { firstName: payload.firstName }),
                ...(payload.lastName && { lastName: payload.lastName }),
                ...(payload.phone !== undefined && { phone: payload.phone }),
                ...(payload.address !== undefined && { address: payload.address }),
                ...(payload.city !== undefined && { city: payload.city }),
                ...(payload.state !== undefined && { state: payload.state }),
                ...(payload.postalCode !== undefined && { postalCode: payload.postalCode }),
                ...(payload.bio !== undefined && { bio: payload.bio }),
                ...(payload.gender !== undefined && { gender: payload.gender }),
                ...(payload.bloodGroup !== undefined && { bloodGroup: payload.bloodGroup }),
                updatedAt: new Date()
            },
            include: { Department_User_departmentIdToDepartment: true }
        });
        store_js_1.store.refreshUser(updated);
        store_js_1.store.logAction('PROFILE_UPDATE_VERIFIED', 'User', updated.id, updated.id, { changes: Object.keys(payload) }, ip, userAgent);
        res.json({
            success: true,
            message: 'Profile details verified and updated successfully.',
            data: mapUser(updated)
        });
    }
    catch (err) {
        next(err);
    }
});
exports.usersRouter.patch('/me/profile', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { firstName, lastName, phone, bio, address, city, state, postalCode, gender, bloodGroup, challengeId, otp } = req.body;
        const user = await prisma_js_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ title: 'Not Found', detail: 'User not found.' });
        }
        const isSensitive = phone !== undefined || address !== undefined || postalCode !== undefined;
        const hasExternalEmail = user.email && !user.email.endsWith('@internal.edunex.local');
        if (isSensitive && hasExternalEmail) {
            if (!challengeId || !otp) {
                // Trigger OTP challenge
                const challenge = await otp_service_js_1.otpService.createChallenge({
                    email: user.email,
                    userId: user.id,
                    purpose: 'PROFILE_UPDATE',
                    payload: { firstName, lastName, phone, bio, address, city, state, postalCode, gender, bloodGroup },
                    userName: user.firstName
                });
                return res.json({
                    requiresOtp: true,
                    message: 'Sensitive profile changes require email OTP verification code before saving.',
                    data: {
                        requiresOtp: true,
                        ...challenge
                    }
                });
            }
            // Verify provided OTP
            await otp_service_js_1.otpService.verifyChallenge({
                challengeId,
                otp,
                purpose: 'PROFILE_UPDATE'
            });
        }
        const updated = await prisma_js_1.prisma.user.update({
            where: { id: userId },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(phone !== undefined && { phone }),
                ...(bio !== undefined && { bio }),
                ...(address !== undefined && { address }),
                ...(city !== undefined && { city }),
                ...(state !== undefined && { state }),
                ...(postalCode !== undefined && { postalCode }),
                ...(gender !== undefined && { gender }),
                ...(bloodGroup !== undefined && { bloodGroup }),
                updatedAt: new Date()
            },
            include: { Department_User_departmentIdToDepartment: true }
        });
        store_js_1.store.refreshUser(updated);
        res.json({ data: mapUser(updated) });
    }
    catch (err) {
        next(err);
    }
});
exports.usersRouter.post('/me/avatar', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { avatarUrl } = req.body;
        const updated = await prisma_js_1.prisma.user.update({
            where: { id: userId },
            data: {
                avatarUrl,
                updatedAt: new Date()
            },
            include: { Department_User_departmentIdToDepartment: true }
        });
        store_js_1.store.refreshUser(updated);
        res.json({ data: mapUser(updated) });
    }
    catch (err) {
        next(err);
    }
});
exports.usersRouter.delete('/me/avatar', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const updated = await prisma_js_1.prisma.user.update({
            where: { id: userId },
            data: {
                avatarUrl: null,
                updatedAt: new Date()
            },
            include: { Department_User_departmentIdToDepartment: true }
        });
        store_js_1.store.refreshUser(updated);
        res.json({ data: mapUser(updated) });
    }
    catch (err) {
        next(err);
    }
});
// --- ADMIN USER DIRECTORY & MANAGEMENT ---
exports.usersRouter.get('/', async (req, res, next) => {
    try {
        const rawRole = req.query.role ? String(req.query.role).trim() : undefined;
        const role = rawRole && rawRole !== 'undefined' && rawRole !== 'null' && rawRole !== 'ALL' && Object.values(prisma_js_1.Role).includes(rawRole.toUpperCase())
            ? rawRole.toUpperCase()
            : undefined;
        const rawStatus = req.query.status ? String(req.query.status).trim() : undefined;
        const status = rawStatus && rawStatus !== 'undefined' && rawStatus !== 'null' && rawStatus !== 'ALL'
            ? rawStatus.toUpperCase() === 'ACTIVE'
            : undefined;
        const rawSearch = req.query.search ? String(req.query.search).trim() : undefined;
        const search = rawSearch && rawSearch !== 'undefined' && rawSearch !== 'null' ? rawSearch : undefined;
        const where = {};
        if (role)
            where.role = role;
        if (status !== undefined)
            where.isActive = status;
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { staffId: { contains: search, mode: 'insensitive' } },
                { studentId: { contains: search, mode: 'insensitive' } },
                { parentId: { contains: search, mode: 'insensitive' } }
            ];
        }
        const users = await prisma_js_1.prisma.user.findMany({
            where,
            include: { Department_User_departmentIdToDepartment: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ data: users.map(mapUser) });
    }
    catch (err) {
        next(err);
    }
});
exports.usersRouter.get('/metrics', async (_req, res, next) => {
    try {
        const [total, active, inactive, superAdmins, admins, principals, teachers, staffMembers, students, parents, itAgents, teamLeads] = await Promise.all([
            prisma_js_1.prisma.user.count(),
            prisma_js_1.prisma.user.count({ where: { isActive: true } }),
            prisma_js_1.prisma.user.count({ where: { isActive: false } }),
            prisma_js_1.prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
            prisma_js_1.prisma.user.count({ where: { role: 'ADMIN' } }),
            prisma_js_1.prisma.user.count({ where: { role: 'PRINCIPAL' } }),
            prisma_js_1.prisma.user.count({ where: { role: 'TEACHER' } }),
            prisma_js_1.prisma.user.count({ where: { role: 'STAFF' } }),
            prisma_js_1.prisma.user.count({ where: { role: 'STUDENT' } }),
            prisma_js_1.prisma.user.count({ where: { role: 'PARENT' } }),
            prisma_js_1.prisma.user.count({ where: { role: 'IT_AGENT' } }),
            prisma_js_1.prisma.user.count({ where: { role: 'TEAM_LEAD' } })
        ]);
        res.json({
            data: {
                total,
                active,
                inactive,
                superAdmins,
                admins,
                principals,
                teachers,
                staffMembers,
                students,
                parents,
                itAgents,
                teamLeads
            }
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /api/v1/users
 * Provision new institutional account across any role with automatic credentials & email delivery
 */
exports.usersRouter.post('/', async (req, res, next) => {
    try {
        const { email, firstName, lastName, role, departmentId, phone } = req.body;
        if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
            return res.status(400).json({ title: 'Bad Request', detail: 'User first name and last name are required.' });
        }
        const targetRole = (role ? String(role).toUpperCase() : 'STAFF');
        const normalizedEmail = email && email.trim() ? email.trim().toLowerCase() : null;
        if (normalizedEmail) {
            const existing = await prisma_js_1.prisma.user.findUnique({
                where: { email: normalizedEmail }
            });
            if (existing) {
                return res.status(409).json({ title: 'Conflict', detail: `A user with email '${normalizedEmail}' already exists.` });
            }
        }
        const userId = (0, crypto_1.randomUUID)();
        let loginId = `EDX-${Date.now().toString().slice(-6)}`;
        if (targetRole === 'TEACHER' || targetRole === 'STAFF') {
            loginId = `STF-${Date.now().toString().slice(-5)}`;
        }
        else if (targetRole === 'STUDENT') {
            loginId = `STU-${Date.now().toString().slice(-5)}`;
        }
        else if (targetRole === 'PARENT') {
            loginId = `PAR-${Date.now().toString().slice(-5)}`;
        }
        else if (targetRole === 'IT_AGENT') {
            loginId = `IT-${Date.now().toString().slice(-4)}`;
        }
        const safeEmail = normalizedEmail || `${loginId.toLowerCase()}@internal.edunex.local`;
        // 1. Create or sync in Firebase Auth if external email provided
        let firebaseUid = null;
        const initialTempPassword = `Edu@${(0, crypto_1.randomBytes)(4).toString('hex')}!`;
        const initialPasswordHash = await (0, password_js_1.hashPassword)(initialTempPassword);
        if (normalizedEmail) {
            try {
                const fbRecord = await admin_js_1.firebaseAdmin.createUser({
                    email: normalizedEmail,
                    displayName: `${firstName.trim()} ${lastName.trim()}`,
                    disabled: false
                });
                firebaseUid = fbRecord.uid;
            }
            catch (fbErr) {
                if (fbErr.code === 'auth/email-already-exists') {
                    return res.status(409).json({ title: 'Conflict', detail: 'This email is already registered in Firebase Authentication.' });
                }
            }
        }
        // 2. Create User in Supabase PostgreSQL
        const user = await prisma_js_1.prisma.user.create({
            data: {
                id: userId,
                email: safeEmail,
                passwordHash: initialPasswordHash,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                role: targetRole,
                departmentId: departmentId || null,
                phone: phone || null,
                staffId: targetRole === 'TEACHER' || targetRole === 'STAFF' || targetRole === 'IT_AGENT' || targetRole === 'TEAM_LEAD' ? loginId : null,
                studentId: targetRole === 'STUDENT' ? loginId : null,
                parentId: targetRole === 'PARENT' ? loginId : null,
                firebaseUid,
                isActive: true,
                isEmailVerified: false,
                mustChangePassword: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            include: { Department_User_departmentIdToDepartment: true }
        });
        store_js_1.store.refreshUser(user);
        store_js_1.store.logAction('USER_PROVISIONED', 'User', user.id, req.user?.id, { role: targetRole, email: safeEmail });
        // 3. Automated Credential Delivery Workflow
        let activationToken = null;
        let emailStatus = 'MANUAL_DELIVERY_REQUIRED';
        if (normalizedEmail) {
            // Generate secure short-lived single-use activation token (72-hour validity)
            activationToken = await activation_service_js_1.activationService.createActivationToken(user.id, normalizedEmail, 72);
            // Dispatch automated account activation email
            const delivery = await email_service_js_1.emailService.sendAccountActivationEmail({
                to: normalizedEmail,
                userId: user.id,
                name: `${firstName} ${lastName}`.trim(),
                loginId,
                role: targetRole,
                activationToken,
                expiresHours: 72
            });
            emailStatus = delivery.success ? 'SENT' : 'FAILED';
        }
        res.status(201).json({
            success: true,
            data: {
                user: mapUser(user),
                loginId,
                emailStatus,
                activationToken,
                resetLink: activationToken ? `${index_js_1.config.APP_URL}/auth/activate?token=${activationToken}` : undefined,
                temporaryPassword: initialTempPassword,
                credentialSlip: !normalizedEmail
                    ? {
                        loginId,
                        temporaryPassword: initialTempPassword,
                        note: 'Manual delivery required. No registered external email address.'
                    }
                    : undefined
            }
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /api/v1/users/:id/resend-activation
 * Re-issues and dispatches account activation email
 */
exports.usersRouter.post('/:id/resend-activation', async (req, res, next) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const user = await prisma_js_1.prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ title: 'Not Found', detail: 'User account not found.' });
        }
        if (!user.email || user.email.endsWith('@internal.edunex.local')) {
            return res.status(400).json({
                title: 'Bad Request',
                detail: 'This user account has no registered external email address for notification delivery.'
            });
        }
        const loginId = user.studentId || user.staffId || user.parentId || user.email;
        const activationToken = await activation_service_js_1.activationService.createActivationToken(user.id, user.email, 72);
        const delivery = await email_service_js_1.emailService.sendAccountActivationEmail({
            to: user.email,
            userId: user.id,
            name: `${user.firstName} ${user.lastName}`.trim(),
            loginId,
            role: user.role,
            activationToken,
            expiresHours: 72
        });
        store_js_1.store.logAction('ACTIVATION_EMAIL_RESENT', 'User', user.id, req.user?.id, { email: user.email });
        res.json({
            success: true,
            data: {
                message: delivery.success
                    ? `Activation email dispatched successfully to ${user.email}.`
                    : `Failed to deliver activation email to ${user.email}. Please review notification logs.`,
                deliveryStatus: delivery.success ? 'SENT' : 'FAILED',
                activationToken
            }
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /api/v1/users/:id/reset-password
 * Admin-triggered secure password reset
 */
exports.usersRouter.post('/:id/reset-password', async (req, res, next) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const user = await prisma_js_1.prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ title: 'Not Found', detail: 'User account not found.' });
        }
        const temporaryPassword = `Edu@${(0, crypto_1.randomBytes)(4).toString('hex')}!`;
        const passwordHash = await (0, password_js_1.hashPassword)(temporaryPassword);
        await prisma_js_1.prisma.user.update({
            where: { id },
            data: {
                passwordHash,
                mustChangePassword: true,
                updatedAt: new Date()
            }
        });
        let resetToken = null;
        let emailSent = false;
        if (user.email && !user.email.endsWith('@internal.edunex.local')) {
            resetToken = await activation_service_js_1.activationService.createActivationToken(user.id, user.email, 24);
            const resetUrl = `https://edunex.internal/auth/reset?token=${resetToken}`;
            const delivery = await email_service_js_1.emailService.sendPasswordResetEmail({
                to: user.email,
                userId: user.id,
                name: user.firstName,
                resetUrl,
                expiresHours: 24
            });
            emailSent = delivery.success;
        }
        store_js_1.store.logAction('ADMIN_PASSWORD_RESET', 'User', user.id, req.user?.id, { emailSent });
        res.json({
            data: {
                message: emailSent
                    ? `Password reset instructions sent to ${user.email}.`
                    : 'Temporary credentials generated for manual delivery.',
                temporaryPassword,
                emailSent,
                resetToken
            }
        });
    }
    catch (err) {
        next(err);
    }
});
exports.usersRouter.patch('/:id', async (req, res, next) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { firstName, lastName, role, departmentId, phone, isActive } = req.body;
        const existing = await prisma_js_1.prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ title: 'Not Found', detail: 'User not found.' });
        }
        // Update in Supabase
        const updated = await prisma_js_1.prisma.user.update({
            where: { id },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(role && { role: role }),
                ...(departmentId !== undefined && { departmentId }),
                ...(phone !== undefined && { phone }),
                ...(isActive !== undefined && { isActive }),
                updatedAt: new Date()
            },
            include: { Department_User_departmentIdToDepartment: true }
        });
        // Sync active/disabled status to Firebase Auth if linked
        if (isActive !== undefined && updated.firebaseUid) {
            try {
                await admin_js_1.firebaseAdmin.updateUser(updated.firebaseUid, { disabled: !isActive });
            }
            catch {
                // deferred
            }
        }
        store_js_1.store.refreshUser(updated);
        store_js_1.store.logAction('USER_UPDATED', 'User', updated.id, req.user?.id, { isActive, role });
        res.json({ data: mapUser(updated) });
    }
    catch (err) {
        next(err);
    }
});
