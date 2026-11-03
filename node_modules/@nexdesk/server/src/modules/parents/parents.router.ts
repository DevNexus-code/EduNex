import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../../common/db/prisma.js';
import { store } from '../../common/db/store.js';
import { authenticate, requireRole } from '../../common/middleware/auth.js';
import { validateAndNormalizePhone } from '../../common/utils/phone.js';
import { generateParentId, generateTemporaryPassword } from '../../common/utils/id-generator.js';
import { hashPassword } from '../../common/utils/password.js';

export const parentsRouter = Router();

// All parent management routes require authentication
parentsRouter.use(authenticate);

function getParentWhere(rawId: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawId);
  return isUuid ? { id: rawId } : { parentId: rawId };
}

// --- PARENT PORTAL ENDPOINTS (for logged-in parents) ---

/**
 * GET /api/v1/parents/portal/my-children
 * Returns all students linked to the authenticated parent.
 */
parentsRouter.get('/portal/my-children', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized session.' });
    }

    let parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: user.id },
      include: {
        Student: {
          include: {
            User: true,
            Course: true,
            Department: true,
            ClassSection: true
          }
        }
      }
    });

    // If super admin/admin viewing portal without parent profile, return sample or empty
    if (!parentProfile && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) {
      // Find first parent profile as preview
      parentProfile = await prisma.parentProfile.findFirst({
        include: {
          Student: {
            include: {
              User: true,
              Course: true,
              Department: true,
              ClassSection: true
            }
          }
        }
      });
    }

    if (!parentProfile) {
      return res.json({
        data: {
          parent: {
            id: user.id,
            parentId: user.parentId || 'PRN-N/A',
            name: `${user.firstName} ${user.lastName || ''}`.trim(),
            email: user.email.endsWith('@internal.edunex.local') ? null : user.email,
            phone: user.phone
          },
          children: []
        }
      });
    }

    const children = parentProfile.Student.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      admissionNumber: s.admissionNumber,
      admissionDate: s.admissionDate,
      firstName: s.User.firstName,
      lastName: s.User.lastName,
      name: `${s.User.firstName} ${s.User.lastName || ''}`.trim(),
      email: s.User.email.endsWith('@internal.edunex.local') ? null : s.User.email,
      phone: s.User.phone,
      avatarUrl: s.User.avatarUrl,
      course: s.Course?.name || 'General Course',
      courseCode: s.Course?.code || '',
      department: s.Department?.name || 'General Department',
      section: s.ClassSection?.name || 'Unassigned',
      semester: s.currentSemester,
      academicYear: s.academicYear,
      status: s.status,
      dateOfBirth: s.User.dateOfBirth
    }));

    res.json({
      data: {
        parent: {
          id: parentProfile.id,
          parentId: parentProfile.parentId || user.parentId || 'PRN-N/A',
          name: `${user.firstName} ${user.lastName || ''}`.trim(),
          relation: parentProfile.relation,
          occupation: parentProfile.occupation,
          email: user.email.endsWith('@internal.edunex.local') ? null : user.email,
          phone: user.phone,
          alternatePhone: parentProfile.alternatePhone,
          emergencyPhone: parentProfile.emergencyPhone,
          address: parentProfile.address || user.address
        },
        children
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/parents/portal/child/:studentId/summary
 * Returns comprehensive academic details for a specific child of the authenticated parent.
 * Strictly verifies parent-child authorization so parents cannot view other students.
 */
parentsRouter.get('/portal/child/:studentId/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized session.' });
    }

    const rawStudentId = String(req.params.studentId).trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawStudentId);

    // Find student by UUID or by studentId code (e.g. STD-2026-0001)
    const student = await prisma.student.findFirst({
      where: isUuid
        ? { id: rawStudentId }
        : { studentId: { equals: rawStudentId, mode: 'insensitive' as const } },
      include: {
        User: true,
        Course: true,
        Department: true,
        ClassSection: true,
        ParentProfile: true
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    // Strict Authorization Isolation:
    // If the authenticated user is a PARENT, enforce that student.parentId matches the user's ParentProfile.id
    if (user.role === 'PARENT') {
      const parentProfile = await prisma.parentProfile.findUnique({
        where: { userId: user.id }
      });
      if (!parentProfile || student.parentId !== parentProfile.id) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: You are not authorized to view academic information for this student.'
        });
      }
    }

    // Parallel queries for this student's records
    const [attendanceRecords, marksRecords, feePayments, feeStructures, timetableRecords, announcements, documents] =
      await Promise.all([
        prisma.studentAttendance.findMany({
          where: { studentId: student.id },
          include: { Subject: true },
          orderBy: { date: 'desc' },
          take: 30
        }),
        prisma.studentMark.findMany({
          where: { studentId: student.id },
          include: {
            Examination: true,
            Subject: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.feePayment.findMany({
          where: { studentId: student.id },
          include: { FeeCategory: true },
          orderBy: { paymentDate: 'desc' }
        }),
        prisma.feeStructure.findMany({
          where: { courseId: student.courseId },
          include: { FeeCategory: true }
        }),
        student.classSectionId
          ? prisma.timetable.findMany({
              where: { classSectionId: student.classSectionId },
              include: { Subject: true, User: true },
              orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
            })
          : [],
        prisma.announcement.findMany({
          where: {
            OR: [
              { targetAudience: 'ALL' },
              { targetAudience: 'PARENTS' },
              { targetAudience: 'STUDENTS' },
              { departmentId: student.departmentId }
            ]
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }),
        prisma.document.findMany({
          where: { studentId: student.id },
          orderBy: { createdAt: 'desc' }
        })
      ]);

    // Compute attendance statistics
    const totalAttendanceSessions = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
    const absentCount = attendanceRecords.filter((a) => a.status === 'ABSENT').length;
    const attendanceRate = totalAttendanceSessions > 0
      ? Math.round((presentCount / totalAttendanceSessions) * 100)
      : 100;

    // Compute fee totals
    const totalFeeAmount = feeStructures.reduce((acc, curr) => acc + curr.amount, 0);
    const totalFeePaid = feePayments.reduce((acc, curr) => acc + curr.amountPaid, 0);
    const balanceDue = Math.max(0, totalFeeAmount - totalFeePaid);

    const metrics = {
      attendanceRate,
      totalAttendanceSessions,
      presentCount,
      absentCount,
      totalFeeAmount,
      totalFeePaid,
      balanceDue
    };

    res.json({
      data: {
        student: {
          id: student.id,
          studentId: student.studentId,
          admissionNumber: student.admissionNumber,
          admissionDate: student.admissionDate,
          name: `${student.User.firstName} ${student.User.lastName || ''}`.trim(),
          email: student.User.email.endsWith('@internal.edunex.local') ? null : student.User.email,
          phone: student.User.phone,
          course: student.Course?.name,
          courseCode: student.Course?.code,
          department: student.Department?.name,
          section: student.ClassSection?.name,
          semester: student.currentSemester,
          academicYear: student.academicYear,
          status: student.status,
          dateOfBirth: student.User.dateOfBirth,
          bloodGroup: student.User.bloodGroup,
          parentName: student.parentName,
          parentPhone: student.parentPhone
        },
        metrics,
        attendance: attendanceRecords.map((a) => ({
          id: a.id,
          studentId: a.studentId,
          date: a.date,
          status: a.status,
          subject: a.Subject?.name || 'General Session',
          subjectId: a.subjectId,
          Subject: a.Subject,
          remarks: a.remarks
        })),
        marks: marksRecords.map((m) => ({
          id: m.id,
          examName: m.Examination?.name || 'Academic Assessment',
          subject: m.Subject?.name || 'Subject',
          subjectCode: m.Subject?.code || '',
          Subject: m.Subject,
          Examination: m.Examination,
          marksObtained: m.marksObtained,
          maxMarks: m.maxMarks,
          percentage: m.maxMarks > 0 ? Math.round((m.marksObtained / m.maxMarks) * 100) : 0,
          grade: m.grade,
          isPassed: m.isPassed,
          remarks: m.remarks
        })),
        feePayments: feePayments.map((p) => ({
          id: p.id,
          receiptNumber: p.receiptNumber,
          category: p.FeeCategory?.name || 'Tuition Fee',
          FeeCategory: p.FeeCategory,
          amountPaid: p.amountPaid,
          balanceDue: p.balanceDue,
          paymentDate: p.paymentDate,
          paymentMethod: p.paymentMethod,
          status: p.status
        })),
        feeStructures: feeStructures.map((f) => ({
          id: f.id,
          category: f.FeeCategory?.name || 'Tuition Fee',
          FeeCategory: f.FeeCategory,
          amount: f.amount,
          dueDate: f.dueDate
        })),
        fees: {
          totalAmount: totalFeeAmount,
          totalPaid: totalFeePaid,
          balanceDue,
          structures: feeStructures.map((f) => ({
            id: f.id,
            category: f.FeeCategory?.name || 'Tuition Fee',
            amount: f.amount,
            dueDate: f.dueDate
          })),
          payments: feePayments.map((p) => ({
            id: p.id,
            receiptNumber: p.receiptNumber,
            category: p.FeeCategory?.name || 'Tuition Fee',
            amountPaid: p.amountPaid,
            balanceDue: p.balanceDue,
            paymentDate: p.paymentDate,
            paymentMethod: p.paymentMethod,
            status: p.status
          }))
        },
        timetable: timetableRecords.map((t) => ({
          id: t.id,
          dayOfWeek: t.dayOfWeek,
          startTime: t.startTime,
          endTime: t.endTime,
          subject: t.Subject?.name,
          Subject: t.Subject,
          room: t.roomNumber,
          teacher: t.User ? `${t.User.firstName} ${t.User.lastName || ''}`.trim() : 'Instructor'
        })),
        announcements: announcements.map((an) => ({
          id: an.id,
          title: an.title,
          content: an.content,
          priority: an.priority,
          createdAt: an.createdAt
        })),
        documents: documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          type: doc.type,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          createdAt: doc.createdAt
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

// --- ADMINISTRATIVE PARENT MANAGEMENT ENDPOINTS ---

/**
 * GET /api/v1/parents
 * Lists all registered parents with linked students.
 * Accessible to ADMIN, SUPER_ADMIN, and PRINCIPAL.
 */
parentsRouter.get('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawSearch = req.query.search ? String(req.query.search).trim() : '';
    const rawStatus = req.query.status ? String(req.query.status).trim() : '';

    const where: any = {};

    if (rawStatus === 'ACTIVE') {
      where.User = { isActive: true };
    } else if (rawStatus === 'INACTIVE') {
      where.User = { isActive: false };
    }

    if (rawSearch) {
      where.OR = [
        { parentId: { contains: rawSearch, mode: 'insensitive' } },
        { occupation: { contains: rawSearch, mode: 'insensitive' } },
        {
          User: {
            OR: [
              { firstName: { contains: rawSearch, mode: 'insensitive' } },
              { lastName: { contains: rawSearch, mode: 'insensitive' } },
              { email: { contains: rawSearch, mode: 'insensitive' } },
              { phone: { contains: rawSearch } }
            ]
          }
        },
        {
          Student: {
            some: {
              OR: [
                { studentId: { contains: rawSearch, mode: 'insensitive' } },
                { admissionNumber: { contains: rawSearch, mode: 'insensitive' } },
                {
                  User: {
                    OR: [
                      { firstName: { contains: rawSearch, mode: 'insensitive' } },
                      { lastName: { contains: rawSearch, mode: 'insensitive' } }
                    ]
                  }
                }
              ]
            }
          }
        }
      ];
    }

    const parents = await prisma.parentProfile.findMany({
      where,
      include: {
        User: true,
        Student: {
          include: {
            User: true,
            Course: true,
            ClassSection: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = parents.map((p) => ({
      id: p.id,
      parentId: p.parentId || p.User.parentId || 'PRN-N/A',
      userId: p.userId,
      name: `${p.User.firstName} ${p.User.lastName || ''}`.trim(),
      firstName: p.User.firstName,
      lastName: p.User.lastName,
      email: p.User.email.endsWith('@internal.edunex.local') ? null : p.User.email,
      phone: p.User.phone,
      alternatePhone: p.alternatePhone,
      emergencyPhone: p.emergencyPhone,
      relation: p.relation || 'Guardian',
      occupation: p.occupation || 'N/A',
      address: p.address || p.User.address,
      isActive: p.User.isActive,
      mustChangePassword: p.User.mustChangePassword,
      lastLoginAt: p.User.lastLoginAt,
      createdAt: p.createdAt,
      childrenCount: p.Student.length,
      students: p.Student.map((s: any) => ({
        id: s.id,
        studentId: s.studentId,
        admissionNumber: s.admissionNumber,
        name: `${s.User.firstName} ${s.User.lastName || ''}`.trim(),
        course: s.Course?.name || 'Course',
        section: s.ClassSection?.name || '',
        status: s.status
      }))
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/parents/:id
 * Retrieve a single parent profile with all details.
 */
parentsRouter.get('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = String(req.params.id);
    const parent = await prisma.parentProfile.findFirst({
      where: getParentWhere(rawId),
      include: {
        User: true,
        Student: {
          include: {
            User: true,
            Course: true,
            Department: true,
            ClassSection: true
          }
        }
      }
    });

    if (!parent) {
      return res.status(404).json({ success: false, message: 'Parent record not found.' });
    }

    res.json({
      data: {
        id: parent.id,
        parentId: parent.parentId || parent.User.parentId || 'PRN-N/A',
        userId: parent.userId,
        name: `${parent.User.firstName} ${parent.User.lastName || ''}`.trim(),
        firstName: parent.User.firstName,
        lastName: parent.User.lastName,
        email: parent.User.email.endsWith('@internal.edunex.local') ? null : parent.User.email,
        phone: parent.User.phone,
        alternatePhone: parent.alternatePhone,
        emergencyPhone: parent.emergencyPhone,
        relation: parent.relation,
        occupation: parent.occupation,
        address: parent.address || parent.User.address,
        isActive: parent.User.isActive,
        mustChangePassword: parent.User.mustChangePassword,
        lastLoginAt: parent.User.lastLoginAt,
        createdAt: parent.createdAt,
        students: parent.Student.map((s: any) => ({
          id: s.id,
          studentId: s.studentId,
          admissionNumber: s.admissionNumber,
          name: `${s.User.firstName} ${s.User.lastName || ''}`.trim(),
          course: s.Course?.name,
          section: s.ClassSection?.name,
          status: s.status
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/parents
 * Manually register a parent profile without student admission.
 */
parentsRouter.post('/', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      relation,
      occupation,
      alternatePhone,
      emergencyPhone,
      address
    } = req.body;

    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ success: false, message: 'Parent first name is required.' });
    }

    const phoneValidation = validateAndNormalizePhone(phone, true);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ success: false, message: phoneValidation.error });
    }

    // Check if parent user with this mobile already exists
    const existing = await prisma.user.findFirst({
      where: {
        role: 'PARENT',
        OR: [
          { phone: phoneValidation.canonical },
          { phone: phoneValidation.national },
          ...(email ? [{ email: email.toLowerCase() }] : [])
        ]
      },
      include: { ParentProfile: true }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A parent account with this mobile number already exists (Parent ID: ${existing.parentId || 'PRN-EXISTING'}).`
      });
    }

    const parentIdStr = await generateParentId();
    const tempCred = generateTemporaryPassword(null);
    const passHash = await hashPassword(tempCred.password);
    const safeEmail = email ? email.toLowerCase() : `parent.${parentIdStr.toLowerCase()}@internal.edunex.local`;

    const result = await prisma.$transaction(async (tx) => {
      const parentUserId = randomUUID();
      const user = await tx.user.create({
        data: {
          id: parentUserId,
          email: safeEmail,
          passwordHash: passHash,
          firstName: firstName.trim(),
          lastName: (lastName || '').trim(),
          role: 'PARENT',
          phone: phoneValidation.canonical,
          parentId: parentIdStr,
          mustChangePassword: true,
          address: address || null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const profile = await tx.parentProfile.create({
        data: {
          id: randomUUID(),
          userId: parentUserId,
          parentId: parentIdStr,
          occupation: occupation || null,
          relation: relation || 'Guardian',
          alternatePhone: alternatePhone || null,
          emergencyPhone: emergencyPhone || null,
          address: address || null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      return { user, profile };
    });

    res.status(201).json({
      success: true,
      data: {
        id: result.profile.id,
        parentId: parentIdStr,
        name: `${result.user.firstName} ${result.user.lastName}`.trim(),
        phone: result.user.phone,
        email: email || null
      },
      credentials: {
        parentId: parentIdStr,
        temporaryPassword: tempCred.password,
        policyNote: tempCred.policyNote
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/parents/:id
 * Updates permitted parent details.
 */
parentsRouter.patch('/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = String(req.params.id);
    const parentProfile = await prisma.parentProfile.findFirst({
      where: getParentWhere(rawId),
      include: { User: true }
    });

    if (!parentProfile) {
      return res.status(404).json({ success: false, message: 'Parent record not found.' });
    }

    const {
      firstName,
      lastName,
      phone,
      email,
      occupation,
      relation,
      alternatePhone,
      emergencyPhone,
      address,
      isActive
    } = req.body;

    let canonicalPhone: string | undefined = undefined;
    if (phone !== undefined) {
      const pRes = validateAndNormalizePhone(phone, true);
      if (!pRes.isValid) {
        return res.status(400).json({ success: false, message: pRes.error });
      }
      canonicalPhone = pRes.canonical!;
    }

    await prisma.$transaction(async (tx) => {
      // Update User
      await tx.user.update({
        where: { id: parentProfile.userId },
        data: {
          ...(firstName !== undefined && { firstName: firstName.trim() }),
          ...(lastName !== undefined && { lastName: lastName.trim() }),
          ...(canonicalPhone !== undefined && { phone: canonicalPhone }),
          ...(email !== undefined && email && { email: email.toLowerCase() }),
          ...(address !== undefined && { address }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          updatedAt: new Date()
        }
      });

      // Update ParentProfile
      await tx.parentProfile.update({
        where: { id: parentProfile.id },
        data: {
          ...(occupation !== undefined && { occupation }),
          ...(relation !== undefined && { relation }),
          ...(alternatePhone !== undefined && { alternatePhone }),
          ...(emergencyPhone !== undefined && { emergencyPhone }),
          ...(address !== undefined && { address }),
          updatedAt: new Date()
        }
      });
    });

    res.json({ success: true, message: 'Parent profile updated successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/parents/:id/reset-password
 * Generates a new secure temporary password for the parent.
 */
parentsRouter.post('/:id/reset-password', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = String(req.params.id);
    const parentProfile = await prisma.parentProfile.findFirst({
      where: getParentWhere(rawId),
      include: { User: true }
    });

    if (!parentProfile) {
      return res.status(404).json({ success: false, message: 'Parent record not found.' });
    }

    const tempCred = generateTemporaryPassword(null);
    const passHash = await hashPassword(tempCred.password);

    const updatedUser = await prisma.user.update({
      where: { id: parentProfile.userId },
      data: {
        passwordHash: passHash,
        mustChangePassword: true,
        updatedAt: new Date()
      }
    });
    store.refreshUser(updatedUser);

    res.json({
      success: true,
      message: 'Temporary password generated successfully.',
      data: {
        parentId: parentProfile.parentId || parentProfile.User.parentId,
        parentName: `${parentProfile.User.firstName} ${parentProfile.User.lastName || ''}`.trim(),
        temporaryPassword: tempCred.password,
        policyNote: tempCred.policyNote
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/parents/:id/link-student
 * Links an existing student to this parent.
 */
parentsRouter.post('/:id/link-student', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawParentId = String(req.params.id);
    const { studentIdentifier } = req.body;

    if (!studentIdentifier || !String(studentIdentifier).trim()) {
      return res.status(400).json({ success: false, message: 'Student ID or Admission Number is required.' });
    }

    const parentProfile = await prisma.parentProfile.findFirst({
      where: getParentWhere(rawParentId),
      include: { User: true }
    });

    if (!parentProfile) {
      return res.status(404).json({ success: false, message: 'Parent record not found.' });
    }

    const trimmed = String(studentIdentifier).trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);
    const student = await prisma.student.findFirst({
      where: isUuid
        ? { id: trimmed }
        : {
            OR: [
              { studentId: { equals: trimmed, mode: 'insensitive' as const } },
              { admissionNumber: { equals: trimmed, mode: 'insensitive' as const } }
            ]
          },
      include: { User: true }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: `Student '${trimmed}' not found.` });
    }

    await prisma.student.update({
      where: { id: student.id },
      data: {
        parentId: parentProfile.id,
        parentName: `${parentProfile.User.firstName} ${parentProfile.User.lastName || ''}`.trim(),
        parentPhone: parentProfile.User.phone,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: `Successfully linked student ${student.User.firstName} (${student.studentId}) to Parent ${parentProfile.parentId || parentProfile.User.firstName}.`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/parents/:id/unlink-student
 * Unlinks a student from this parent.
 */
parentsRouter.post('/:id/unlink-student', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    await prisma.student.update({
      where: { id: student.id },
      data: {
        parentId: null,
        updatedAt: new Date()
      }
    });

    res.json({ success: true, message: 'Student unlinked from parent successfully.' });
  } catch (err) {
    next(err);
  }
});
