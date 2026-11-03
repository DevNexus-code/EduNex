"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketQuerySchema = exports.addCommentSchema = exports.updateTicketSchema = exports.createTicketSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createTicketSchema = zod_1.z.object({
    title: zod_1.z.string().min(5, 'Title must be at least 5 characters.').max(150),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters.'),
    category: zod_1.z.nativeEnum(client_1.TicketCategory),
    priority: zod_1.z.nativeEnum(client_1.TicketPriority).default(client_1.TicketPriority.MEDIUM),
    assetId: zod_1.z.string().uuid().optional().nullable()
});
exports.updateTicketSchema = zod_1.z.object({
    title: zod_1.z.string().min(5).max(150).optional(),
    description: zod_1.z.string().min(10).optional(),
    category: zod_1.z.nativeEnum(client_1.TicketCategory).optional(),
    priority: zod_1.z.nativeEnum(client_1.TicketPriority).optional(),
    status: zod_1.z.nativeEnum(client_1.TicketStatus).optional(),
    assigneeId: zod_1.z.string().uuid().optional().nullable(),
    assetId: zod_1.z.string().uuid().optional().nullable()
});
exports.addCommentSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, 'Comment text cannot be empty.').max(5000),
    isInternal: zod_1.z.boolean().default(false)
});
exports.ticketQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    status: zod_1.z.nativeEnum(client_1.TicketStatus).optional(),
    priority: zod_1.z.nativeEnum(client_1.TicketPriority).optional(),
    category: zod_1.z.nativeEnum(client_1.TicketCategory).optional(),
    assigneeId: zod_1.z.string().optional(),
    creatorId: zod_1.z.string().optional(),
    search: zod_1.z.string().optional()
});
