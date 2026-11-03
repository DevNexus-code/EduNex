import { randomUUID } from 'crypto';
import { prisma } from '../src/common/db/prisma.js';
import { hashPassword } from '../src/common/utils/password.js';

async function bootstrap() {
  console.log('[EDUNEX BOOTSTRAP] Initializing institutional database...');

  const existingAdmin = await prisma.user.findFirst({
    where: { email: 'admin@edunex.edu' }
  });

  const passwordHash = await hashPassword('Edunex@Admin2026');

  if (existingAdmin) {
    console.log('[EDUNEX BOOTSTRAP] Admin user exists. Updating password & role...');
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });
    console.log('[EDUNEX BOOTSTRAP] Updated admin@edunex.edu (Password: Edunex@Admin2026)');
  } else {
    console.log('[EDUNEX BOOTSTRAP] Creating default Super Admin account...');
    await prisma.user.create({
      data: {
        id: randomUUID(),
        email: 'admin@edunex.edu',
        passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'SUPER_ADMIN',
        isActive: true,
        designation: 'Institutional Director',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('[EDUNEX BOOTSTRAP] Created admin@edunex.edu (Password: Edunex@Admin2026)');
  }

  // Ensure baseline academic year
  const currentYear = await prisma.academicYear.findFirst({
    where: { name: '2025-2026' }
  });

  if (!currentYear) {
    await prisma.academicYear.create({
      data: {
        id: randomUUID(),
        name: '2025-2026',
        startDate: new Date('2025-08-01'),
        endDate: new Date('2026-06-30'),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('[EDUNEX BOOTSTRAP] Created Academic Year: 2025-2026');
  }

  // Ensure baseline departments
  const defaultDepts = [
    { name: 'Computer Science & Engineering', code: 'CSE', desc: 'Department of Computing & Information Technology' },
    { name: 'Electrical & Electronics Engineering', code: 'EEE', desc: 'Department of Electrical Systems' },
    { name: 'Business Administration & Management', code: 'BBA', desc: 'School of Management & Business Studies' }
  ];

  for (const dept of defaultDepts) {
    const exists = await prisma.department.findUnique({
      where: { code: dept.code }
    });
    if (!exists) {
      await prisma.department.create({
        data: {
          id: randomUUID(),
          name: dept.name,
          code: dept.code,
          description: dept.desc,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log(`[EDUNEX BOOTSTRAP] Created Department: ${dept.code} - ${dept.name}`);
    }
  }

  console.log('[EDUNEX BOOTSTRAP] Finished successfully!');
  await prisma.$disconnect();
}

bootstrap().catch((err) => {
  console.error('[EDUNEX BOOTSTRAP ERROR]', err);
  process.exit(1);
});
