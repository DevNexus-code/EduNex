import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma, LeaveStatus, LeaveType } from '../../common/db/prisma.js';
import { authenticate } from '../../common/middleware/auth.js';
import { validateDatabaseId, normalizeOptionalString } from '../../common/utils/query-validators.js';

export const leavesRouter = Router();

leavesRouter.use(authenticate);

function mapLeave(l: any) {
  return {
    id: l.id,
    staffId: l.staffId,
    staff: l.Staff
      ? {
          id: l.Staff.id,
          staffId: l.Staff.staffId,
          firstName: l.Staff.User?.firstName || '',
          lastName: l.Staff.User?.lastName || '',
          email: l.Staff.User?.email || '',
          designation: l.Staff.designation
        }
      : undefined,
    leaveType: l.leaveType,
    startDate: l.startDate ? l.startDate.toISOString().split('T')[0] : '',
    endDate: l.endDate ? l.endDate.toISOString().split('T')[0] : '',
    reason: l.reason,
    status: l.status,
    reviewedById: l.reviewedById,
    reviewRemarks: l.reviewNotes || null,
    reviewedAt: l.reviewedAt ? l.reviewedAt.toISOString() : null,
    createdAt: l.createdAt
  };
}

leavesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = validateDatabaseId(req.query.staffId, 'staffId');
    const rawStatus = normalizeOptionalString(req.query.status);
    const status = rawStatus && Object.values(LeaveStatus).includes(rawStatus.toUpperCase() as LeaveStatus)
      ? (rawStatus.toUpperCase() as LeaveStatus)
      : undefined;

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        ...(staffId && { staffId }),
        ...(status && { status })
      },
      include: {
        Staff: {
          include: { User: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data: leaves.map(mapLeave) });
  } catch (err) {
    next(err);
  }
});

leavesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { staffId, leaveType, startDate, endDate, reason } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const leave = await prisma.leaveRequest.create({
      data: {
        id: randomUUID(),
        staffId,
        leaveType: (leaveType as LeaveType) || 'CASUAL',
        startDate: start,
        endDate: end,
        totalDays,
        reason,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        Staff: {
          include: { User: true }
        }
      }
    });

    res.status(201).json({ data: mapLeave(leave) });
  } catch (err) {
    next(err);
  }
});

leavesRouter.patch('/:id/review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id') || rawId;
    const { status, reviewNotes } = req.body;
    const reviewedById = req.user?.id || randomUUID();

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: status as LeaveStatus,
        reviewNotes: reviewNotes || null,
        reviewedById,
        reviewedAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        Staff: {
          include: { User: true }
        }
      }
    });

    res.json({ data: mapLeave(leave) });
  } catch (err) {
    next(err);
  }
});
