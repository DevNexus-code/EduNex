"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.firebaseAuthSchema = exports.googleAuthSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z
    .object({
    identifier: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    password: zod_1.z.string().min(1, 'Password is required.')
})
    .refine((data) => Boolean((data.identifier && data.identifier.trim()) || (data.email && data.email.trim())), {
    message: 'Please provide a valid User ID, mobile number, or email address.',
    path: ['identifier']
})
    .transform((data) => ({
    identifier: ((data.identifier && data.identifier.trim()) || (data.email && data.email.trim()) || ''),
    password: data.password
}));
exports.googleAuthSchema = zod_1.z.object({
    googleId: zod_1.z.string().min(1, 'Google provider identity is required.'),
    email: zod_1.z.string().email('Valid Google email is required.').trim().toLowerCase(),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    avatarUrl: zod_1.z.string().optional().nullable(),
    idToken: zod_1.z.string().optional(),
    accessToken: zod_1.z.string().optional()
});
exports.firebaseAuthSchema = zod_1.z.object({
    idToken: zod_1.z.string().min(1, 'Firebase identity token is required.')
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required.'),
    newPassword: zod_1.z.string().min(6, 'New password must be at least 6 characters long.')
});
