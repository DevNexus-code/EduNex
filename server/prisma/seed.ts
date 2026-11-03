import {
  PrismaClient,
  Role,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  AssetCategory,
  AssetStatus,
  LicenseType
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting deterministic database seed...');

  // 1. Seed Departments
  console.log('🏢 Seeding organizational departments...');
  const itDept = await prisma.department.upsert({
    where: { code: 'IT' },
    update: {},
    create: {
      name: 'IT Infrastructure & Operations',
      code: 'IT'
    }
  });

  const engDept = await prisma.department.upsert({
    where: { code: 'ENG' },
    update: {},
    create: {
      name: 'Software Engineering',
      code: 'ENG'
    }
  });

  const finDept = await prisma.department.upsert({
    where: { code: 'FIN' },
    update: {},
    create: {
      name: 'Finance & Accounting',
      code: 'FIN'
    }
  });

  // 2. Hash Common Passwords with Argon2id
  console.log('🔒 Generating Argon2id password hashes for test users...');
  const adminPasswordHash = await argon2.hash('AdminPassword123!');
  const leadPasswordHash = await argon2.hash('LeadPassword123!');
  const agentPasswordHash = await argon2.hash('AgentPassword123!');
  const employeePasswordHash = await argon2.hash('EmployeePassword123!');

  // 3. Seed 4 Test Personas
  console.log('👥 Seeding test accounts (Admin, Team Lead, IT Agent, Employee)...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nexdesk.internal' },
    update: {},
    create: {
      email: 'admin@nexdesk.internal',
      passwordHash: adminPasswordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: Role.ADMIN,
      departmentId: itDept.id
    }
  });

  const leadUser = await prisma.user.upsert({
    where: { email: 'lead@nexdesk.internal' },
    update: {},
    create: {
      email: 'lead@nexdesk.internal',
      passwordHash: leadPasswordHash,
      firstName: 'Sarah',
      lastName: 'Connor',
      role: Role.TEAM_LEAD,
      departmentId: itDept.id
    }
  });

  const agentUser = await prisma.user.upsert({
    where: { email: 'agent@nexdesk.internal' },
    update: {},
    create: {
      email: 'agent@nexdesk.internal',
      passwordHash: agentPasswordHash,
      firstName: 'Alex',
      lastName: 'Murphy',
      role: Role.IT_AGENT,
      departmentId: itDept.id
    }
  });

  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@nexdesk.internal' },
    update: {},
    create: {
      email: 'employee@nexdesk.internal',
      passwordHash: employeePasswordHash,
      firstName: 'Jane',
      lastName: 'Doe',
      role: Role.EMPLOYEE,
      departmentId: engDept.id
    }
  });

  // Set manager for IT department
  await prisma.department.update({
    where: { id: itDept.id },
    data: { managerId: leadUser.id }
  });

  // 4. Seed Hardware Assets
  console.log('💻 Seeding hardware assets (MacBook, Dell XPS, Monitor, Cisco Switch)...');
  const laptopAsset = await prisma.asset.upsert({
    where: { assetTag: 'AST-00101' },
    update: {},
    create: {
      assetTag: 'AST-00101',
      serialNumber: 'C02G8490MD6T',
      name: 'MacBook Pro 16" M3 Pro',
      category: AssetCategory.LAPTOP,
      model: 'A2991',
      manufacturer: 'Apple',
      status: AssetStatus.ASSIGNED,
      assignedToUserId: employeeUser.id,
      purchaseDate: new Date('2026-01-10'),
      purchaseCost: 2499.00,
      warrantyExpiresAt: new Date('2028-01-10'),
      notes: 'Standard engineering deployment unit.'
    }
  });

  const monitorAsset = await prisma.asset.upsert({
    where: { assetTag: 'AST-00201' },
    update: {},
    create: {
      assetTag: 'AST-00201',
      serialNumber: 'CN-0V2819-74261',
      name: 'Dell UltraSharp 27" 4K USB-C Hub',
      category: AssetCategory.MONITOR,
      model: 'U2723QE',
      manufacturer: 'Dell',
      status: AssetStatus.ASSIGNED,
      assignedToUserId: employeeUser.id,
      purchaseDate: new Date('2026-01-12'),
      purchaseCost: 579.99,
      warrantyExpiresAt: new Date('2029-01-12'),
      notes: 'Desk monitor with integrated 90W USB-C charging.'
    }
  });

  await prisma.asset.upsert({
    where: { assetTag: 'AST-00102' },
    update: {},
    create: {
      assetTag: 'AST-00102',
      serialNumber: 'DL-9942018-XPS',
      name: 'Dell XPS 15 9530',
      category: AssetCategory.LAPTOP,
      model: 'XPS-9530',
      manufacturer: 'Dell',
      status: AssetStatus.IN_STOCK,
      purchaseDate: new Date('2026-02-01'),
      purchaseCost: 1950.00,
      warrantyExpiresAt: new Date('2027-02-01'),
      notes: 'Configured and placed in stock shelf A-04.'
    }
  });

  await prisma.asset.upsert({
    where: { assetTag: 'AST-00301' },
    update: {},
    create: {
      assetTag: 'AST-00301',
      serialNumber: 'FCW2432A012',
      name: 'Cisco Catalyst 1000 24-Port Switch',
      category: AssetCategory.NETWORK_EQUIPMENT,
      model: 'C1000-24T-4G-L',
      manufacturer: 'Cisco',
      status: AssetStatus.IN_STOCK,
      purchaseDate: new Date('2025-06-15'),
      purchaseCost: 890.00,
      warrantyExpiresAt: new Date('2030-06-15'),
      notes: 'Server room rack 2 backup switch.'
    }
  });

  // 5. Seed Asset Custody History
  console.log('📜 Seeding asset custody assignment ledger...');
  const existingHistory = await prisma.assetAssignmentHistory.findFirst({
    where: { assetId: laptopAsset.id, userId: employeeUser.id }
  });

  if (!existingHistory) {
    await prisma.assetAssignmentHistory.create({
      data: {
        assetId: laptopAsset.id,
        userId: employeeUser.id,
        assignedById: leadUser.id,
        assignedAt: new Date('2026-01-15T09:00:00Z'),
        conditionAtReturn: null,
        notes: 'Handover complete during engineering onboarding. Included 140W power adapter.'
      }
    });

    await prisma.assetAssignmentHistory.create({
      data: {
        assetId: monitorAsset.id,
        userId: employeeUser.id,
        assignedById: agentUser.id,
        assignedAt: new Date('2026-01-15T10:30:00Z'),
        conditionAtReturn: null,
        notes: 'Issued with DisplayPort and USB-C upstream cables.'
      }
    });
  }

  // 6. Seed Software Licenses
  console.log('🔑 Seeding enterprise software license pools...');
  const jetbrainsLicense = await prisma.softwareLicense.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'JetBrains All Products Pack',
      vendor: 'JetBrains',
      licenseType: LicenseType.SUBSCRIPTION,
      totalSeats: 25,
      allocatedSeats: 1,
      expiresAt: new Date('2027-04-30')
    }
  });

  const figmaLicense = await prisma.softwareLicense.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Figma Enterprise Design Seat',
      vendor: 'Figma',
      licenseType: LicenseType.SEAT_BASED,
      totalSeats: 15,
      allocatedSeats: 1,
      expiresAt: new Date('2027-08-15')
    }
  });

  // License allocations for employee
  const existingJetbrainsAlloc = await prisma.licenseAllocation.findFirst({
    where: { licenseId: jetbrainsLicense.id, userId: employeeUser.id }
  });
  if (!existingJetbrainsAlloc) {
    await prisma.licenseAllocation.create({
      data: {
        licenseId: jetbrainsLicense.id,
        userId: employeeUser.id,
        assetId: laptopAsset.id,
        allocatedAt: new Date('2026-01-16T10:00:00Z')
      }
    });
  }

  // 7. Seed Incidents & Tickets
  console.log('🎫 Seeding initial support tickets with comments and SLA timers...');
  const now = new Date();
  const slaDeadline24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const slaDeadline8h = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const ticket1 = await prisma.ticket.upsert({
    where: { ticketNumber: 'TSK-10001' },
    update: {},
    create: {
      ticketNumber: 'TSK-10001',
      title: 'External 4K Monitor flickering intermittently',
      description: 'The Dell UltraSharp monitor turns black for 2-3 seconds several times a day when connected via USB-C.',
      category: TicketCategory.HARDWARE,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.IN_PROGRESS,
      creatorId: employeeUser.id,
      assigneeId: agentUser.id,
      assetId: monitorAsset.id,
      slaDueAt: slaDeadline24h
    }
  });

  const ticket2 = await prisma.ticket.upsert({
    where: { ticketNumber: 'TSK-10002' },
    update: {},
    create: {
      ticketNumber: 'TSK-10002',
      title: 'Request client VPN certificate renewal',
      description: 'My remote client certificate expires in 3 days. Please issue an updated OpenVPN configuration profile.',
      category: TicketCategory.ACCESS,
      priority: TicketPriority.HIGH,
      status: TicketStatus.ASSIGNED,
      creatorId: employeeUser.id,
      assigneeId: leadUser.id,
      slaDueAt: slaDeadline8h
    }
  });

  // Seed Comments on Ticket 1 (Demonstrating dual-tier public vs internal comments)
  const commentCount = await prisma.ticketComment.count({ where: { ticketId: ticket1.id } });
  if (commentCount === 0) {
    await prisma.ticketComment.create({
      data: {
        ticketId: ticket1.id,
        authorId: employeeUser.id,
        content: 'I attempted reseating the USB-C cable and rebooting, but the blackout still occurred twice this morning.',
        isInternal: false
      }
    });

    await prisma.ticketComment.create({
      data: {
        ticketId: ticket1.id,
        authorId: agentUser.id,
        content: 'Internal Note: Checking Dell technical advisory regarding firmware 1.2.4 DisplayPort link training bug on Apple M3 chips.',
        isInternal: true
      }
    });

    await prisma.ticketComment.create({
      data: {
        ticketId: ticket1.id,
        authorId: agentUser.id,
        content: 'Hello Jane, I am reviewing the hardware telemetry and will test an alternate Thunderbolt cable with you this afternoon.',
        isInternal: false
      }
    });
  }

  // 8. Seed Initial Audit Log
  console.log('🛡️ Recording initial audit event in immutable ledger...');
  await prisma.auditLog.create({
    data: {
      actorId: adminUser.id,
      action: 'SYSTEM_INITIALIZATION_AND_SEED',
      entityType: 'System',
      entityId: 'SYSTEM-ROOT',
      ipAddress: '127.0.0.1',
      userAgent: 'NEXDESK Seed Engine (Node.js/Prisma)',
      payload: {
        departmentsCreated: 3,
        usersSeeded: 4,
        assetsSeeded: 4,
        licensesSeeded: 2,
        ticketsSeeded: 2
      }
    }
  });

  console.log('✅ Deterministic database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
