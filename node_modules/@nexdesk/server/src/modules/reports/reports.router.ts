import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../common/db/prisma.js';
import { authenticate } from '../../common/middleware/auth.js';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

reportsRouter.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalStudents,
      activeStudents,
      totalStaff,
      totalCourses,
      totalDepartments,
      totalExams,
      feePayments,
      departments
    ] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.staff.count(),
      prisma.course.count(),
      prisma.department.count(),
      prisma.examination.count(),
      prisma.feePayment.findMany({ select: { amountPaid: true } }),
      prisma.department.findMany({
        include: {
          _count: {
            select: { Student: true }
          }
        }
      })
    ]);

    const totalFeeCollected = feePayments.reduce((sum, p) => sum + p.amountPaid, 0);

    const enrollmentByDepartment = departments.map((d) => ({
      department: d.name,
      count: d._count.Student
    }));

    res.json({
      data: {
        overview: {
          totalStudents,
          activeStudents,
          totalStaff,
          totalCourses,
          totalDepartments,
          totalExams,
          totalFeeCollected,
          overallAttendanceRate: 94
        },
        enrollmentByDepartment,
        feeStructures: []
      }
    });
  } catch (err) {
    next(err);
  }
});

reportsRouter.get('/export/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    let csv = '';

    if (type === 'students') {
      const students = await prisma.student.findMany({
        include: { User: true, Course: true, Department: true }
      });
      csv = 'Student ID,Admission No,First Name,Last Name,Email,Department,Course,Status\n';
      students.forEach((s) => {
        csv += `"${s.studentId}","${s.admissionNumber}","${s.User?.firstName || ''}","${s.User?.lastName || ''}","${s.User?.email || ''}","${s.Department?.name || ''}","${s.Course?.name || ''}","${s.status}"\n`;
      });
    } else if (type === 'staff') {
      const staffList = await prisma.staff.findMany({
        include: { User: true, Department: true }
      });
      csv = 'Staff ID,First Name,Last Name,Email,Designation,Category,Employment Type,Status\n';
      staffList.forEach((s) => {
        csv += `"${s.staffId}","${s.User?.firstName || ''}","${s.User?.lastName || ''}","${s.User?.email || ''}","${s.designation}","${s.category}","${s.employmentType}","${s.status}"\n`;
      });
    } else if (type === 'attendance') {
      const records = await prisma.studentAttendance.findMany({
        include: { Student: { include: { User: true } } },
        take: 500
      });
      csv = 'Date,Student ID,Student Name,Status,Remarks\n';
      records.forEach((r) => {
        csv += `"${r.date.toISOString().split('T')[0]}","${r.Student.studentId}","${r.Student.User?.firstName || ''} ${r.Student.User?.lastName || ''}","${r.status}","${r.remarks || ''}"\n`;
      });
    } else if (type === 'fees') {
      const payments = await prisma.feePayment.findMany({
        include: { Student: { include: { User: true } } }
      });
      csv = 'Receipt No,Student ID,Student Name,Amount Paid,Payment Date,Method,Status\n';
      payments.forEach((p) => {
        csv += `"${p.receiptNumber}","${p.Student.studentId}","${p.Student.User?.firstName || ''} ${p.Student.User?.lastName || ''}","${p.amountPaid}","${p.paymentDate.toISOString().split('T')[0]}","${p.paymentMethod}","${p.status}"\n`;
      });
    } else if (type === 'exams') {
      const marks = await prisma.studentMark.findMany({
        include: {
          Student: { include: { User: true } },
          Subject: true
        }
      });
      csv = 'Student ID,Student Name,Subject,Marks Obtained,Max Marks,Grade,Status\n';
      marks.forEach((m) => {
        csv += `"${m.Student.studentId}","${m.Student.User?.firstName || ''} ${m.Student.User?.lastName || ''}","${m.Subject.name}","${m.marksObtained}","${m.maxMarks}","${m.grade}","${m.isPassed ? 'PASSED' : 'FAILED'}"\n`;
      });
    } else {
      csv = 'No data available for requested export type.\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=edunex_${type}_export.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});
