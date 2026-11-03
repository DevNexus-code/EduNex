"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffRouter = void 0;
const express_1 = require("express");
const crypto_1 = require("crypto");
const prisma_js_1 = require("../../common/db/prisma.js");
const auth_js_1 = require("../../common/middleware/auth.js");
const query_validators_js_1 = require("../../common/utils/query-validators.js");
const admin_js_1 = require("../../common/firebase/admin.js");
const activation_service_js_1 = require("../../common/services/activation.service.js");
const email_service_js_1 = require("../../common/email/email.service.js");
exports.staffRouter = (0, express_1.Router)();
exports.staffRouter.use(auth_js_1.authenticate);
function mapStaff(s) {
    const assignedSubjects = (s.User?.Subject || []).map((sub) => ({
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
exports.staffRouter.get('/', async (req, res, next) => {
    try {
        const category = (0, query_validators_js_1.validateStaffCategory)(req.query.category);
        const departmentId = (0, query_validators_js_1.validateDatabaseId)(req.query.departmentId, 'departmentId');
        const status = (0, query_validators_js_1.validateStaffStatus)(req.query.status);
        const search = (0, query_validators_js_1.validateSearch)(req.query.search);
        const where = {};
        if (category)
            where.category = category;
        if (departmentId)
            where.departmentId = departmentId;
        if (status)
            where.status = status;
        if (search) {
            where.OR = [
                { staffId: { contains: search, mode: 'insensitive' } },
                { designation: { contains: search, mode: 'insensitive' } },
                { User: { firstName: { contains: search, mode: 'insensitive' } } },
                { User: { lastName: { contains: search, mode: 'insensitive' } } },
                { User: { email: { contains: search, mode: 'insensitive' } } }
            ];
        }
        const staffList = await prisma_js_1.prisma.staff.findMany({
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
    }
    catch (err) {
        next(err);
    }
});
exports.staffRouter.get('/:id', async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = (0, query_validators_js_1.validateDatabaseId)(rawId, 'id');
        if (!id) {
            return res.status(404).json({ title: 'Not Found', detail: 'Staff record not found.' });
        }
        const staff = await prisma_js_1.prisma.staff.findUnique({
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
    }
    catch (err) {
        next(err);
    }
});
exports.staffRouter.post('/', async (req, res, next) => {
    try {
        const { firstName, lastName, email, phone, category, departmentId, designation, qualification, employmentType, joiningDate, address, city, status } = req.body;
        const validatedCategory = category ? (0, query_validators_js_1.validateStaffCategory)(category) : 'TEACHING';
        const validatedStatus = status ? (0, query_validators_js_1.validateStaffStatus)(status) : 'ACTIVE';
        const validatedDepartmentId = departmentId ? (0, query_validators_js_1.validateDatabaseId)(departmentId, 'departmentId') : null;
        const year = new Date().getFullYear();
        const count = await prisma_js_1.prisma.staff.count();
        const seq = String(count + 1).padStart(4, '0');
        const staffId = `STF-${year}-${seq}`;
        // Create user record
        const userId = (0, crypto_1.randomUUID)();
        const userRole = validatedCategory === 'TEACHING' ? 'TEACHER' : 'STAFF';
        let firebaseUid = null;
        try {
            const fbRecord = await admin_js_1.firebaseAdmin.createUser({
                email: email.toLowerCase(),
                displayName: `${firstName} ${lastName}`.trim(),
                disabled: false
            });
            firebaseUid = fbRecord.uid;
        }
        catch {
            // Dev mode fallback or existing
        }
        await prisma_js_1.prisma.user.create({
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
        const staff = await prisma_js_1.prisma.staff.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
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
        let emailDeliveryStatus = 'SENT';
        let activationToken = null;
        try {
            activationToken = await activation_service_js_1.activationService.createActivationToken(userId, email.toLowerCase(), 72);
            const delivery = await email_service_js_1.emailService.sendAccountActivationEmail({
                to: email.toLowerCase(),
                userId,
                name: `${firstName} ${lastName}`.trim(),
                loginId: staffId,
                role: userRole,
                activationToken,
                expiresHours: 72
            });
            emailDeliveryStatus = delivery.success ? 'SENT' : 'FAILED';
        }
        catch {
            emailDeliveryStatus = 'FAILED';
        }
        res.status(201).json({
            data: {
                ...mapStaff(staff),
                activationToken,
                emailDeliveryStatus
            }
        });
    }
    catch (err) {
        next(err);
    }
});
exports.staffRouter.patch('/:id', async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = (0, query_validators_js_1.validateDatabaseId)(rawId, 'id');
        if (!id) {
            return res.status(404).json({ title: 'Not Found', detail: 'Staff record not found.' });
        }
        const { firstName, lastName, phone, designation, qualification, employmentType, category, status, departmentId, address, city } = req.body;
        const validatedCategory = category ? (0, query_validators_js_1.validateStaffCategory)(category) : undefined;
        const validatedStatus = status ? (0, query_validators_js_1.validateStaffStatus)(status) : undefined;
        const validatedDepartmentId = departmentId !== undefined ? (departmentId ? (0, query_validators_js_1.validateDatabaseId)(departmentId, 'departmentId') : null) : undefined;
        const existing = await prisma_js_1.prisma.staff.findUnique({
            where: { id },
            include: { User: true }
        });
        if (!existing) {
            return res.status(404).json({ title: 'Not Found', detail: 'Staff record not found.' });
        }
        if (existing.userId) {
            await prisma_js_1.prisma.user.update({
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
        const updated = await prisma_js_1.prisma.staff.update({
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
    }
    catch (err) {
        next(err);
    }
});
/**
 * PUT /api/v1/staff/:id/subjects
 * Assigns or reassigns syllabus subjects to this faculty member.
 */
exports.staffRouter.put('/:id/subjects', async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = (0, query_validators_js_1.validateDatabaseId)(rawId, 'id') || rawId;
        const { subjectIds } = req.body;
        if (!Array.isArray(subjectIds)) {
            return res.status(400).json({ title: 'Bad Request', detail: 'subjectIds must be an array of subject IDs.' });
        }
        const staff = await prisma_js_1.prisma.staff.findUnique({
            where: { id },
            include: { User: true }
        });
        if (!staff || !staff.userId) {
            return res.status(404).json({ title: 'Not Found', detail: 'Staff record not found.' });
        }
        await prisma_js_1.prisma.$transaction(async (tx) => {
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
        const updated = await prisma_js_1.prisma.staff.findUnique({
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
    }
    catch (err) {
        next(err);
    }
});
exports.staffRouter.delete('/:id', async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = (0, query_validators_js_1.validateDatabaseId)(rawId, 'id');
        if (!id) {
            return res.status(404).json({ title: 'Not Found', detail: 'Staff record not found.' });
        }
        const existing = await prisma_js_1.prisma.staff.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ title: 'Not Found', detail: 'Staff record not found.' });
        }
        await prisma_js_1.prisma.staff.delete({ where: { id } });
        if (existing.userId) {
            await prisma_js_1.prisma.user.delete({ where: { id: existing.userId } });
        }
        res.json({ data: { message: 'Staff record deleted successfully.' } });
    }
    catch (err) {
        next(err);
    }
});
