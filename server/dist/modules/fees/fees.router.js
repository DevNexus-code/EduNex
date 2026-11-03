"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feesRouter = void 0;
const express_1 = require("express");
const crypto_1 = require("crypto");
const prisma_js_1 = require("../../common/db/prisma.js");
const auth_js_1 = require("../../common/middleware/auth.js");
exports.feesRouter = (0, express_1.Router)();
exports.feesRouter.use(auth_js_1.authenticate);
function mapPayment(p) {
    return {
        id: p.id,
        receiptNumber: p.receiptNumber,
        studentId: p.studentId,
        student: p.Student
            ? {
                id: p.Student.id,
                studentId: p.Student.studentId,
                firstName: p.Student.User?.firstName || '',
                lastName: p.Student.User?.lastName || '',
                email: p.Student.User?.email || '',
                course: p.Student.Course?.name || ''
            }
            : undefined,
        feeStructureId: p.feeCategoryId || '',
        feeStructure: p.FeeCategory ? { name: p.FeeCategory.name } : undefined,
        totalAmount: p.totalAmount,
        amountPaid: p.amountPaid,
        discountAmount: p.discountAmount || 0,
        balanceDue: p.balanceDue,
        paymentDate: p.paymentDate.toISOString().split('T')[0],
        paymentMethod: p.paymentMethod,
        transactionRef: p.transactionReference || null,
        status: p.status,
        remarks: p.remarks || null,
        recordedById: p.recordedById,
        createdAt: p.createdAt
    };
}
exports.feesRouter.get('/categories', async (_req, res, next) => {
    try {
        const categories = await prisma_js_1.prisma.feeCategory.findMany({
            orderBy: { name: 'asc' }
        });
        res.json({ data: categories });
    }
    catch (err) {
        next(err);
    }
});
exports.feesRouter.get('/structures', async (req, res, next) => {
    try {
        const courseId = req.query.courseId;
        const structures = await prisma_js_1.prisma.feeStructure.findMany({
            where: {
                ...(courseId && { courseId })
            },
            include: {
                Course: true,
                AcademicYear: true,
                FeeCategory: true
            },
            orderBy: { amount: 'desc' }
        });
        res.json({
            data: structures.map((s) => ({
                id: s.id,
                courseId: s.courseId,
                course: s.Course,
                academicYearId: s.academicYearId,
                academicYear: s.AcademicYear || s.academicYear,
                categoryId: s.feeCategoryId,
                category: s.FeeCategory,
                amount: s.amount,
                dueDate: s.dueDate ? s.dueDate.toISOString().split('T')[0] : null,
                semester: s.semester,
                frequency: 'SEMESTER',
                createdAt: s.createdAt
            }))
        });
    }
    catch (err) {
        next(err);
    }
});
exports.feesRouter.post('/structures', async (req, res, next) => {
    try {
        const { courseId, categoryId, amount, academicYear, academicYearId, dueDate, semester } = req.body;
        if (!courseId || !categoryId || !amount) {
            return res.status(400).json({ title: 'Bad Request', detail: 'Course, Fee Category, and Amount are required.' });
        }
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ title: 'Bad Request', detail: 'Fee amount must be greater than zero.' });
        }
        const structure = await prisma_js_1.prisma.feeStructure.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                courseId,
                feeCategoryId: categoryId,
                amount: numAmount,
                academicYear: academicYear || '2026-2027',
                academicYearId: academicYearId || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                semester: semester ? Number(semester) : 1,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            include: {
                Course: true,
                AcademicYear: true,
                FeeCategory: true
            }
        });
        res.status(201).json({
            data: {
                id: structure.id,
                courseId: structure.courseId,
                course: structure.Course,
                academicYearId: structure.academicYearId,
                academicYear: structure.AcademicYear || structure.academicYear,
                categoryId: structure.feeCategoryId,
                category: structure.FeeCategory,
                amount: structure.amount,
                dueDate: structure.dueDate ? structure.dueDate.toISOString().split('T')[0] : null,
                semester: structure.semester,
                frequency: 'SEMESTER',
                createdAt: structure.createdAt
            }
        });
    }
    catch (err) {
        next(err);
    }
});
exports.feesRouter.patch('/structures/:id', async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { amount, dueDate, semester, categoryId, courseId } = req.body;
        const structure = await prisma_js_1.prisma.feeStructure.update({
            where: { id: rawId },
            data: {
                ...(amount !== undefined && { amount: Number(amount) }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(semester !== undefined && { semester: Number(semester) }),
                ...(categoryId && { feeCategoryId: categoryId }),
                ...(courseId && { courseId }),
                updatedAt: new Date()
            },
            include: {
                Course: true,
                AcademicYear: true,
                FeeCategory: true
            }
        });
        res.json({
            data: {
                id: structure.id,
                courseId: structure.courseId,
                course: structure.Course,
                academicYearId: structure.academicYearId,
                academicYear: structure.AcademicYear || structure.academicYear,
                categoryId: structure.feeCategoryId,
                category: structure.FeeCategory,
                amount: structure.amount,
                dueDate: structure.dueDate ? structure.dueDate.toISOString().split('T')[0] : null,
                semester: structure.semester,
                frequency: 'SEMESTER',
                createdAt: structure.createdAt
            }
        });
    }
    catch (err) {
        next(err);
    }
});
exports.feesRouter.delete('/structures/:id', async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await prisma_js_1.prisma.feeStructure.delete({ where: { id: rawId } });
        res.json({ data: { message: 'Fee structure deleted successfully.' } });
    }
    catch (err) {
        next(err);
    }
});
exports.feesRouter.get('/balances', async (_req, res, next) => {
    try {
        const students = await prisma_js_1.prisma.student.findMany({
            where: { status: 'ACTIVE' },
            include: {
                User: true,
                Course: {
                    include: {
                        FeeStructure: true
                    }
                },
                FeePayment: true
            }
        });
        const balances = students.map((s) => {
            const totalFees = s.Course?.FeeStructure.reduce((sum, fs) => sum + fs.amount, 0) || 5000;
            const totalPaid = s.FeePayment.reduce((sum, fp) => sum + fp.amountPaid, 0);
            const balance = Math.max(0, totalFees - totalPaid);
            return {
                studentId: s.id,
                studentName: `${s.User?.firstName || ''} ${s.User?.lastName || ''}`.trim(),
                courseName: s.Course?.name || 'General Course',
                totalFees,
                totalPaid,
                balance
            };
        });
        res.json({ data: balances });
    }
    catch (err) {
        next(err);
    }
});
exports.feesRouter.get('/payments', async (_req, res, next) => {
    try {
        const payments = await prisma_js_1.prisma.feePayment.findMany({
            include: {
                Student: {
                    include: {
                        User: true,
                        Course: true
                    }
                },
                FeeCategory: true
            },
            orderBy: { paymentDate: 'desc' }
        });
        res.json({ data: payments.map(mapPayment) });
    }
    catch (err) {
        next(err);
    }
});
exports.feesRouter.post('/payments', async (req, res, next) => {
    try {
        const { studentId, feeStructureId, amountPaid, paymentMethod, transactionRef, remarks } = req.body;
        const recordedById = req.user?.id || (0, crypto_1.randomUUID)();
        if (!studentId) {
            return res.status(400).json({ title: 'Bad Request', detail: 'Student ID is required.' });
        }
        const payAmount = Number(amountPaid);
        if (isNaN(payAmount) || payAmount <= 0) {
            return res.status(400).json({ title: 'Bad Request', detail: 'Payment amount must be greater than zero.' });
        }
        // Process payment inside atomic transaction to prevent race conditions & enforce exact balances
        const payment = await prisma_js_1.prisma.$transaction(async (tx) => {
            const student = await tx.student.findUnique({
                where: { id: studentId },
                include: {
                    User: true,
                    Course: {
                        include: {
                            FeeStructure: true
                        }
                    },
                    FeePayment: true
                }
            });
            if (!student) {
                throw new Error('STUDENT_NOT_FOUND');
            }
            // Calculate total payable according to course fee structure
            const courseFeeStructures = student.Course?.FeeStructure || [];
            const totalPayable = courseFeeStructures.reduce((sum, fs) => sum + fs.amount, 0) || 5000;
            // Calculate total paid so far
            const totalPreviousPaid = student.FeePayment.reduce((sum, fp) => sum + fp.amountPaid, 0);
            // Calculate current outstanding balance
            const currentOutstanding = Math.max(0, totalPayable - totalPreviousPaid);
            if (payAmount > currentOutstanding) {
                const err = new Error(`Payment amount of $${payAmount} exceeds outstanding balance of $${currentOutstanding}.`);
                err.code = 'EXCEEDS_BALANCE';
                throw err;
            }
            const balanceDue = Math.max(0, currentOutstanding - payAmount);
            const year = new Date().getFullYear();
            const count = await tx.feePayment.count();
            const seq = String(count + 1).padStart(4, '0');
            const receiptNumber = `RCP-${year}-${seq}`;
            let method = 'CASH';
            if (paymentMethod === 'CARD' || paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD')
                method = 'CARD';
            else if (paymentMethod === 'BANK_TRANSFER')
                method = 'BANK_TRANSFER';
            else if (paymentMethod === 'CHEQUE')
                method = 'CHEQUE';
            else if (paymentMethod === 'ONLINE_UPI' || paymentMethod === 'ONLINE' || paymentMethod === 'UPI')
                method = 'ONLINE_UPI';
            const newPayment = await tx.feePayment.create({
                data: {
                    id: (0, crypto_1.randomUUID)(),
                    receiptNumber,
                    studentId,
                    feeCategoryId: feeStructureId || null,
                    totalAmount: totalPayable,
                    amountPaid: payAmount,
                    discountAmount: 0,
                    balanceDue,
                    paymentDate: new Date(),
                    paymentMethod: method,
                    transactionReference: transactionRef || null,
                    status: balanceDue === 0 ? 'PAID' : 'PARTIAL',
                    remarks: remarks || null,
                    recordedById,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                include: {
                    Student: {
                        include: {
                            User: true,
                            Course: true
                        }
                    },
                    FeeCategory: true
                }
            });
            return newPayment;
        });
        res.status(201).json({ data: mapPayment(payment) });
    }
    catch (err) {
        if (err.message === 'STUDENT_NOT_FOUND') {
            return res.status(404).json({ title: 'Not Found', detail: 'Student record not found.' });
        }
        if (err.code === 'EXCEEDS_BALANCE' || err.message?.includes('exceeds outstanding balance')) {
            return res.status(400).json({ title: 'Bad Request', detail: err.message });
        }
        next(err);
    }
});
exports.feesRouter.get('/receipt/:receiptNumber', async (req, res, next) => {
    try {
        const receiptNumber = Array.isArray(req.params.receiptNumber)
            ? req.params.receiptNumber[0]
            : req.params.receiptNumber;
        const payment = await prisma_js_1.prisma.feePayment.findUnique({
            where: { receiptNumber },
            include: {
                Student: {
                    include: {
                        User: true,
                        Course: true
                    }
                },
                FeeCategory: true
            }
        });
        if (!payment) {
            return res.status(404).json({ title: 'Not Found', detail: 'Fee payment receipt not found.' });
        }
        res.json({ data: mapPayment(payment) });
    }
    catch (err) {
        next(err);
    }
});
