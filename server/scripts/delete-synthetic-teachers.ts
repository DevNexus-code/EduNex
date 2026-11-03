import { prisma } from '../src/common/db/prisma.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('[CLEANUP] Starting safe transactional cleanup of synthetic teacher records...');

  // 1. Identify target records
  const targetUsers = await prisma.user.findMany({
    where: {
      email: { startsWith: 'teacher.1793', endsWith: '@edunex.edu' },
      firstName: 'Elena',
      lastName: 'Rostova'
    }
  });

  console.log(`[CLEANUP] Identified ${targetUsers.length} synthetic teacher records to remove.`);
  if (targetUsers.length === 0) {
    console.log('[CLEANUP] No synthetic records found. Exiting.');
    return;
  }

  const ids = targetUsers.map(u => u.id);

  // 2. Double-check all FK references across all related tables
  const [
    announcements,
    auditLogs,
    classSections,
    departments,
    documents,
    feePayments,
    leaveRequests,
    parentProfiles,
    sessions,
    staff,
    students,
    studentAttendances,
    studentMarks,
    subjects,
    timetables
  ] = await Promise.all([
    prisma.announcement.count({ where: { authorId: { in: ids } } }),
    prisma.auditLog.count({ where: { userId: { in: ids } } }),
    prisma.classSection.count({ where: { classTeacherId: { in: ids } } }),
    prisma.department.count({ where: { headOfDepartmentId: { in: ids } } }),
    prisma.document.count({ where: { uploadedById: { in: ids } } }),
    prisma.feePayment.count({ where: { recordedById: { in: ids } } }),
    prisma.leaveRequest.count({ where: { reviewedById: { in: ids } } }),
    prisma.parentProfile.count({ where: { userId: { in: ids } } }),
    prisma.session.count({ where: { userId: { in: ids } } }),
    prisma.staff.count({ where: { userId: { in: ids } } }),
    prisma.student.count({ where: { userId: { in: ids } } }),
    prisma.studentAttendance.count({ where: { markedById: { in: ids } } }),
    prisma.studentMark.count({ where: { enteredById: { in: ids } } }),
    prisma.subject.count({ where: { teacherId: { in: ids } } }),
    prisma.timetable.count({ where: { teacherId: { in: ids } } })
  ]);

  const totalDeps = announcements + auditLogs + classSections + departments + documents +
    feePayments + leaveRequests + parentProfiles + sessions + staff + students +
    studentAttendances + studentMarks + subjects + timetables;

  if (totalDeps > 0) {
    throw new Error(`[SAFETY BLOCK] Cannot delete: ${totalDeps} foreign-key dependencies detected!`);
  }

  // 3. Save backup before execution
  const backupDir = path.resolve('server/scripts/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = Date.now();
  const backupFile = path.join(backupDir, `deleted_synthetic_teachers_${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(targetUsers, null, 2), 'utf8');
  console.log(`[BACKUP] Saved backup of ${targetUsers.length} records to ${backupFile}`);

  // 4. Safe transactional deletion
  const result = await prisma.$transaction(async (tx) => {
    const deleteResult = await tx.user.deleteMany({
      where: {
        id: { in: ids }
      }
    });
    return deleteResult;
  });

  console.log(`[CLEANUP] Successfully deleted ${result.count} synthetic user records.`);

  // 5. Verify remaining users
  const remaining = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, role: true }
  });
  console.log(`[CLEANUP] Verified ${remaining.length} genuine remaining users in database:`);
  console.log(remaining);
}

main()
  .catch((err) => {
    console.error('[CLEANUP ERROR]', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
