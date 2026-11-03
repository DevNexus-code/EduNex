"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userFilterSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Please provide a valid corporate email address.').trim().toLowerCase(),
    firstName: zod_1.z.string().min(1, 'First name is required.').trim(),
    lastName: zod_1.z.string().min(1, 'Last name is required.').trim(),
    role: zod_1.z.nativeEnum(client_1.Role, {
        errorMap: () => ({ message: 'Role must be ADMIN, TEAM_LEAD, IT_AGENT, or EMPLOYEE.' })
    }),
    password: zod_1.z.string().min(8, 'Temporary password must be at least 8 characters long.').optional(),
    sendInvite: zod_1.z.boolean().default(true),
    departmentId: zod_1.z.string().uuid().optional().nullable()
});
exports.updateUserSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).trim().optional(),
    lastName: zod_1.z.string().min(1).trim().optional(),
    role: zod_1.z.nativeEnum(client_1.Role).optional(),
    isActive: zod_1.z.boolean().optional(),
    departmentId: zod_1.z.string().uuid().optional().nullable()
});
exports.userFilterSchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    role: zod_1.z.nativeEnum(client_1.Role).optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
    departmentId: zod_1.z.string().uuid().optional()
});
