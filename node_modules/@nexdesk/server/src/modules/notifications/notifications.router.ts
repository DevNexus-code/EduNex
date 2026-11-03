import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../common/db/prisma.js';
import { authenticate } from '../../common/middleware/auth.js';
import { emailService } from '../../common/email/email.service.js';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

// Admin-only guard helper
function requireAdmin(req: Request, res: Response, next: NextFunction) {
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
notificationsRouter.get('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawType = req.query.type ? String(req.query.type).trim() : undefined;
    const rawStatus = req.query.status ? String(req.query.status).trim() : undefined;
    const rawSearch = req.query.search ? String(req.query.search).trim() : undefined;

    const where: any = {};
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

    const logs = await prisma.emailNotificationLog.findMany({
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
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/notifications/metrics
 * Summary counts of notification events
 */
notificationsRouter.get('/metrics', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [total, sent, failed, pending] = await Promise.all([
      prisma.emailNotificationLog.count(),
      prisma.emailNotificationLog.count({ where: { status: 'SENT' } }),
      prisma.emailNotificationLog.count({ where: { status: 'FAILED' } }),
      prisma.emailNotificationLog.count({ where: { status: 'PENDING' } })
    ]);

    const statusConfig = emailService.getStatus();

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
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/notifications/:id/retry
 * Re-attempts delivery of a failed email notification
 */
notificationsRouter.post('/:id/retry', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await emailService.retryNotification(id);
    res.json({
      data: {
        message: result.success ? 'Notification dispatched successfully on retry.' : 'Retry failed.',
        ...result
      }
    });
  } catch (err: any) {
    next(err);
  }
});
