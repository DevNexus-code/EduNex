import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../common/db/prisma.js';
import { authenticate } from '../../common/middleware/auth.js';

export const auditRouter = Router();

auditRouter.use(authenticate);

auditRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, limit = 50, page = 1 } = req.query;
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const where: any = {};
    if (action) {
      where.action = { contains: String(action), mode: 'insensitive' };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          User: true
        },
        orderBy: { timestamp: 'desc' },
        take,
        skip
      }),
      prisma.auditLog.count({ where })
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
  } catch (err) {
    next(err);
  }
});
