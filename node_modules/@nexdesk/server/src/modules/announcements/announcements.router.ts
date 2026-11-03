import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma, AnnouncementPriority, TargetAudience } from '../../common/db/prisma.js';
import { authenticate } from '../../common/middleware/auth.js';

export const announcementsRouter = Router();

announcementsRouter.use(authenticate);

function mapAnnouncement(a: any) {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    priority: a.priority,
    targetAudience: a.targetAudience,
    departmentId: a.departmentId,
    department: a.Department || null,
    authorId: a.authorId,
    author: a.User ? { firstName: a.User.firstName, lastName: a.User.lastName } : null,
    publishDate: a.createdAt.toISOString().split('T')[0],
    expiryDate: a.expiresAt ? a.expiresAt.toISOString().split('T')[0] : null,
    isActive: true,
    createdAt: a.createdAt
  };
}

announcementsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetAudience, departmentId } = req.query;

    const announcements = await prisma.announcement.findMany({
      where: {
        ...(targetAudience && targetAudience !== 'ALL' && { targetAudience: targetAudience as TargetAudience }),
        ...(departmentId && { departmentId: String(departmentId) })
      },
      include: {
        Department: true,
        User: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data: announcements.map(mapAnnouncement) });
  } catch (err) {
    next(err);
  }
});

announcementsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, content, priority, targetAudience, departmentId, expiryDate } = req.body;
    const authorId = req.user?.id || randomUUID();

    const announcement = await prisma.announcement.create({
      data: {
        id: randomUUID(),
        title,
        content,
        priority: (priority || 'NORMAL') as AnnouncementPriority,
        targetAudience: (targetAudience || 'ALL') as TargetAudience,
        departmentId: departmentId || null,
        authorId,
        expiresAt: expiryDate ? new Date(expiryDate) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        Department: true,
        User: true
      }
    });

    res.status(201).json({ data: mapAnnouncement(announcement) });
  } catch (err) {
    next(err);
  }
});

announcementsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { title, content, priority, targetAudience, departmentId } = req.body;

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(priority && { priority }),
        ...(targetAudience && { targetAudience }),
        ...(departmentId !== undefined && { departmentId }),
        updatedAt: new Date()
      },
      include: {
        Department: true,
        User: true
      }
    });

    res.json({ data: mapAnnouncement(updated) });
  } catch (err) {
    next(err);
  }
});

announcementsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.announcement.delete({ where: { id } });
    res.json({ data: { message: 'Announcement deleted successfully.' } });
  } catch (err) {
    next(err);
  }
});
