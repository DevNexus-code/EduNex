"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../../common/db/prisma.js");
const auth_js_1 = require("../../common/middleware/auth.js");
exports.dashboardRouter = (0, express_1.Router)();
exports.dashboardRouter.use(auth_js_1.authenticate);
exports.dashboardRouter.get('/metrics', async (_req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalStudents, activeStudents, totalStaff, totalTeachers, totalDepartments, totalCourses, todayAttendance, feePayments, recentAdmissions, upcomingExams, activeAnnouncements] = await Promise.all([
            prisma_js_1.prisma.student.count(),
            prisma_js_1.prisma.student.count({ where: { status: 'ACTIVE' } }),
            prisma_js_1.prisma.staff.count(),
            prisma_js_1.prisma.staff.count({ where: { category: 'TEACHING' } }),
            prisma_js_1.prisma.department.count(),
            prisma_js_1.prisma.course.count(),
            prisma_js_1.prisma.studentAttendance.findMany({
                where: { date: today }
            }),
            prisma_js_1.prisma.feePayment.findMany({ select: { amountPaid: true, balanceDue: true } }),
            prisma_js_1.prisma.student.findMany({
                include: {
                    User: true,
                    Course: true,
                    ClassSection: true
                },
                orderBy: { admissionDate: 'desc' },
                take: 5
            }),
            prisma_js_1.prisma.examination.findMany({
                where: {
                    startDate: { gte: today }
                },
                include: {
                    Course: true,
                    ExaminationSubject: true
                },
                orderBy: { startDate: 'asc' },
                take: 5
            }),
            prisma_js_1.prisma.announcement.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5
            })
        ]);
        const totalFeeCollected = feePayments.reduce((sum, p) => sum + p.amountPaid, 0);
        const pendingFeeEstimates = feePayments.reduce((sum, p) => sum + (p.balanceDue || 0), 0);
        const presentToday = todayAttendance.filter((a) => a.status === 'PRESENT').length;
        const todayAttendanceRate = todayAttendance.length > 0 ? Math.round((presentToday / todayAttendance.length) * 100) : 0;
        res.json({
            data: {
                totalStudents,
                activeStudents,
                totalStaff,
                totalTeachers,
                totalDepartments,
                totalCourses,
                todayAttendanceRate,
                totalFeeCollected,
                pendingFeeEstimates,
                recentAdmissions: recentAdmissions.map((s) => ({
                    id: s.id,
                    studentId: s.studentId,
                    firstName: s.User?.firstName || '',
                    lastName: s.User?.lastName || '',
                    email: s.User?.email || '',
                    course: s.Course,
                    section: s.ClassSection,
                    status: s.status,
                    admissionDate: s.admissionDate.toISOString().split('T')[0]
                })),
                upcomingExams: upcomingExams.map((e) => ({
                    id: e.id,
                    title: e.name,
                    academicYear: { name: e.academicYear },
                    startDate: e.startDate.toISOString().split('T')[0],
                    endDate: e.endDate.toISOString().split('T')[0],
                    status: e.status,
                    subjects: e.ExaminationSubject
                })),
                activeAnnouncements: activeAnnouncements.map((a) => ({
                    id: a.id,
                    title: a.title,
                    content: a.content,
                    priority: a.priority,
                    targetAudience: a.targetAudience,
                    publishDate: a.createdAt.toISOString().split('T')[0]
                }))
            }
        });
    }
    catch (err) {
        next(err);
    }
});
