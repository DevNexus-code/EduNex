"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.academicsRouter = void 0;
const express_1 = require("express");
const crypto_1 = require("crypto");
const prisma_js_1 = require("../../common/db/prisma.js");
const auth_js_1 = require("../../common/middleware/auth.js");
const query_validators_js_1 = require("../../common/utils/query-validators.js");
exports.academicsRouter = (0, express_1.Router)();
exports.academicsRouter.use(auth_js_1.authenticate);
// --- DEPARTMENTS ---
exports.academicsRouter.get('/departments', async (_req, res, next) => {
    try {
        const departments = await prisma_js_1.prisma.department.findMany({
            include: {
                Course: true,
                Staff: true
            },
            orderBy: { name: 'asc' }
        });
        res.json({ data: departments });
    }
    catch (err) {
        next(err);
    }
});
exports.academicsRouter.post('/departments', async (req, res, next) => {
    try {
        const { name, code, description, headOfDepartment, status } = req.body;
        if (!name?.trim() || !code?.trim()) {
            return res.status(400).json({ title: 'Bad Request', detail: 'Department name and unique code are required.' });
        }
        const upperCode = code.trim().toUpperCase();
        const existing = await prisma_js_1.prisma.department.findFirst({
            where: { code: upperCode }
        });
        if (existing) {
            return res.status(400).json({ title: 'Conflict', detail: `Department with code '${upperCode}' already exists.` });
        }
        const dept = await prisma_js_1.prisma.department.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                name: name.trim(),
                code: upperCode,
                description: description?.trim() || null,
                status: status || 'ACTIVE',
                headOfDepartmentId: headOfDepartment || null,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        res.status(201).json({ data: dept });
    }
    catch (err) {
        next(err);
    }
});
exports.academicsRouter.patch('/departments/:id', async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = (0, query_validators_js_1.validateDatabaseId)(rawId, 'id') || rawId;
        const { name, code, description, headOfDepartment, status } = req.body;
        if (code) {
            const upperCode = code.trim().toUpperCase();
            const existing = await prisma_js_1.prisma.department.findFirst({
                where: { code: upperCode, NOT: { id } }
            });
            if (existing) {
                return res.status(400).json({ title: 'Conflict', detail: `Department code '${upperCode}' is already in use.` });
            }
        }
        const dept = await prisma_js_1.prisma.department.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(code && { code: code.trim().toUpperCase() }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(headOfDepartment !== undefined && { headOfDepartmentId: headOfDepartment || null }),
                ...(status && { status: status }),
                updatedAt: new Date()
            }
        });
        res.json({ data: dept });
    }
    catch (err) {
        next(err);
    }
});
// --- COURSES ---
exports.academicsRouter.get('/courses', async (req, res, next) => {
    try {
        const departmentId = (0, query_validators_js_1.validateDatabaseId)(req.query.departmentId, 'departmentId');
        const courses = await prisma_js_1.prisma.course.findMany({
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
    }
    catch (err) {
        next(err);
    }
});
exports.academicsRouter.post('/courses', async (req, res, next) => {
    try {
        const { name, code, type, durationYears, departmentId, description, status } = req.body;
        if (!name?.trim() || !code?.trim() || !departmentId) {
            return res.status(400).json({ title: 'Bad Request', detail: 'Course name, code, and department are required.' });
        }
        const upperCode = code.trim().toUpperCase();
        const existing = await prisma_js_1.prisma.course.findFirst({
            where: { code: upperCode }
        });
        if (existing) {
            return res.status(400).json({ title: 'Conflict', detail: `Course code '${upperCode}' already exists.` });
        }
        const course = await prisma_js_1.prisma.course.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                name: name.trim(),
                code: upperCode,
                type: type || 'UNDERGRADUATE',
                durationYears: Number(durationYears) || 4,
                departmentId,
                description: description?.trim() || null,
                status: status || 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            include: {
                Department: true
            }
        });
        res.status(201).json({ data: course });
    }
    catch (err) {
        next(err);
    }
});
exports.academicsRouter.patch('/courses/:id', async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = (0, query_validators_js_1.validateDatabaseId)(rawId, 'id') || rawId;
        const { name, code, type, durationYears, departmentId, description, status } = req.body;
        if (code) {
            const upperCode = code.trim().toUpperCase();
            const existing = await prisma_js_1.prisma.course.findFirst({
                where: { code: upperCode, NOT: { id } }
            });
            if (existing) {
                return res.status(400).json({ title: 'Conflict', detail: `Course code '${upperCode}' is already in use.` });
            }
        }
        const course = await prisma_js_1.prisma.course.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(code && { code: code.trim().toUpperCase() }),
                ...(type && { type: type }),
                ...(durationYears !== undefined && { durationYears: Number(durationYears) }),
                ...(departmentId && { departmentId }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(status && { status: status }),
                updatedAt: new Date()
            },
            include: {
                Department: true
            }
        });
        res.json({ data: course });
    }
    catch (err) {
        next(err);
    }
});
// --- SUBJECTS ---
exports.academicsRouter.get('/subjects', async (req, res, next) => {
    try {
        const courseId = (0, query_validators_js_1.validateDatabaseId)(req.query.courseId, 'courseId');
        const subjects = await prisma_js_1.prisma.subject.findMany({
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
    }
    catch (err) {
        next(err);
    }
});
exports.academicsRouter.post('/subjects', async (req, res, next) => {
    try {
        const { name, code, courseId, semester, credits, description, teacherId, status } = req.body;
        if (!name?.trim() || !code?.trim() || !courseId) {
            return res.status(400).json({ title: 'Bad Request', detail: 'Subject name, code, and course are required.' });
        }
        const upperCode = code.trim().toUpperCase();
        const existing = await prisma_js_1.prisma.subject.findFirst({
            where: { code: upperCode }
        });
        if (existing) {
            return res.status(400).json({ title: 'Conflict', detail: `Subject code '${upperCode}' already exists.` });
        }
        const subject = await prisma_js_1.prisma.subject.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                name: name.trim(),
                code: upperCode,
                courseId,
                semester: Number(semester) || 1,
                credits: Number(credits) || 3,
                description: description?.trim() || null,
                teacherId: teacherId || null,
                status: status || 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            include: {
                Course: true,
                User: true
            }
        });
        res.status(201).json({ data: subject });
    }
    catch (err) {
        next(err);
    }
});
exports.academicsRouter.patch('/subjects/:id', async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = (0, query_validators_js_1.validateDatabaseId)(rawId, 'id') || rawId;
        const { name, code, semester, credits, description, teacherId, status, courseId } = req.body;
        if (code) {
            const upperCode = code.trim().toUpperCase();
            const existing = await prisma_js_1.prisma.subject.findFirst({
                where: { code: upperCode, NOT: { id } }
            });
            if (existing) {
                return res.status(400).json({ title: 'Conflict', detail: `Subject code '${upperCode}' is already in use.` });
            }
        }
        const subject = await prisma_js_1.prisma.subject.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(code && { code: code.trim().toUpperCase() }),
                ...(courseId && { courseId }),
                ...(semester !== undefined && { semester: Number(semester) }),
                ...(credits !== undefined && { credits: Number(credits) }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(teacherId !== undefined && { teacherId: teacherId || null }),
                ...(status && { status: status }),
                updatedAt: new Date()
            },
            include: {
                Course: true,
                User: true
            }
        });
        res.json({ data: subject });
    }
    catch (err) {
        next(err);
    }
});
// --- ACADEMIC YEARS ---
exports.academicsRouter.get('/academic-years', async (_req, res, next) => {
    try {
        const years = await prisma_js_1.prisma.academicYear.findMany({
            orderBy: { startDate: 'desc' }
        });
        res.json({ data: years });
    }
    catch (err) {
        next(err);
    }
});
exports.academicsRouter.post('/academic-years', async (req, res, next) => {
    try {
        const { name, startDate, endDate, isCurrent } = req.body;
        if (!name?.trim() || !startDate || !endDate) {
            return res.status(400).json({ title: 'Bad Request', detail: 'Academic year name, start date, and end date are required.' });
        }
        if (isCurrent) {
            await prisma_js_1.prisma.academicYear.updateMany({
                data: { isCurrent: false }
            });
        }
        const year = await prisma_js_1.prisma.academicYear.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                name: name.trim(),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isCurrent: Boolean(isCurrent),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        res.status(201).json({ data: year });
    }
    catch (err) {
        next(err);
    }
});
exports.academicsRouter.patch('/academic-years/:id', async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = (0, query_validators_js_1.validateDatabaseId)(rawId, 'id') || rawId;
        const { name, startDate, endDate, isCurrent } = req.body;
        if (isCurrent) {
            await prisma_js_1.prisma.academicYear.updateMany({
                where: { NOT: { id } },
                data: { isCurrent: false }
            });
        }
        const year = await prisma_js_1.prisma.academicYear.update({
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
    }
    catch (err) {
        next(err);
    }
});
// --- CLASS SECTIONS ---
exports.academicsRouter.get('/sections', async (req, res, next) => {
    try {
        const courseId = (0, query_validators_js_1.validateDatabaseId)(req.query.courseId, 'courseId');
        const academicYearId = (0, query_validators_js_1.validateDatabaseId)(req.query.academicYearId, 'academicYearId');
        const sections = await prisma_js_1.prisma.classSection.findMany({
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
    }
    catch (err) {
        next(err);
    }
});
exports.academicsRouter.post('/sections', async (req, res, next) => {
    try {
        const { name, courseId, academicYearId, semester, yearLevel, classTeacherId } = req.body;
        if (!name?.trim() || !courseId) {
            return res.status(400).json({ title: 'Bad Request', detail: 'Section name and Course selection are required.' });
        }
        const section = await prisma_js_1.prisma.classSection.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
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
    }
    catch (err) {
        next(err);
    }
});
exports.academicsRouter.patch('/sections/:id', async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = (0, query_validators_js_1.validateDatabaseId)(rawId, 'id') || rawId;
        const { name, courseId, academicYearId, semester, yearLevel, classTeacherId } = req.body;
        const section = await prisma_js_1.prisma.classSection.update({
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
    }
    catch (err) {
        next(err);
    }
});
