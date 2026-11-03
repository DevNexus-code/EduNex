import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../../common/db/prisma.js';
import { store } from '../../common/db/store.js';
import { authenticate } from '../../common/middleware/auth.js';
import {
  validateDatabaseId,
  validateStudentStatus,
  validateSearch
} from '../../common/utils/query-validators.js';
import { validateAndNormalizePhone } from '../../common/utils/phone.js';
import {
  generateStudentId,
  generateAdmissionNumber,
  generateParentId,
  generateTemporaryPassword
} from '../../common/utils/id-generator.js';
import { hashPassword } from '../../common/utils/password.js';
import { emailService } from '../../common/email/email.service.js';
import { activationService } from '../../common/services/activation.service.js';

export const studentsRouter = Router();

studentsRouter.use(authenticate);

function mapStudent(s: any) {
  return {
    id: s.id,
    studentId: s.studentId,
    admissionNumber: s.admissionNumber,
    userId: s.userId,
    firstName: s.User?.firstName || '',
    lastName: s.User?.lastName || '',
    email: s.User?.email && !s.User.email.endsWith('@internal.edunex.local') ? s.User.email : null,
    phone: s.User?.phone || null,
    gender: s.User?.gender || null,
    dateOfBirth: s.User?.dateOfBirth ? s.User.dateOfBirth.toISOString().split('T')[0] : null,
    bloodGroup: s.User?.bloodGroup || null,
    status: s.status,
    admissionDate: s.admissionDate ? s.admissionDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    departmentId: s.departmentId,
    department: s.Department || null,
    courseId: s.courseId,
    course: s.Course || null,
    sectionId: s.classSectionId,
    section: s.ClassSection || null,
    parentId: s.parentId || null,
    parentProfile: s.ParentProfile ? {
      id: s.ParentProfile.id,
      parentId: s.ParentProfile.parentId,
      relation: s.ParentProfile.relation,
      occupation: s.ParentProfile.occupation
    } : null,
    guardianName: s.parentName || null,
    guardianRelationship: s.ParentProfile?.relation || 'Guardian',
    guardianPhone: s.parentPhone || null,
    guardianEmail: s.parentEmail && !s.parentEmail.endsWith('@internal.edunex.local') ? s.parentEmail : null,
    address: s.User?.address || null,
    city: s.User?.city || null,
    state: s.User?.state || null,
    postalCode: s.User?.postalCode || null,
    mustChangePassword: s.User?.mustChangePassword || false,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  };
}

studentsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = validateDatabaseId(req.query.courseId, 'courseId');
    const departmentId = validateDatabaseId(req.query.departmentId, 'departmentId');
    const sectionId = validateDatabaseId(req.query.sectionId, 'sectionId');
    const status = validateStudentStatus(req.query.status);
    const search = validateSearch(req.query.search);

    const where: any = {};
    if (courseId) where.courseId = courseId;
    if (departmentId) where.departmentId = departmentId;
    if (sectionId) where.classSectionId = sectionId;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { studentId: { contains: search, mode: 'insensitive' } },
        { admissionNumber: { contains: search, mode: 'insensitive' } },
        { User: { firstName: { contains: search, mode: 'insensitive' } } },
        { User: { lastName: { contains: search, mode: 'insensitive' } } },
        { User: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        User: true,
        Department: true,
        Course: true,
        ClassSection: true,
        ParentProfile: true
      },
      orderBy: { admissionDate: 'desc' }
    });

    res.json({ data: students.map(mapStudent) });
  } catch (err) {
    next(err);
  }
});

studentsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id');
    if (!id) {
      return res.status(404).json({ title: 'Not Found', detail: 'Student record not found.' });
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        User: true,
        Department: true,
        Course: true,
        ClassSection: true,
        ParentProfile: true
      }
    });

    if (!student) {
      return res.status(404).json({ title: 'Not Found', detail: 'Student record not found.' });
    }

    res.json({ data: mapStudent(student) });
  } catch (err) {
    next(err);
  }
});

studentsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      gender,
      dateOfBirth,
      bloodGroup,
      departmentId,
      courseId,
      sectionId,
      address,
      city,
      state,
      postalCode,
      status,

      // Parent/Guardian Information
      parentName,
      guardianName,
      parentRelation,
      guardianRelationship,
      parentPhone,
      guardianPhone,
      parentAlternatePhone,
      parentEmail,
      guardianEmail,
      parentAddress,
      parentEmergencyPhone,
      parentOccupation,
      existingParentId
    } = req.body;

    if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
      return res.status(400).json({ title: 'Bad Request', detail: 'Student first and last names are required.' });
    }
    if (!departmentId || !courseId) {
      return res.status(400).json({ title: 'Bad Request', detail: 'Department and Course selections are required.' });
    }

    const validatedStatus = status ? validateStudentStatus(status) : 'ACTIVE';

    // Normalize Parent inputs
    const pFullName = (parentName || guardianName || '').trim();
    const pRawPhone = (parentPhone || guardianPhone || '').trim();
    const pRawEmail = (parentEmail || guardianEmail || '').trim();
    const pRelation = parentRelation || guardianRelationship || 'Guardian';

    // Validate parent mobile number if provided
    let pPhoneValidation = validateAndNormalizePhone(pRawPhone, Boolean(pFullName));
    if (pRawPhone && !pPhoneValidation.isValid) {
      return res.status(400).json({
        title: 'Bad Request',
        detail: pPhoneValidation.error,
        field: 'parentPhone'
      });
    }

    // Pre-generate identifiers and password hashes outside transaction to keep DB transaction fast
    const studentId = await generateStudentId();
    const admissionNumber = await generateAdmissionNumber();
    const studentCred = generateTemporaryPassword(dateOfBirth);
    const studentPassHash = await hashPassword(studentCred.password);

    const preGeneratedParentId = await generateParentId();
    const preGeneratedParentCred = generateTemporaryPassword(null);
    const preGeneratedParentPassHash = await hashPassword(preGeneratedParentCred.password);

    // Run creation inside an atomic database transaction with extended timeout
    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Resolve or Create Parent
      let parentProfile: any = null;
      let parentUser: any = null;
      let isNewParent = false;
      let parentTempPassword: string | null = null;
      let parentPolicyNote: string | null = null;

      if (existingParentId) {
        // Link to explicit existing parent
        parentProfile = await tx.parentProfile.findFirst({
          where: {
            OR: [
              ...(validateDatabaseId(existingParentId, 'id') ? [{ id: existingParentId }] : []),
              { parentId: existingParentId }
            ]
          },
          include: { User: true }
        });
        if (parentProfile) {
          parentUser = parentProfile.User;
        }
      } else if (pPhoneValidation.isValid && pPhoneValidation.canonical) {
        // Search by verified primary mobile number
        const existingUser = await tx.user.findFirst({
          where: {
            role: 'PARENT',
            OR: [
              { phone: pPhoneValidation.canonical },
              { phone: pPhoneValidation.national },
              ...(pRawEmail ? [{ email: pRawEmail.toLowerCase() }] : [])
            ]
          },
          include: { ParentProfile: true }
        });

        if (existingUser) {
          parentUser = existingUser;
          if (existingUser.ParentProfile) {
            parentProfile = existingUser.ParentProfile;
          } else {
            // Create ParentProfile for user if missing
            const pIdStr = existingUser.parentId || preGeneratedParentId;
            parentProfile = await tx.parentProfile.create({
              data: {
                id: randomUUID(),
                userId: existingUser.id,
                parentId: pIdStr,
                occupation: parentOccupation || null,
                relation: pRelation,
                alternatePhone: parentAlternatePhone || null,
                emergencyPhone: parentEmergencyPhone || null,
                address: parentAddress || address || null,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
          }
        } else if (pFullName) {
          // Provision a new parent account automatically using pre-generated credentials
          const pIdStr = preGeneratedParentId;
          parentTempPassword = preGeneratedParentCred.password;
          parentPolicyNote = preGeneratedParentCred.policyNote;

          // Support accounts without email using secure internal mapping
          const safeParentEmail = pRawEmail
            ? pRawEmail.toLowerCase()
            : `parent.${pIdStr.toLowerCase()}@internal.edunex.local`;

          // Split name into first and last
          const nameParts = pFullName.split(' ');
          const pFirstName = nameParts[0] || 'Parent';
          const pLastName = nameParts.slice(1).join(' ') || '';

          const pUserId = randomUUID();
          parentUser = await tx.user.create({
            data: {
              id: pUserId,
              email: safeParentEmail,
              passwordHash: preGeneratedParentPassHash,
              firstName: pFirstName,
              lastName: pLastName,
              role: 'PARENT',
              phone: pPhoneValidation.canonical,
              parentId: pIdStr,
              mustChangePassword: true,
              address: parentAddress || address || null,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });

          parentProfile = await tx.parentProfile.create({
            data: {
              id: randomUUID(),
              userId: pUserId,
              parentId: pIdStr,
              occupation: parentOccupation || null,
              relation: pRelation,
              alternatePhone: parentAlternatePhone || null,
              emergencyPhone: parentEmergencyPhone || null,
              address: parentAddress || address || null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });

          isNewParent = true;
        }
      }

      // 2. Student Provisioning
      const safeStudentEmail = email && email.trim()
        ? email.trim().toLowerCase()
        : `student.${studentId.toLowerCase()}@internal.edunex.local`;

      // Check if email already in use
      const existingStudentUser = await tx.user.findUnique({
        where: { email: safeStudentEmail }
      });
      if (existingStudentUser) {
        throw new Error(`A user with email address '${safeStudentEmail}' already exists.`);
      }

      const sUserId = randomUUID();
      await tx.user.create({
        data: {
          id: sUserId,
          email: safeStudentEmail,
          passwordHash: studentPassHash,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: 'STUDENT',
          phone: phone || null,
          gender: gender || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          bloodGroup: bloodGroup || null,
          address: address || null,
          city: city || null,
          state: state || null,
          postalCode: postalCode || null,
          studentId,
          departmentId: departmentId || null,
          mustChangePassword: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const year = new Date().getFullYear();
      const student = await tx.student.create({
        data: {
          id: randomUUID(),
          userId: sUserId,
          studentId,
          admissionNumber,
          admissionDate: new Date(),
          departmentId,
          courseId,
          classSectionId: sectionId || null,
          currentYear: 1,
          currentSemester: 1,
          academicYear: `${year}-${year + 1}`,
          status: validatedStatus || 'ACTIVE',
          parentId: parentProfile ? parentProfile.id : null,
          parentName: pFullName || (parentUser ? `${parentUser.firstName} ${parentUser.lastName || ''}`.trim() : null),
          parentPhone: pPhoneValidation.canonical || (parentUser?.phone || null),
          parentEmail: pRawEmail || (parentUser?.email && !parentUser.email.endsWith('@internal.edunex.local') ? parentUser.email : null),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          User: true,
          Department: true,
          Course: true,
          ClassSection: true,
          ParentProfile: true
        }
      });

      return {
        student,
        parentProfile,
        parentUser,
        isNewParent,
        parentTempPassword,
        parentPolicyNote,
        credentials: {
          studentId,
          studentAdmissionNumber: admissionNumber,
          studentEmail: safeStudentEmail,
          studentTemporaryPassword: studentCred.password,
          parentId: parentProfile ? (parentProfile.parentId || parentUser?.parentId) : null,
          parentName: pFullName || (parentUser ? `${parentUser.firstName} ${parentUser.lastName || ''}`.trim() : null),
          parentPhone: parentUser?.phone || pPhoneValidation.canonical,
          parentEmail: pRawEmail || parentUser?.email || null,
          parentTemporaryPassword: parentTempPassword,
          parentAccountStatus: isNewParent ? 'CREATED' : 'LINKED_EXISTING',
          student: {
            studentId,
            admissionNumber,
            temporaryPassword: studentCred.password,
            isDobBased: studentCred.isDobBased,
            policyNote: studentCred.policyNote
          },
          parent: parentProfile ? {
            parentId: parentProfile.parentId || parentUser?.parentId,
            parentName: pFullName || `${parentUser?.firstName} ${parentUser?.lastName || ''}`.trim(),
            parentPhone: parentUser?.phone || pPhoneValidation.canonical,
            temporaryPassword: parentTempPassword,
            isNewParent,
            policyNote: parentPolicyNote || (isNewParent ? 'Temporary credential. Must change on first sign-in.' : 'Linked to existing parent account.')
          } : null
        }
      };
    }, { maxWait: 15000, timeout: 30000 });

    const mapped = mapStudent(transactionResult.student);

    // Automated Admission Confirmation & Credential Email Delivery
    let studentEmailStatus: 'SENT' | 'FAILED' | 'MANUAL_DELIVERY_REQUIRED' = 'MANUAL_DELIVERY_REQUIRED';
    let parentEmailStatus: 'SENT' | 'FAILED' | 'MANUAL_DELIVERY_REQUIRED' = 'MANUAL_DELIVERY_REQUIRED';

    const sEmail = transactionResult.credentials.studentEmail;
    if (sEmail && !sEmail.endsWith('@internal.edunex.local')) {
      try {
        const activationToken = await activationService.createActivationToken(
          transactionResult.student.userId,
          sEmail,
          72
        );

        const delivery = await emailService.sendAdmissionConfirmationEmail({
          to: sEmail,
          userId: transactionResult.student.userId,
          studentName: `${transactionResult.student.User.firstName} ${transactionResult.student.User.lastName}`.trim(),
          studentId: transactionResult.student.studentId,
          admissionNumber: transactionResult.student.admissionNumber,
          departmentName: transactionResult.student.Department?.name || 'Academic Department',
          courseName: transactionResult.student.Course?.name || 'Academic Degree',
          sectionName: transactionResult.student.ClassSection?.name || 'Cohort Section',
          academicSession: transactionResult.student.academicYear || '2026-2027',
          admissionDate: new Date(transactionResult.student.admissionDate).toLocaleDateString(),
          parentName: transactionResult.student.parentName || undefined,
          institutionName: 'EDUNEX Institute of Higher Education',
          activationToken
        });
        studentEmailStatus = delivery.success ? 'SENT' : 'FAILED';
      } catch (e: any) {
        studentEmailStatus = 'FAILED';
      }
    }

    const pEmail = transactionResult.parentUser?.email;
    if (pEmail && !pEmail.endsWith('@internal.edunex.local')) {
      try {
        const parentActivationToken = await activationService.createActivationToken(
          transactionResult.parentUser.id,
          pEmail,
          72
        );

        const pDelivery = await emailService.sendParentAccountEmail({
          to: pEmail,
          userId: transactionResult.parentUser.id,
          parentName: `${transactionResult.parentUser.firstName} ${transactionResult.parentUser.lastName || ''}`.trim(),
          parentId: transactionResult.credentials.parentId || 'Parent',
          studentName: `${transactionResult.student.User.firstName} ${transactionResult.student.User.lastName}`.trim(),
          admissionNumber: transactionResult.student.admissionNumber,
          activationToken: parentActivationToken
        });
        parentEmailStatus = pDelivery.success ? 'SENT' : 'FAILED';
      } catch {
        parentEmailStatus = 'FAILED';
      }
    }

    res.status(201).json({
      data: {
        ...mapped,
        student: mapped,
        credentials: transactionResult.credentials,
        emailDeliveryStatus: {
          student: studentEmailStatus,
          parent: parentEmailStatus
        }
      },
      student: mapped,
      credentials: transactionResult.credentials,
      emailDeliveryStatus: {
        student: studentEmailStatus,
        parent: parentEmailStatus
      }
    });
  } catch (err: any) {
    if (err.message && err.message.includes('already exists')) {
      return res.status(409).json({ title: 'Conflict', detail: err.message });
    }
    next(err);
  }
});

studentsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id');
    if (!id) {
      return res.status(404).json({ title: 'Not Found', detail: 'Student record not found.' });
    }

    const {
      firstName,
      lastName,
      phone,
      status,
      departmentId,
      courseId,
      sectionId,
      guardianName,
      guardianPhone,
      guardianEmail,
      address,
      city,
      state,
      postalCode,
      parentId
    } = req.body;

    const student = await prisma.student.findUnique({
      where: { id },
      include: { User: true }
    });

    if (!student) {
      return res.status(404).json({ title: 'Not Found', detail: 'Student record not found.' });
    }

    await prisma.$transaction(async (tx) => {
      if (student.userId) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            ...(firstName !== undefined && { firstName }),
            ...(lastName !== undefined && { lastName }),
            ...(phone !== undefined && { phone }),
            ...(address !== undefined && { address }),
            ...(city !== undefined && { city }),
            ...(state !== undefined && { state }),
            ...(postalCode !== undefined && { postalCode }),
            ...(departmentId && { departmentId }),
            updatedAt: new Date()
          }
        });
      }

      await tx.student.update({
        where: { id },
        data: {
          ...(status !== undefined && { status }),
          ...(departmentId && { departmentId }),
          ...(courseId && { courseId }),
          ...(sectionId !== undefined && { classSectionId: sectionId || null }),
          ...(guardianName !== undefined && { parentName: guardianName }),
          ...(guardianPhone !== undefined && { parentPhone: guardianPhone }),
          ...(guardianEmail !== undefined && { parentEmail: guardianEmail }),
          ...(parentId !== undefined && { parentId: parentId || null }),
          updatedAt: new Date()
        }
      });
    });

    const updated = await prisma.student.findUnique({
      where: { id },
      include: {
        User: true,
        Department: true,
        Course: true,
        ClassSection: true,
        ParentProfile: true
      }
    });

    res.json({ data: mapStudent(updated) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/students/:id/reset-password
 * Resets student's login password and generates a secure temporary password.
 */
studentsRouter.post('/:id/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id');
    if (!id) {
      return res.status(404).json({ title: 'Not Found', detail: 'Student record not found.' });
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: { User: true }
    });

    if (!student || !student.userId) {
      return res.status(404).json({ title: 'Not Found', detail: 'Student user account not found.' });
    }

    const tempCred = generateTemporaryPassword(student.User?.dateOfBirth ? student.User.dateOfBirth.toISOString().split('T')[0] : null);
    const passHash = await hashPassword(tempCred.password);

    const updatedUser = await prisma.user.update({
      where: { id: student.userId },
      data: {
        passwordHash: passHash,
        mustChangePassword: true,
        updatedAt: new Date()
      }
    });
    store.refreshUser(updatedUser);

    res.json({
      success: true,
      message: 'Student temporary password generated successfully.',
      data: {
        studentId: student.studentId,
        studentName: `${student.User?.firstName} ${student.User?.lastName || ''}`.trim(),
        temporaryPassword: tempCred.password,
        policyNote: tempCred.policyNote
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/students/:id/parent/reset-password
 * Resets the password of the parent linked to this student.
 */
studentsRouter.post('/:id/parent/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id');
    if (!id) {
      return res.status(404).json({ title: 'Not Found', detail: 'Student record not found.' });
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        ParentProfile: {
          include: { User: true }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ title: 'Not Found', detail: 'Student record not found.' });
    }

    let parentUser: any = student.ParentProfile?.User;
    let pId: string | null | undefined = student.ParentProfile?.parentId;

    if (!parentUser && student.parentId) {
      const pProfile = await prisma.parentProfile.findUnique({
        where: { id: student.parentId },
        include: { User: true }
      });
      if (pProfile) {
        parentUser = pProfile.User;
        pId = pProfile.parentId;
      }
    }

    if (!parentUser && student.parentPhone) {
      parentUser = await prisma.user.findFirst({
        where: {
          role: 'PARENT',
          phone: student.parentPhone
        }
      });
      if (parentUser) {
        pId = parentUser.parentId || undefined;
      }
    }

    if (!parentUser) {
      return res.status(404).json({
        title: 'Not Found',
        detail: 'No parent account is currently linked to this student.'
      });
    }

    const tempCred = generateTemporaryPassword(null);
    const passHash = await hashPassword(tempCred.password);

    const updatedUser = await prisma.user.update({
      where: { id: parentUser.id },
      data: {
        passwordHash: passHash,
        mustChangePassword: true,
        updatedAt: new Date()
      }
    });
    store.refreshUser(updatedUser);

    res.json({
      success: true,
      message: 'Parent temporary password generated successfully.',
      data: {
        parentId: pId || parentUser.parentId || 'PRN-N/A',
        parentName: `${parentUser.firstName} ${parentUser.lastName || ''}`.trim(),
        temporaryPassword: tempCred.password,
        policyNote: tempCred.policyNote
      }
    });
  } catch (err) {
    next(err);
  }
});

studentsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id');
    if (!id) {
      return res.status(404).json({ title: 'Not Found', detail: 'Student record not found.' });
    }

    await prisma.student.update({
      where: { id },
      data: { status: 'ARCHIVED', updatedAt: new Date() }
    });

    res.json({ data: { message: 'Student archived successfully.' } });
  } catch (err) {
    next(err);
  }
});

studentsRouter.post('/:id/resend-admission-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = validateDatabaseId(rawId, 'id');
    if (!id) {
      return res.status(404).json({ title: 'Not Found', detail: 'Student record not found.' });
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        User: true,
        Department: true,
        Course: true,
        ClassSection: true
      }
    });

    if (!student || !student.User) {
      return res.status(404).json({ title: 'Not Found', detail: 'Student record or user profile not found.' });
    }

    const sEmail = student.User.email;
    if (!sEmail || sEmail.endsWith('@internal.edunex.local')) {
      return res.status(400).json({
        title: 'Bad Request',
        detail: 'This student has no registered external email address.'
      });
    }

    const activationToken = await activationService.createActivationToken(student.userId, sEmail, 72);
    const delivery = await emailService.sendAdmissionConfirmationEmail({
      to: sEmail,
      userId: student.userId,
      studentName: `${student.User.firstName} ${student.User.lastName}`.trim(),
      studentId: student.studentId,
      admissionNumber: student.admissionNumber,
      departmentName: student.Department?.name || 'Academic Department',
      courseName: student.Course?.name || 'Academic Degree',
      sectionName: student.ClassSection?.name || 'Cohort Section',
      academicSession: student.academicYear || '2026-2027',
      admissionDate: new Date(student.admissionDate).toLocaleDateString(),
      parentName: student.parentName || undefined,
      institutionName: 'EDUNEX Institute of Higher Education',
      activationToken
    });

    res.json({
      success: true,
      data: {
        message: delivery.success
          ? `Admission confirmation email dispatched to ${sEmail}.`
          : `Failed to deliver email to ${sEmail}. Please review notification logs.`,
        deliveryStatus: delivery.success ? 'SENT' : 'FAILED',
        activationToken
      }
    });
  } catch (err) {
    next(err);
  }
});
