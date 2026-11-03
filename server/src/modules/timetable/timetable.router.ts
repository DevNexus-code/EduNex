import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma, DayOfWeek } from '../../common/db/prisma.js';
import { authenticate } from '../../common/middleware/auth.js';
import { validateDatabaseId, normalizeOptionalString } from '../../common/utils/query-validators.js';

export const timetableRouter = Router();

timetableRouter.use(authenticate);

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridian = match[3]?.toUpperCase();
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return 0;
}

function doIntervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = parseTimeToMinutes(startA);
  const aEnd = parseTimeToMinutes(endA);
  const bStart = parseTimeToMinutes(startB);
  const bEnd = parseTimeToMinutes(endB);
  return aStart < bEnd && aEnd > bStart;
}

async function resolveTeacherUserId(teacherIdentifier: string): Promise<string | null> {
  if (!teacherIdentifier) return null;
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: teacherIdentifier },
        { staffId: teacherIdentifier },
        { Staff: { id: teacherIdentifier } }
      ]
    }
  });
  return user ? user.id : teacherIdentifier;
}

function mapTimetable(s: any) {
  return {
    id: s.id,
    courseId: s.courseId,
    course: s.Course,
    sectionId: s.classSectionId,
    section: s.ClassSection,
    subjectId: s.subjectId,
    subject: s.Subject,
    teacherId: s.teacherId,
    teacher: s.User
      ? {
          id: s.User.id,
          staffId: s.User.staffId || '',
          firstName: s.User.firstName,
          lastName: s.User.lastName
        }
      : null,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    roomNumber: s.roomNumber,
    academicYear: s.academicYear,
    createdAt: s.createdAt
  };
}

timetableRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sectionId = validateDatabaseId(req.query.sectionId, 'sectionId');
    const teacherId = validateDatabaseId(req.query.teacherId, 'teacherId');
    const courseId = validateDatabaseId(req.query.courseId, 'courseId');
    const subjectId = validateDatabaseId(req.query.subjectId, 'subjectId');
    const dayOfWeek = normalizeOptionalString(req.query.dayOfWeek) as DayOfWeek | undefined;

    let resolvedTeacherId: string | null = null;
    if (teacherId) {
      resolvedTeacherId = await resolveTeacherUserId(teacherId);
    }

    const slots = await prisma.timetable.findMany({
      where: {
        ...(sectionId && { classSectionId: sectionId }),
        ...(resolvedTeacherId && { teacherId: resolvedTeacherId }),
        ...(courseId && { courseId }),
        ...(subjectId && { subjectId }),
        ...(dayOfWeek && { dayOfWeek })
      },
      include: {
        Subject: true,
        User: true,
        ClassSection: true,
        Course: true
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });

    res.json({ data: slots.map(mapTimetable) });
  } catch (err) {
    next(err);
  }
});

timetableRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sectionId, subjectId, teacherId, dayOfWeek, startTime, endTime, roomNumber } = req.body;

    if (!sectionId || !subjectId || !teacherId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ title: 'Bad Request', detail: 'All period schedule details are required.' });
    }

    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(endTime);
    if (startMins >= endMins) {
      return res.status(400).json({
        title: 'Invalid Time',
        detail: `Period start time (${startTime}) must be earlier than end time (${endTime}).`
      });
    }

    const section = await prisma.classSection.findUnique({
      where: { id: sectionId }
    });

    if (!section) {
      return res.status(404).json({ title: 'Not Found', detail: 'Class section not found.' });
    }

    const resolvedTeacherId = await resolveTeacherUserId(teacherId);
    if (!resolvedTeacherId) {
      return res.status(404).json({ title: 'Not Found', detail: 'Assigned teacher not found.' });
    }

    // Check for scheduling conflicts on the same day
    const existingDaySlots = await prisma.timetable.findMany({
      where: { dayOfWeek: dayOfWeek as DayOfWeek },
      include: {
        User: true,
        ClassSection: true,
        Subject: true
      }
    });

    for (const slot of existingDaySlots) {
      if (doIntervalsOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
        // 1. Teacher Conflict
        if (slot.teacherId === resolvedTeacherId) {
          const teacherName = slot.User ? `${slot.User.firstName} ${slot.User.lastName || ''}`.trim() : 'The teacher';
          const secName = slot.ClassSection?.name || 'another section';
          return res.status(400).json({
            title: 'Teacher Schedule Conflict',
            detail: `Teacher ${teacherName} is already assigned to Section ${secName} during this period (${slot.startTime} - ${slot.endTime}).`
          });
        }

        // 2. Section Conflict
        if (slot.classSectionId === sectionId) {
          const subjName = slot.Subject?.name || 'another subject';
          return res.status(400).json({
            title: 'Section Schedule Conflict',
            detail: `Section ${section.name} already has ${subjName} scheduled at this time (${slot.startTime} - ${slot.endTime}).`
          });
        }

        // 3. Room Conflict
        if (roomNumber && slot.roomNumber && roomNumber.trim().toLowerCase() === slot.roomNumber.trim().toLowerCase()) {
          const subjName = slot.Subject?.name || 'another class';
          return res.status(400).json({
            title: 'Room Occupied Conflict',
            detail: `Room ${roomNumber} is already occupied by ${subjName} during this period (${slot.startTime} - ${slot.endTime}).`
          });
        }
      }
    }

    const slot = await prisma.timetable.create({
      data: {
        id: randomUUID(),
        courseId: section.courseId,
        classSectionId: sectionId,
        subjectId,
        teacherId: resolvedTeacherId,
        dayOfWeek: dayOfWeek as DayOfWeek,
        startTime,
        endTime,
        roomNumber: roomNumber?.trim() || 'Room 101',
        academicYear: '2026-2027',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        Subject: true,
        User: true,
        ClassSection: true,
        Course: true
      }
    });

    res.status(201).json({ data: mapTimetable(slot) });
  } catch (err) {
    next(err);
  }
});

timetableRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id') || rawId;

    const existing = await prisma.timetable.findUnique({
      where: { id },
      include: { ClassSection: true }
    });
    if (!existing) {
      return res.status(404).json({ title: 'Not Found', detail: 'Timetable slot not found.' });
    }

    const { sectionId, subjectId, teacherId, dayOfWeek, startTime, endTime, roomNumber } = req.body;

    const newSectionId = sectionId || existing.classSectionId;
    const newDayOfWeek = (dayOfWeek as DayOfWeek) || existing.dayOfWeek;
    const newStartTime = startTime || existing.startTime;
    const newEndTime = endTime || existing.endTime;
    const newRoomNumber = roomNumber !== undefined ? roomNumber : existing.roomNumber;

    let newTeacherId = existing.teacherId;
    if (teacherId) {
      const resolved = await resolveTeacherUserId(teacherId);
      if (resolved) newTeacherId = resolved;
    }

    const startMins = parseTimeToMinutes(newStartTime);
    const endMins = parseTimeToMinutes(newEndTime);
    if (startMins >= endMins) {
      return res.status(400).json({
        title: 'Invalid Time',
        detail: `Period start time (${newStartTime}) must be earlier than end time (${newEndTime}).`
      });
    }

    // Check conflicts excluding current slot
    const existingDaySlots = await prisma.timetable.findMany({
      where: {
        dayOfWeek: newDayOfWeek,
        NOT: { id }
      },
      include: {
        User: true,
        ClassSection: true,
        Subject: true
      }
    });

    for (const slot of existingDaySlots) {
      if (doIntervalsOverlap(newStartTime, newEndTime, slot.startTime, slot.endTime)) {
        if (slot.teacherId === newTeacherId) {
          const teacherName = slot.User ? `${slot.User.firstName} ${slot.User.lastName || ''}`.trim() : 'The teacher';
          const secName = slot.ClassSection?.name || 'another section';
          return res.status(400).json({
            title: 'Teacher Schedule Conflict',
            detail: `Teacher ${teacherName} is already assigned to Section ${secName} during this period (${slot.startTime} - ${slot.endTime}).`
          });
        }

        if (slot.classSectionId && newSectionId && slot.classSectionId === newSectionId) {
          const subjName = slot.Subject?.name || 'another subject';
          return res.status(400).json({
            title: 'Section Schedule Conflict',
            detail: `This section already has ${subjName} scheduled at this time (${slot.startTime} - ${slot.endTime}).`
          });
        }

        if (newRoomNumber && slot.roomNumber && newRoomNumber.trim().toLowerCase() === slot.roomNumber.trim().toLowerCase()) {
          const subjName = slot.Subject?.name || 'another class';
          return res.status(400).json({
            title: 'Room Occupied Conflict',
            detail: `Room ${newRoomNumber} is already occupied by ${subjName} during this period (${slot.startTime} - ${slot.endTime}).`
          });
        }
      }
    }

    const updated = await prisma.timetable.update({
      where: { id },
      data: {
        ...(sectionId && { classSectionId: sectionId }),
        ...(subjectId && { subjectId }),
        teacherId: newTeacherId,
        dayOfWeek: newDayOfWeek,
        startTime: newStartTime,
        endTime: newEndTime,
        ...(roomNumber !== undefined && { roomNumber: roomNumber.trim() }),
        updatedAt: new Date()
      },
      include: {
        Subject: true,
        User: true,
        ClassSection: true,
        Course: true
      }
    });

    res.json({ data: mapTimetable(updated) });
  } catch (err) {
    next(err);
  }
});

timetableRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id') || rawId;
    await prisma.timetable.delete({ where: { id } });
    res.json({ data: { message: 'Timetable slot deleted successfully.' } });
  } catch (err) {
    next(err);
  }
});
