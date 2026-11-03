import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../../common/db/prisma.js';
import { authenticate } from '../../common/middleware/auth.js';
import {
  validateDatabaseId,
  validateStaffCategory,
  validateStaffStatus,
  validateSearch
} from '../../common/utils/query-validators.js';
import { firebaseAdmin } from '../../common/firebase/admin.js';
import { activationService } from '../../common/services/activation.service.js';
import { emailService } from '../../common/email/email.service.js';

export const staffRouter = Router();

staffRouter.use(authenticate);

function mapStaff(s: any) {
  const assignedSubjects = (s.User?.Subject || []).map((sub: any) => ({
    id: sub.id,
    name: sub.name,
    code: sub.code,
    semester: sub.semester,
    credits: sub.credits,
    courseId: sub.courseId,
    course: sub.Course ? { id: sub.Course.id, name: sub.Course.name, code: sub.Course.code } : null
  }));

  return {
    id: s.id,
    staffId: s.staffId,
    userId: s.userId,
    firstName: s.User?.firstName || '',
    lastName: s.User?.lastName || '',
    email: s.User?.email || '',
    phone: s.User?.phone || null,
    category: s.category,
    departmentId: s.departmentId,
    department: s.Department || null,
    designation: s.designation,
    qualification: s.qualification || null,
    employmentType: s.employmentType,
    joiningDate: s.joiningDate ? s.joiningDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: s.status,
    address: s.User?.address || null,
    city: s.User?.city || null,
    assignedSubjects,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  };
}

staffRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = validateStaffCategory(req.query.category);
    const departmentId = validateDatabaseId(req.query.departmentId, 'departmentId');
    const status = validateStaffStatus(req.query.status);
    const search = validateSearch(req.query.search);

    const where: any = {};
    if (category) where.category = category;
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { staffId: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { User: { firstName: { contains: search, mode: 'insensitive' } } },
        { User: { lastName: { contains: search, mode: 'insensitive' } } },
        { User: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const staffList = await prisma.staff.findMany({
      where,
      include: {
        User: {
          include: {
            Subject: {
              include: { Course: true }
            }
          }
        },
        Department: true
      },
      orderBy: { joiningDate: 'desc' }
    });

    res.json({ data: staffList.map(mapStaff) });
  } catch (err) {
    next(err);
  }
});

staffRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id');
    if (!id) {
      return res.status(404).json({ title: 'Not Found', detail: 'Staff record not found.' });
    }

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        User: {
          include: {
            Subject: {
              include: { Course: true }
            }
          }
        },
        Department: true
      }
    });

    if (!staff) {
      return res.status(404).json({ title: 'Not Found', detail: 'Staff record not found.' });
    }

    res.json({ data: mapStaff(staff) });
  } catch (err) {
    next(err);
  }
});

staffRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      category,
      departmentId,
      designation,
      qualification,
      employmentType,
      joiningDate,
      address,
      city,
      status
    } = req.body;

    const validatedCategory = category ? validateStaffCategory(category) : 'TEACHING';
    const validatedStatus = status ? validateStaffStatus(status) : 'ACTIVE';
    const validatedDepartmentId = departmentId ? validateDatabaseId(departmentId, 'departmentId') : null;

    const year = new Date().getFullYear();
    const count = await prisma.staff.count();
    const seq = String(count + 1).padStart(4, '0');
    const staffId = `STF-${year}-${seq}`;

    // Create user record
    const userId = randomUUID();
    const userRole = validatedCategory === 'TEACHING' ? 'TEACHER' : 'STAFF';

    let firebaseUid: string | null = null;
    try {
      const fbRecord = await firebaseAdmin.createUser({
        email: email.toLowerCase(),
        displayName: `${firstName} ${lastName}`.trim(),
        disabled: false
      });
      firebaseUid = fbRecord.uid;
    } catch {
      // Dev mode fallback or existing
    }

    await prisma.user.create({
      data: {
        id: userId,
        email: email.toLowerCase(),
        firstName,
        lastName,
        role: userRole,
        phone: phone || null,
        designation: designation || null,
        address: address || null,
        city: city || null,
        staffId,
        departmentId: validatedDepartmentId || null,
        firebaseUid,
        isActive: true,
        isEmailVerified: false,
        mustChangePassword: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    const staff = await prisma.staff.create({
      data: {
        id: randomUUID(),
        userId,
        staffId,
        departmentId: validatedDepartmentId || null,
        designation,
        category: validatedCategory || 'TEACHING',
        employmentType: employmentType || 'FULL_TIME',
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        qualification: qualification || null,
        experienceYears: 0,
        status: validatedStatus || 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        User: true,
        Department: true
      }
    });

    // Automated Account Activation Email
    let emailDeliveryStatus: 'SENT' | 'FAILED' = 'SENT';
    let activationToken: string | null = null;
    try {
      activationToken = await activationService.createActivationToken(userId, email.toLowerCase(), 72);
      const delivery = await emailService.sendAccountActivationEmail({
        to: email.toLowerCase(),
        userId,
        name: `${firstName} ${lastName}`.trim(),
        loginId: staffId,
        role: userRole,
        activationToken,
        expiresHours: 72
      });
      emailDeliveryStatus = delivery.success ? 'SENT' : 'FAILED';
    } catch {
      emailDeliveryStatus = 'FAILED';
    }

    res.status(201).json({
      data: {
        ...mapStaff(staff),
        activationToken,
        emailDeliveryStatus
      }
    });
  } catch (err) {
    next(err);
  }
});

staffRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id');
    if (!id) {
      return res.status(404).json({ title: 'Not Found', detail: 'Staff record not found.' });
    }

    const {
      firstName,
      lastName,
      phone,
      designation,
      qualification,
      employmentType,
      category,
      status,
      departmentId,
      address,
      city
    } = req.body;

    const validatedCategory = category ? validateStaffCategory(category) : undefined;
    const validatedStatus = status ? validateStaffStatus(status) : undefined;
    const validatedDepartmentId = departmentId !== undefined ? (departmentId ? validateDatabaseId(departmentId, 'departmentId') : null) : undefined;

    const existing = await prisma.staff.findUnique({
      where: { id },
      include: { User: true }
    });

    if (!existing) {
      return res.status(404).json({ title: 'Not Found', detail: 'Staff record not found.' });
    }

    if (existing.userId) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phone !== undefined && { phone }),
          ...(designation !== undefined && { designation }),
          ...(address !== undefined && { address }),
          ...(city !== undefined && { city }),
          ...(validatedCategory && { role: validatedCategory === 'TEACHING' ? 'TEACHER' : 'STAFF' }),
          ...(validatedDepartmentId !== undefined && { departmentId: validatedDepartmentId }),
          updatedAt: new Date()
        }
      });
    }

    const updated = await prisma.staff.update({
      where: { id },
      data: {
        ...(designation && { designation }),
        ...(qualification !== undefined && { qualification }),
        ...(employmentType && { employmentType }),
        ...(validatedCategory && { category: validatedCategory }),
        ...(validatedStatus && { status: validatedStatus }),
        ...(validatedDepartmentId !== undefined && { departmentId: validatedDepartmentId }),
        updatedAt: new Date()
      },
      include: {
        User: {
          include: {
            Subject: {
              include: { Course: true }
            }
          }
        },
        Department: true
      }
    });

    res.json({ data: mapStaff(updated) });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/staff/:id/subjects
 * Assigns or reassigns syllabus subjects to this faculty member.
 */
staffRouter.put('/:id/subjects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id') || rawId;
    const { subjectIds } = req.body;

    if (!Array.isArray(subjectIds)) {
      return res.status(400).json({ title: 'Bad Request', detail: 'subjectIds must be an array of subject IDs.' });
    }

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: { User: true }
    });

    if (!staff || !staff.userId) {
      return res.status(404).json({ title: 'Not Found', detail: 'Staff record not found.' });
    }

    await prisma.$transaction(async (tx) => {
      // Unassign subjects currently held by this teacher
      await tx.subject.updateMany({
        where: { teacherId: staff.userId },
        data: { teacherId: null }
      });

      // Assign the new subjects
      if (subjectIds.length > 0) {
        await tx.subject.updateMany({
          where: { id: { in: subjectIds } },
          data: { teacherId: staff.userId }
        });
      }
    });

    const updated = await prisma.staff.findUnique({
      where: { id },
      include: {
        User: {
          include: {
            Subject: {
              include: { Course: true }
            }
          }
        },
        Department: true
      }
    });

    res.json({ data: mapStaff(updated) });
  } catch (err) {
    next(err);
  }
});

staffRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id');
    if (!id) {
      return res.status(404).json({ title: 'Not Found', detail: 'Staff record not found.' });
    }

    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ title: 'Not Found', detail: 'Staff record not found.' });
    }

    await prisma.staff.delete({ where: { id } });
    if (existing.userId) {
      await prisma.user.delete({ where: { id: existing.userId } });
    }

    res.json({ data: { message: 'Staff record deleted successfully.' } });
  } catch (err) {
    next(err);
  }
});
