"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../../common/db/prisma.js");
const auth_js_1 = require("../../common/middleware/auth.js");
const email_service_js_1 = require("../../common/email/email.service.js");
exports.notificationsRouter = (0, express_1.Router)();
exports.notificationsRouter.use(auth_js_1.authenticate);
// Admin-only guard helper
function requireAdmin(req, res, next) {
    const role = req.user?.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'PRINCIPAL') {
        return res.status(403).json({
            title: 'Forbidden',
            detail: 'Administrative privileges are required to access notification logs.'
        });
    }
    next();
}
/**
 * GET /api/v1/notifications
 * List email notification history with filtering
 */
exports.notificationsRouter.get('/', requireAdmin, async (req, res, next) => {
    try {
        const rawType = req.query.type ? String(req.query.type).trim() : undefined;
        const rawStatus = req.query.status ? String(req.query.status).trim() : undefined;
        const rawSearch = req.query.search ? String(req.query.search).trim() : undefined;
        const where = {};
        if (rawType && rawType !== 'ALL') {
            where.notificationType = rawType;
        }
        if (rawStatus && rawStatus !== 'ALL') {
            where.status = rawStatus.toUpperCase();
        }
        if (rawSearch && rawSearch !== 'undefined' && rawSearch !== 'null') {
            where.OR = [
                { recipient: { contains: rawSearch, mode: 'insensitive' } },
                { subject: { contains: rawSearch, mode: 'insensitive' } },
                { contentSummary: { contains: rawSearch, mode: 'insensitive' } }
            ];
        }
        const logs = await prisma_js_1.prisma.emailNotificationLog.findMany({
            where,
            include: {
                User: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json({
            data: logs.map((log) => ({
                id: log.id,
                recipient: log.recipient,
                userId: log.userId,
                userName: log.User ? `${log.User.firstName} ${log.User.lastName}` : null,
                userRole: log.User?.role || null,
                notificationType: log.notificationType,
                subject: log.subject,
                contentSummary: log.contentSummary,
                status: log.status,
                errorMessage: log.errorMessage,
                retryCount: log.retryCount,
                lastAttemptAt: log.lastAttemptAt ? log.lastAttemptAt.toISOString() : null,
                sentAt: log.sentAt ? log.sentAt.toISOString() : null,
                createdAt: log.createdAt.toISOString()
            }))
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/notifications/metrics
 * Summary counts of notification events
 */
exports.notificationsRouter.get('/metrics', requireAdmin, async (_req, res, next) => {
    try {
        const [total, sent, failed, pending] = await Promise.all([
            prisma_js_1.prisma.emailNotificationLog.count(),
            prisma_js_1.prisma.emailNotificationLog.count({ where: { status: 'SENT' } }),
            prisma_js_1.prisma.emailNotificationLog.count({ where: { status: 'FAILED' } }),
            prisma_js_1.prisma.emailNotificationLog.count({ where: { status: 'PENDING' } })
        ]);
        const statusConfig = email_service_js_1.emailService.getStatus();
        res.json({
            data: {
                total,
                sent,
                failed,
                pending,
                provider: {
                    isConfigured: statusConfig.isConfigured,
                    from: statusConfig.from
                }
            }
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /api/v1/notifications/:id/retry
 * Re-attempts delivery of a failed email notification
 */
exports.notificationsRouter.post('/:id/retry', requireAdmin, async (req, res, next) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await email_service_js_1.emailService.retryNotification(id);
        res.json({
            data: {
                message: result.success ? 'Notification dispatched successfully on retry.' : 'Retry failed.',
                ...result
            }
        });
    }
    catch (err) {
        next(err);
    }
});
