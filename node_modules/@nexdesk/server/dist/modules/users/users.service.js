"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersService = exports.UsersService = void 0;
const store_js_1 = require("../../common/db/store.js");
const index_js_1 = require("../../common/errors/index.js");
const admin_js_1 = require("../../common/firebase/admin.js");
const password_js_1 = require("../../common/utils/password.js");
class UsersService {
    listUsers(filters) {
        let list = store_js_1.store.users;
        if (filters?.role) {
            list = list.filter((u) => u.role === filters.role);
        }
        if (filters?.status) {
            const wantActive = filters.status === 'active';
            list = list.filter((u) => u.isActive === wantActive);
        }
        if (filters?.departmentId) {
            list = list.filter((u) => u.departmentId === filters.departmentId);
        }
        if (filters?.search) {
            const q = filters.search.trim().toLowerCase();
            list = list.filter((u) => u.email.toLowerCase().includes(q) ||
                u.firstName.toLowerCase().includes(q) ||
                u.lastName.toLowerCase().includes(q) ||
                `${u.firstName} ${u.lastName}`.toLowerCase().includes(q));
        }
        // Sort newest first
        list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return list.map(({ passwordHash, ...user }) => user);
    }
    getUserById(id) {
        const user = store_js_1.store.findUserById(id);
        if (!user) {
            throw new index_js_1.NotFoundError(`User with ID '${id}' was not found.`);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...safeUser } = user;
        return safeUser;
    }
    async createUser(input, creatorUserId, ipAddress, userAgent) {
        const normalizedEmail = input.email.trim().toLowerCase();
        // Check email availability
        const existing = store_js_1.store.findUserByEmail(normalizedEmail);
        if (existing) {
            throw new index_js_1.BadRequestError(`A user account with email '${normalizedEmail}' already exists.`);
        }
        // Step 1: Provision identity in Firebase Authentication
        let firebaseUser;
        try {
            firebaseUser = await admin_js_1.firebaseAdmin.createUser({
                email: normalizedEmail,
                password: input.password,
                displayName: `${input.firstName} ${input.lastName}`.trim(),
                disabled: false
            });
        }
        catch (err) {
            throw new index_js_1.BadRequestError(err.message || 'Failed to create user in Firebase authentication provider.');
        }
        // Step 2: Provision corresponding user profile in Supabase database
        let createdUser;
        try {
            createdUser = await store_js_1.store.createUserRecord({
                email: normalizedEmail,
                firstName: input.firstName,
                lastName: input.lastName,
                role: input.role,
                departmentId: input.departmentId,
                firebaseUid: firebaseUser.uid
            });
            // If a temporary password was provided, optionally hash it for fallback local verification
            if (input.password) {
                createdUser.passwordHash = await (0, password_js_1.hashPassword)(input.password);
            }
        }
        catch (dbError) {
            // Rollback: delete created Firebase identity to maintain synchronization integrity
            await admin_js_1.firebaseAdmin.deleteUser(firebaseUser.uid);
            throw new index_js_1.BadRequestError(dbError.message || 'Failed to save user profile to database.');
        }
        // Step 3: Generate password reset / setup link if requested or if no password was provided
        let resetLink;
        if (input.sendInvite || !input.password) {
            try {
                resetLink = await admin_js_1.firebaseAdmin.generatePasswordResetLink(normalizedEmail);
            }
            catch {
                // Log but don't fail account creation
            }
        }
        // Audit trail record
        store_js_1.store.logAction('USER_CREATED', 'User', createdUser.id, creatorUserId, {
            email: createdUser.email,
            role: createdUser.role,
            firebaseUid: createdUser.firebaseUid
        }, ipAddress, userAgent);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...safeUser } = createdUser;
        return { user: safeUser, resetLink };
    }
    async updateUser(id, input, updaterUserId, ipAddress, userAgent) {
        const existing = store_js_1.store.findUserById(id);
        if (!existing) {
            throw new index_js_1.NotFoundError(`User with ID '${id}' was not found.`);
        }
        // Prevent deactivating own account if only admin
        if (updaterUserId === id && input.isActive === false) {
            throw new index_js_1.BadRequestError('Administrators cannot deactivate their own account.');
        }
        const updatedUser = await store_js_1.store.updateUserRecord(id, {
            firstName: input.firstName,
            lastName: input.lastName,
            role: input.role,
            departmentId: input.departmentId,
            isActive: input.isActive
        });
        // Synchronize disabled state with Firebase Auth
        if (input.isActive !== undefined && updatedUser.firebaseUid) {
            await admin_js_1.firebaseAdmin.updateUser(updatedUser.firebaseUid, {
                disabled: !input.isActive
            });
        }
        // Audit trail
        const auditAction = input.isActive === false ? 'USER_DEACTIVATED' : 'USER_UPDATED';
        store_js_1.store.logAction(auditAction, 'User', updatedUser.id, updaterUserId, {
            role: updatedUser.role,
            isActive: updatedUser.isActive,
            changes: input
        }, ipAddress, userAgent);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...safeUser } = updatedUser;
        return safeUser;
    }
    async resetPassword(id, requesterUserId, ipAddress, userAgent) {
        const user = store_js_1.store.findUserById(id);
        if (!user) {
            throw new index_js_1.NotFoundError(`User with ID '${id}' was not found.`);
        }
        const resetLink = await admin_js_1.firebaseAdmin.generatePasswordResetLink(user.email);
        store_js_1.store.logAction('USER_PASSWORD_RESET_LINK_GENERATED', 'User', user.id, requesterUserId, { email: user.email }, ipAddress, userAgent);
        return {
            message: `Password setup and reset link generated for ${user.email}.`,
            resetLink
        };
    }
    listDepartments() {
        return store_js_1.store.departments;
    }
}
exports.UsersService = UsersService;
exports.usersService = new UsersService();
