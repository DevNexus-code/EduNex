import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma, DepartmentStatus, CourseType } from '../../common/db/prisma.js';
import { authenticate } from '../../common/middleware/auth.js';
import { validateDatabaseId } from '../../common/utils/query-validators.js';

export const academicsRouter = Router();

academicsRouter.use(authenticate);

// --- DEPARTMENTS ---
academicsRouter.get('/departments', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        Course: true,
        Staff: true
      },
      orderBy: { name: 'asc' }
    });
    res.json({ data: departments });
  } catch (err) {
    next(err);
  }
});

academicsRouter.post('/departments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, description, headOfDepartment, status } = req.body;
    if (!name?.trim() || !code?.trim()) {
      return res.status(400).json({ title: 'Bad Request', detail: 'Department name and unique code are required.' });
    }

    const upperCode = code.trim().toUpperCase();
    const existing = await prisma.department.findFirst({
      where: { code: upperCode }
    });
    if (existing) {
      return res.status(400).json({ title: 'Conflict', detail: `Department with code '${upperCode}' already exists.` });
    }

    const dept = await prisma.department.create({
      data: {
        id: randomUUID(),
        name: name.trim(),
        code: upperCode,
        description: description?.trim() || null,
        status: (status as DepartmentStatus) || 'ACTIVE',
        headOfDepartmentId: headOfDepartment || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    res.status(201).json({ data: dept });
  } catch (err) {
    next(err);
  }
});

academicsRouter.patch('/departments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id') || rawId;
    const { name, code, description, headOfDepartment, status } = req.body;

    if (code) {
      const upperCode = code.trim().toUpperCase();
      const existing = await prisma.department.findFirst({
        where: { code: upperCode, NOT: { id } }
      });
      if (existing) {
        return res.status(400).json({ title: 'Conflict', detail: `Department code '${upperCode}' is already in use.` });
      }
    }

    const dept = await prisma.department.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.trim().toUpperCase() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(headOfDepartment !== undefined && { headOfDepartmentId: headOfDepartment || null }),
        ...(status && { status: status as DepartmentStatus }),
        updatedAt: new Date()
      }
    });
    res.json({ data: dept });
  } catch (err) {
    next(err);
  }
});

// --- COURSES ---
academicsRouter.get('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departmentId = validateDatabaseId(req.query.departmentId, 'departmentId');
    const courses = await prisma.course.findMany({
      where: {
        ...(departmentId && { departmentId })
      },
      include: {
        Department: true,
        ClassSection: true,
        Subject: true
      },
      orderBy: { name: 'asc' }
    });
    res.json({ data: courses });
  } catch (err) {
    next(err);
  }
});

academicsRouter.post('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, type, durationYears, departmentId, description, status } = req.body;
    if (!name?.trim() || !code?.trim() || !departmentId) {
      return res.status(400).json({ title: 'Bad Request', detail: 'Course name, code, and department are required.' });
    }

    const upperCode = code.trim().toUpperCase();
    const existing = await prisma.course.findFirst({
      where: { code: upperCode }
    });
    if (existing) {
      return res.status(400).json({ title: 'Conflict', detail: `Course code '${upperCode}' already exists.` });
    }

    const course = await prisma.course.create({
      data: {
        id: randomUUID(),
        name: name.trim(),
        code: upperCode,
        type: (type as CourseType) || 'UNDERGRADUATE',
        durationYears: Number(durationYears) || 4,
        departmentId,
        description: description?.trim() || null,
        status: (status as DepartmentStatus) || 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        Department: true
      }
    });
    res.status(201).json({ data: course });
  } catch (err) {
    next(err);
  }
});

academicsRouter.patch('/courses/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id') || rawId;
    const { name, code, type, durationYears, departmentId, description, status } = req.body;

    if (code) {
      const upperCode = code.trim().toUpperCase();
      const existing = await prisma.course.findFirst({
        where: { code: upperCode, NOT: { id } }
      });
      if (existing) {
        return res.status(400).json({ title: 'Conflict', detail: `Course code '${upperCode}' is already in use.` });
      }
    }

    const course = await prisma.course.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.trim().toUpperCase() }),
        ...(type && { type: type as CourseType }),
        ...(durationYears !== undefined && { durationYears: Number(durationYears) }),
        ...(departmentId && { departmentId }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status && { status: status as DepartmentStatus }),
        updatedAt: new Date()
      },
      include: {
        Department: true
      }
    });
    res.json({ data: course });
  } catch (err) {
    next(err);
  }
});

