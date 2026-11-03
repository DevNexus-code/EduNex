import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma, ExamStatus } from '../../common/db/prisma.js';
import { authenticate } from '../../common/middleware/auth.js';

export const examinationsRouter = Router();

examinationsRouter.use(authenticate);

function calculateGrade(marks: number, maxMarks: number = 100): { grade: string; isPassed: boolean } {
  const percentage = (marks / maxMarks) * 100;
  if (percentage >= 90) return { grade: 'A+', isPassed: true };
  if (percentage >= 80) return { grade: 'A', isPassed: true };
  if (percentage >= 70) return { grade: 'B', isPassed: true };
  if (percentage >= 60) return { grade: 'C', isPassed: true };
  if (percentage >= 40) return { grade: 'D', isPassed: true };
  return { grade: 'F', isPassed: false };
}

examinationsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const exams = await prisma.examination.findMany({
      include: {
        Course: true,
        ExaminationSubject: {
          include: { Subject: true }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    res.json({
      data: exams.map((e) => ({
        id: e.id,
        title: e.name,
        academicYearId: e.academicYear,
        academicYear: { name: e.academicYear },
        courseId: e.courseId,
        course: e.Course,
        startDate: e.startDate.toISOString().split('T')[0],
        endDate: e.endDate.toISOString().split('T')[0],
        status: e.status,
        subjects: e.ExaminationSubject.map((es) => ({
          id: es.id,
          examinationId: es.examinationId,
          subjectId: es.subjectId,
          subject: es.Subject,
          examDate: es.examDate.toISOString().split('T')[0],
          maxMarks: es.maxMarks,
          passingMarks: es.passingMarks,
          roomNumber: es.roomNumber
        })),
        createdAt: e.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
});

examinationsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, academicYearId, courseId, startDate, endDate } = req.body;

    let targetCourseId = courseId;
    if (!targetCourseId) {
      const firstCourse = await prisma.course.findFirst();
      targetCourseId = firstCourse?.id || randomUUID();
    }

    const exam = await prisma.examination.create({
      data: {
        id: randomUUID(),
        name: title,
        academicYear: academicYearId || '2025-2026',
        courseId: targetCourseId,
        semester: 1,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'SCHEDULED' as ExamStatus,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        Course: true,
        ExaminationSubject: true
      }
    });

    res.status(201).json({
      data: {
        id: exam.id,
        title: exam.name,
        academicYearId: exam.academicYear,
        academicYear: { name: exam.academicYear },
        startDate: exam.startDate.toISOString().split('T')[0],
        endDate: exam.endDate.toISOString().split('T')[0],
        status: exam.status,
        subjects: [],
        createdAt: exam.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

examinationsRouter.post('/:id/subjects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { subjectId, examDate, maxMarks, passingMarks, roomNumber } = req.body;

    const paper = await prisma.examinationSubject.create({
      data: {
        id: randomUUID(),
        examinationId: id,
        subjectId,
        examDate: new Date(examDate),
        startTime: '09:00',
        endTime: '12:00',
        maxMarks: Number(maxMarks) || 100,
        passingMarks: Number(passingMarks) || 40,
        roomNumber: roomNumber || 'Hall 1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        Subject: true
      }
    });

    res.status(201).json({ data: paper });
  } catch (err) {
    next(err);
  }
});

examinationsRouter.post('/marks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { examinationId, subjectId, marks } = req.body;
    const enteredById = req.user?.id || randomUUID();

    if (!Array.isArray(marks)) {
      return res.status(400).json({ title: 'Bad Request', detail: 'Marks array required.' });
    }

    let count = 0;
    for (const m of marks) {
      const maxMarks = Number(m.maxMarks) || 100;
      const marksObtained = Number(m.marksObtained);
      const { grade, isPassed } = calculateGrade(marksObtained, maxMarks);

      const existing = await prisma.studentMark.findFirst({
        where: {
          examinationId,
          subjectId,
          studentId: m.studentId
        }
      });

      if (existing) {
        await prisma.studentMark.update({
          where: { id: existing.id },
          data: {
            marksObtained,
            maxMarks,
            grade,
            isPassed,
            remarks: m.remarks || null,
            enteredById,
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.studentMark.create({
          data: {
            id: randomUUID(),
            examinationId,
            subjectId,
            studentId: m.studentId,
            marksObtained,
            maxMarks,
            grade,
            isPassed,
            remarks: m.remarks || null,
            enteredById,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      count++;
    }

    res.json({ data: { count, message: `Successfully recorded marks for ${count} students.` } });
  } catch (err) {
    next(err);
  }
});

examinationsRouter.get('/results', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await prisma.studentMark.findMany({
      include: {
        Student: {
          include: { User: true }
        },
        Subject: true,
        Examination: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      data: results.map((r) => ({
        id: r.id,
        examSubjectId: r.examinationId,
        studentId: r.studentId,
        student: {
          id: r.Student.id,
          studentId: r.Student.studentId,
          firstName: r.Student.User?.firstName || '',
          lastName: r.Student.User?.lastName || '',
          email: r.Student.User?.email || ''
        },
        examSubject: {
          subject: r.Subject,
          examination: { title: r.Examination.name }
        },
        marksObtained: r.marksObtained,
        grade: r.grade,
        isPassed: r.isPassed,
        remarks: r.remarks,
        createdAt: r.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
});
