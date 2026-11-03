"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../../common/db/prisma.js");
const auth_js_1 = require("../../common/middleware/auth.js");
exports.auditRouter = (0, express_1.Router)();
exports.auditRouter.use(auth_js_1.authenticate);
exports.auditRouter.get('/', async (req, res, next) => {
    try {
        const { action, limit = 50, page = 1 } = req.query;
        const take = Number(limit);
        const skip = (Number(page) - 1) * take;
        const where = {};
        if (action) {
            where.action = { contains: String(action), mode: 'insensitive' };
        }
        const [logs, total] = await Promise.all([
            prisma_js_1.prisma.auditLog.findMany({
                where,
                include: {
                    User: true
                },
                orderBy: { timestamp: 'desc' },
                take,
                skip
            }),
            prisma_js_1.prisma.auditLog.count({ where })
        ]);
        res.json({
            data: logs.map((l) => ({
                id: l.id,
                action: l.action,
                actorId: l.userId,
                actorName: l.User ? `${l.User.firstName} ${l.User.lastName}` : 'System',
                actorEmail: l.User?.email || 'system@edunex.internal',
                targetId: l.entityId,
                details: l.payload,
                ipAddress: l.ipAddress,
                createdAt: l.timestamp.toISOString()
            })),
            meta: {
                total,
                page: Number(page),
                limit: take,
                totalPages: Math.ceil(total / take)
            }
        });
    }
    catch (err) {
        next(err);
    }
});