// --- SUBJECTS ---
academicsRouter.get('/subjects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = validateDatabaseId(req.query.courseId, 'courseId');
    const subjects = await prisma.subject.findMany({
      where: {
        ...(courseId && { courseId })
      },
      include: {
        Course: true,
        User: {
          select: { id: true, firstName: true, lastName: true, email: true, staffId: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ data: subjects });
  } catch (err) {
    next(err);
  }
});

academicsRouter.post('/subjects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, courseId, semester, credits, description, teacherId, status } = req.body;
    if (!name?.trim() || !code?.trim() || !courseId) {
      return res.status(400).json({ title: 'Bad Request', detail: 'Subject name, code, and course are required.' });
    }

    const upperCode = code.trim().toUpperCase();
    const existing = await prisma.subject.findFirst({
      where: { code: upperCode }
    });
    if (existing) {
      return res.status(400).json({ title: 'Conflict', detail: `Subject code '${upperCode}' already exists.` });
    }

    const subject = await prisma.subject.create({
      data: {
        id: randomUUID(),
        name: name.trim(),
        code: upperCode,
        courseId,
        semester: Number(semester) || 1,
        credits: Number(credits) || 3,
        description: description?.trim() || null,
        teacherId: teacherId || null,
        status: (status as DepartmentStatus) || 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        Course: true,
        User: true
      }
    });
    res.status(201).json({ data: subject });
  } catch (err) {
    next(err);
  }
});

academicsRouter.patch('/subjects/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id') || rawId;
    const { name, code, semester, credits, description, teacherId, status, courseId } = req.body;

    if (code) {
      const upperCode = code.trim().toUpperCase();
      const existing = await prisma.subject.findFirst({
        where: { code: upperCode, NOT: { id } }
      });
      if (existing) {
        return res.status(400).json({ title: 'Conflict', detail: `Subject code '${upperCode}' is already in use.` });
      }
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.trim().toUpperCase() }),
        ...(courseId && { courseId }),
        ...(semester !== undefined && { semester: Number(semester) }),
        ...(credits !== undefined && { credits: Number(credits) }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(teacherId !== undefined && { teacherId: teacherId || null }),
        ...(status && { status: status as DepartmentStatus }),
        updatedAt: new Date()
      },
      include: {
        Course: true,
        User: true
      }
    });
    res.json({ data: subject });
  } catch (err) {
    next(err);
  }
});

// --- ACADEMIC YEARS ---
academicsRouter.get('/academic-years', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const years = await prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' }
    });
    res.json({ data: years });
  } catch (err) {
    next(err);
  }
});

academicsRouter.post('/academic-years', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, startDate, endDate, isCurrent } = req.body;
    if (!name?.trim() || !startDate || !endDate) {
      return res.status(400).json({ title: 'Bad Request', detail: 'Academic year name, start date, and end date are required.' });
    }

    if (isCurrent) {
      await prisma.academicYear.updateMany({
        data: { isCurrent: false }
      });
    }

    const year = await prisma.academicYear.create({
      data: {
        id: randomUUID(),
        name: name.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: Boolean(isCurrent),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    res.status(201).json({ data: year });
  } catch (err) {
    next(err);
  }
});

academicsRouter.patch('/academic-years/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id') || rawId;
    const { name, startDate, endDate, isCurrent } = req.body;

    if (isCurrent) {
      await prisma.academicYear.updateMany({
        where: { NOT: { id } },
        data: { isCurrent: false }
      });
    }

    const year = await prisma.academicYear.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(isCurrent !== undefined && { isCurrent: Boolean(isCurrent) }),
        updatedAt: new Date()
      }
    });
    res.json({ data: year });
  } catch (err) {
    next(err);
  }
});

// --- CLASS SECTIONS ---
academicsRouter.get('/sections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = validateDatabaseId(req.query.courseId, 'courseId');
    const academicYearId = validateDatabaseId(req.query.academicYearId, 'academicYearId');
    const sections = await prisma.classSection.findMany({
      where: {
        ...(courseId && { courseId }),
        ...(academicYearId && { academicYearId })
      },
      include: {
        Course: true,
        AcademicYear: true,
        User: true
      },
      orderBy: { name: 'asc' }
    });
    res.json({ data: sections });
  } catch (err) {
    next(err);
  }
});

academicsRouter.post('/sections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, courseId, academicYearId, semester, yearLevel, classTeacherId } = req.body;
    if (!name?.trim() || !courseId) {
      return res.status(400).json({ title: 'Bad Request', detail: 'Section name and Course selection are required.' });
    }

    const section = await prisma.classSection.create({
      data: {
        id: randomUUID(),
        name: name.trim(),
        courseId,
        academicYearId: academicYearId || null,
        semester: Number(semester) || 1,
        yearLevel: Number(yearLevel) || 1,
        classTeacherId: classTeacherId || null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        Course: true,
        AcademicYear: true,
        User: true
      }
    });
    res.status(201).json({ data: section });
  } catch (err) {
    next(err);
  }
});

academicsRouter.patch('/sections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id') || rawId;
    const { name, courseId, academicYearId, semester, yearLevel, classTeacherId } = req.body;

    const section = await prisma.classSection.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(courseId && { courseId }),
        ...(academicYearId !== undefined && { academicYearId: academicYearId || null }),
        ...(semester !== undefined && { semester: Number(semester) }),
        ...(yearLevel !== undefined && { yearLevel: Number(yearLevel) }),
        ...(classTeacherId !== undefined && { classTeacherId: classTeacherId || null }),
        updatedAt: new Date()
      },
      include: {
        Course: true,
        AcademicYear: true,
        User: true
      }
    });
    res.json({ data: section });
  } catch (err) {
    next(err);
  }
});
