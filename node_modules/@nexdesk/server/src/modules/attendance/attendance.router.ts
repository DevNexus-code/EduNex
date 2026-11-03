import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma, AttendanceStatus } from '../../common/db/prisma.js';
import { authenticate } from '../../common/middleware/auth.js';
import { validateDatabaseId, normalizeOptionalString } from '../../common/utils/query-validators.js';

export const attendanceRouter = Router();

attendanceRouter.use(authenticate);

// --- STUDENT ATTENDANCE ---
attendanceRouter.get('/students', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sectionId = validateDatabaseId(req.query.sectionId, 'sectionId');
    const courseId = validateDatabaseId(req.query.courseId, 'courseId');
    const departmentId = validateDatabaseId(req.query.departmentId, 'departmentId');
    const dateStr = normalizeOptionalString(req.query.date);
    const targetDate = dateStr ? new Date(dateStr) : new Date();

    const studentWhere: any = {};
    if (sectionId) studentWhere.classSectionId = sectionId;
    if (courseId) studentWhere.courseId = courseId;
    if (departmentId) studentWhere.departmentId = departmentId;

    const where: any = {
      date: targetDate,
      ...(sectionId && { classSectionId: sectionId })
    };
    if (Object.keys(studentWhere).length > 0) {
      where.Student = studentWhere;
    }

    const records = await prisma.studentAttendance.findMany({
      where,
      include: {
        Student: {
          include: { User: true }
        }
      }
    });

    res.json({
      data: records.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        sectionId: r.classSectionId,
        date: r.date.toISOString().split('T')[0],
        status: r.status,
        remarks: r.remarks,
        recordedById: r.markedById,
        createdAt: r.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/attendance/export
 * Exports student attendance records to CSV.
 */
attendanceRouter.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sectionId = validateDatabaseId(req.query.sectionId, 'sectionId');
    const courseId = validateDatabaseId(req.query.courseId, 'courseId');
    const departmentId = validateDatabaseId(req.query.departmentId, 'departmentId');
    const dateStr = normalizeOptionalString(req.query.date);
    const targetDate = dateStr ? new Date(dateStr) : undefined;

    const studentWhere: any = {};
    if (sectionId) studentWhere.classSectionId = sectionId;
    if (courseId) studentWhere.courseId = courseId;
    if (departmentId) studentWhere.departmentId = departmentId;

    const where: any = {};
    if (targetDate) where.date = targetDate;
    if (Object.keys(studentWhere).length > 0) where.Student = studentWhere;

    const records = await prisma.studentAttendance.findMany({
      where,
      include: {
        Student: {
          include: {
            User: true,
            Department: true,
            Course: true,
            ClassSection: true
          }
        },
        User: true
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });

    const headers = [
      'Student ID',
      'Student Name',
      'Admission / Roll No',
      'Department',
      'Course',
      'Section',
      'Date',
      'Status',
      'Remarks',
      'Marked By'
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      let clean = String(str).replace(/"/g, '""');
      if (/^[=\+\-\@\t\r]/.test(clean)) {
        clean = `'${clean}`;
      }
      return `"${clean}"`;
    };

    const rows = records.map((r) => [
      escapeCsv(r.Student?.studentId || ''),
      escapeCsv(`${r.Student?.User?.firstName || ''} ${r.Student?.User?.lastName || ''}`.trim()),
      escapeCsv(r.Student?.admissionNumber || ''),
      escapeCsv(r.Student?.Department?.name || ''),
      escapeCsv(r.Student?.Course?.name || ''),
      escapeCsv(r.Student?.ClassSection?.name || 'Unassigned'),
      escapeCsv(r.date.toISOString().split('T')[0]),
      escapeCsv(r.status),
      escapeCsv(r.remarks || ''),
      escapeCsv(`${r.User?.firstName || 'Staff'} ${r.User?.lastName || ''}`.trim())
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const filename = `edunex-attendance-${dateStr || new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
});

attendanceRouter.post('/students/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, sectionId, attendance } = req.body;
    const targetDate = new Date(date);
    const markedById = req.user?.id || randomUUID();

    if (!Array.isArray(attendance)) {
      return res.status(400).json({ title: 'Bad Request', detail: 'Attendance list is required.' });
    }

    let count = 0;
    for (const item of attendance) {
      const existing = await prisma.studentAttendance.findFirst({
        where: {
          studentId: item.studentId,
          date: targetDate
        }
      });

      if (existing) {
        await prisma.studentAttendance.update({
          where: { id: existing.id },
          data: {
            status: item.status as AttendanceStatus,
            remarks: item.remarks || null,
            classSectionId: sectionId || existing.classSectionId,
            markedById,
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.studentAttendance.create({
          data: {
            id: randomUUID(),
            studentId: item.studentId,
            classSectionId: sectionId || null,
            date: targetDate,
            status: (item.status as AttendanceStatus) || 'PRESENT',
            remarks: item.remarks || null,
            markedById,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      count++;
    }

    res.json({ data: { count, message: `Successfully saved attendance for ${count} students.` } });
  } catch (err) {
    next(err);
  }
});

attendanceRouter.get('/students/monthly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = validateDatabaseId(req.query.studentId, 'studentId');
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await prisma.studentAttendance.findMany({
      where: {
        ...(studentId && { studentId }),
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === 'PRESENT').length;
    const absentDays = records.filter((r) => r.status === 'ABSENT').length;
    const lateDays = records.filter((r) => r.status === 'LATE').length;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    const report = {
      studentId,
      month,
      year,
      totalWorkingDays: totalDays,
      presentDays,
      absentDays,
      lateDays,
      attendancePercentage: percentage,
      records: records.map((r) => ({
        date: r.date.toISOString().split('T')[0],
        status: r.status,
        remarks: r.remarks
      }))
    };

    res.json({ data: report });
  } catch (err) {
    next(err);
  }
});

// --- STAFF ATTENDANCE ---
attendanceRouter.get('/staff', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateStr = normalizeOptionalString(req.query.date);
    const targetDate = dateStr ? new Date(dateStr) : new Date();

    const records = await prisma.staffAttendance.findMany({
      where: {
        date: targetDate
      },
      include: {
        Staff: {
          include: { User: true }
        }
      }
    });

    res.json({
      data: records.map((r) => ({
        id: r.id,
        staffId: r.staffId,
        date: r.date.toISOString().split('T')[0],
        status: r.status,
        checkInTime: r.checkInTime ? r.checkInTime.toISOString() : null,
        checkOutTime: r.checkOutTime ? r.checkOutTime.toISOString() : null,
        remarks: r.remarks,
        createdAt: r.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
});

attendanceRouter.post('/staff', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { staffId, date, status, checkInTime, checkOutTime, remarks } = req.body;
    const targetDate = new Date(date || new Date().toISOString().split('T')[0]);

    const existing = await prisma.staffAttendance.findFirst({
      where: { staffId, date: targetDate }
    });

    let record;
    if (existing) {
      record = await prisma.staffAttendance.update({
        where: { id: existing.id },
        data: {
          status: status as AttendanceStatus,
          checkInTime: checkInTime ? new Date(checkInTime) : existing.checkInTime,
          checkOutTime: checkOutTime ? new Date(checkOutTime) : existing.checkOutTime,
          remarks: remarks || existing.remarks,
          updatedAt: new Date()
        }
      });
    } else {
      record = await prisma.staffAttendance.create({
        data: {
          id: randomUUID(),
          staffId,
          date: targetDate,
          status: (status as AttendanceStatus) || 'PRESENT',
          checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
          checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
          remarks: remarks || null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    res.json({ data: record });
  } catch (err) {
    next(err);
  }
});
