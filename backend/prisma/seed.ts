import { PrismaClient, Role, UserStatus, TicketStatus, TicketPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: { db: { url } },
});

async function main() {
  const commonPassword = 'password123';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(commonPassword, salt);

  console.log(`\nSeeding default data...\n`);

  // ══════════════════════════════════════════════════════════
  // CLEAN ALL (FK-order aware)
  // ══════════════════════════════════════════════════════════
  console.log('Cleaning existing data...');
  await prisma.workflowLog.deleteMany();
  await prisma.approvalAction.deleteMany();
  await prisma.workflowInstance.deleteMany();
  await prisma.documentComment.deleteMany();
  await prisma.documentShare.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.documentMetadata.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.workflowStep.deleteMany();
  await prisma.sLAConfig.deleteMany();
  await prisma.workflowTemplate.deleteMany();
  await prisma.permissionGrant.deleteMany();
  await prisma.actionApproval.deleteMany();
  await prisma.userInvitation.deleteMany();
  await prisma.userNotificationPreference.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.loginHistory.deleteMany();
  await prisma.searchHistory.deleteMany();
  await prisma.savedSearch.deleteMany();
  // IT tables
  await prisma.ticketAttachment.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.ticket.deleteMany();
  // HR tables
  await prisma.leaveRequest.deleteMany();
  await prisma.onboardingChecklist.deleteMany();
  await prisma.hrDocument.deleteMany();
  await prisma.hrEmployee.deleteMany();
  await prisma.announcement.deleteMany();
  // Core
  await prisma.document.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // ══════════════════════════════════════════════════════════
  // ORGANIZATION
  // ══════════════════════════════════════════════════════════
  const org = await prisma.organization.create({
    data: {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      name: 'IntelliDocX HQ',
      domain: 'intellidocx.com',
    },
  });
  console.log(`✓ Organization: ${org.name}`);

  // ══════════════════════════════════════════════════════════
  // USERS — All 8 roles
  // ══════════════════════════════════════════════════════════
  const userDefs = [
    { email: 'superadmin@acme.com', name: 'Super Admin',        role: Role.SUPER_ADMIN },
    { email: 'admin@acme.com',      name: 'System Admin',       role: Role.ADMIN       },
    { email: 'manager@acme.com',    name: 'Department Manager', role: Role.MANAGER     },
    { email: 'hr@acme.com',         name: 'HR Manager',         role: Role.HR_MANAGER  },
    { email: 'it@acme.com',         name: 'IT Manager',         role: Role.IT_MANAGER  },
    { email: 'teamlead@acme.com',   name: 'Team Lead',          role: Role.TEAM_LEAD   },
    { email: 'employee@acme.com',   name: 'Employee User',      role: Role.EMPLOYEE    },
    { email: 'guest@acme.com',      name: 'Guest Viewer',       role: Role.GUEST       },
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of userDefs) {
    const created = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        passwordHash,
        role: u.role,
        status: UserStatus.ACTIVE,
        organizationId: org.id,
      },
    });
    createdUsers[u.role] = created;
    console.log(`  ✓ ${u.role.padEnd(14)} → ${u.email}`);
  }

  // ══════════════════════════════════════════════════════════
  // WORKFLOW TEMPLATE — 3-Step Approval Chain
  // ══════════════════════════════════════════════════════════
  const admin = createdUsers[Role.ADMIN];
  const template = await prisma.workflowTemplate.create({
    data: {
      name: 'Standard Document Approval',
      organizationId: org.id,
      createdBy: admin.id,
      isActive: true,
      slaHours: 48,
      steps: {
        create: [
          { order: 1, name: 'Team Lead Review',    requiredRole: Role.TEAM_LEAD, isFinal: false },
          { order: 2, name: 'Manager Approval',    requiredRole: Role.MANAGER,   isFinal: false },
          { order: 3, name: 'Final Admin Approval', requiredRole: Role.ADMIN,   isFinal: true  },
        ],
      },
    },
  });
  console.log(`\n✓ Workflow template: ${template.name}`);

  // ══════════════════════════════════════════════════════════
  // IT — TICKETS (match Ticket schema: submittedById, ticketNumber)
  // ══════════════════════════════════════════════════════════
  const itManager  = createdUsers[Role.IT_MANAGER];
  const employee   = createdUsers[Role.EMPLOYEE];
  const manager    = createdUsers[Role.MANAGER];
  const hrManager  = createdUsers[Role.HR_MANAGER];
  const teamLead   = createdUsers[Role.TEAM_LEAD];

  const ticketDefs = [
    {
      ticketNumber: 'TKT-001',
      title: 'VPN Connection Keeps Dropping',
      description: 'My VPN disconnects every 30 minutes. Tried multiple servers. Issue persists since Monday.',
      priority: TicketPriority.HIGH,
      category: 'NETWORK',
      submittedById: employee.id,
      status: TicketStatus.OPEN,
      assignedToId: null as string | null,
    },
    {
      ticketNumber: 'TKT-002',
      title: 'Cannot Access Shared Drive',
      description: 'Getting "Access Denied" error when trying to open the Marketing shared folder.',
      priority: TicketPriority.MEDIUM,
      category: 'ACCESS',
      submittedById: manager.id,
      status: TicketStatus.IN_PROGRESS,
      assignedToId: itManager.id,
    },
    {
      ticketNumber: 'TKT-003',
      title: 'New Laptop Setup Required',
      description: 'New hire joining Monday needs laptop configured with standard software stack.',
      priority: TicketPriority.MEDIUM,
      category: 'HARDWARE',
      submittedById: hrManager.id,
      status: TicketStatus.OPEN,
      assignedToId: null as string | null,
    },
    {
      ticketNumber: 'TKT-004',
      title: 'Email Client Crashing on Startup',
      description: 'Outlook crashes immediately after the splash screen on Windows 11.',
      priority: TicketPriority.HIGH,
      category: 'SOFTWARE',
      submittedById: teamLead.id,
      status: TicketStatus.RESOLVED,
      assignedToId: itManager.id,
    },
    {
      ticketNumber: 'TKT-005',
      title: 'Printer Not Found on Network',
      description: '3rd floor printer disappeared from network printers list after the router update.',
      priority: TicketPriority.LOW,
      category: 'HARDWARE',
      submittedById: employee.id,
      status: TicketStatus.OPEN,
      assignedToId: null as string | null,
    },
  ];

  for (const t of ticketDefs) {
    const { assignedToId, ...ticketData } = t;
    const ticket = await prisma.ticket.create({
      data: {
        ...ticketData,
        organizationId: org.id,
        ...(assignedToId ? { assignedToId } : {}),
      },
    });

    // Add message to IN_PROGRESS ticket
    if (t.status === TicketStatus.IN_PROGRESS && assignedToId) {
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: itManager.id,
          message: 'Looking into this. Can you confirm your Windows account username so I can check permissions?',
        },
      });
    }
    // Add resolution message to RESOLVED ticket
    if (t.status === TicketStatus.RESOLVED && assignedToId) {
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: itManager.id,
          message: 'Fixed by clearing the Outlook profile cache. Please restart and test.',
        },
      });
    }
  }
  console.log(`✓ ${ticketDefs.length} IT tickets seeded`);

  // ══════════════════════════════════════════════════════════
  // HR — EMPLOYEES (match HrEmployee schema: employeeCode, designation, dateJoined)
  // ══════════════════════════════════════════════════════════
  const hrEmpDefs = [
    {
      userId: employee.id,
      employeeCode: 'EMP-001',
      designation: 'Software Engineer',
      department: 'Engineering',
      dateJoined: new Date('2023-06-15'),
      employmentType: 'FULL_TIME' as const,
    },
    {
      userId: manager.id,
      employeeCode: 'EMP-002',
      designation: 'Engineering Manager',
      department: 'Engineering',
      dateJoined: new Date('2022-01-10'),
      employmentType: 'FULL_TIME' as const,
    },
    {
      userId: teamLead.id,
      employeeCode: 'EMP-003',
      designation: 'Senior Developer',
      department: 'Engineering',
      dateJoined: new Date('2023-02-20'),
      employmentType: 'FULL_TIME' as const,
    },
  ];

  for (const he of hrEmpDefs) {
    await prisma.hrEmployee.create({
      data: { ...he, organizationId: org.id },
    });
  }
  console.log(`✓ ${hrEmpDefs.length} HR employee records seeded`);

  // ══════════════════════════════════════════════════════════
  // HR — LEAVE REQUESTS (match schema: fromDate/toDate, leaveType enum)
  // ══════════════════════════════════════════════════════════
  const hrEmpRecord = await prisma.hrEmployee.findFirst({ where: { userId: employee.id } });
  if (hrEmpRecord) {
    await prisma.leaveRequest.create({
      data: {
        employeeId: hrEmpRecord.id,
        organizationId: org.id,
        leaveType: 'ANNUAL',
        fromDate: new Date('2026-05-01'),
        toDate:   new Date('2026-05-05'),
        reason: 'Family vacation',
        status: 'PENDING',
      },
    });
    await prisma.leaveRequest.create({
      data: {
        employeeId: hrEmpRecord.id,
        organizationId: org.id,
        leaveType: 'SICK',
        fromDate: new Date('2026-03-10'),
        toDate:   new Date('2026-03-11'),
        reason: 'Medical appointment',
        status: 'APPROVED',
      },
    });
    console.log('✓ Leave requests seeded');
  }

  // ══════════════════════════════════════════════════════════
  // HR — ANNOUNCEMENTS (match schema: createdById, body, no isPublished field)
  // ══════════════════════════════════════════════════════════
  const announcements = [
    {
      title: 'Q2 Performance Reviews Beginning',
      body: 'Performance reviews for Q2 2026 will commence from May 1st. All managers please complete self-assessments by April 25th.',
      createdById: hrManager.id,
    },
    {
      title: 'Updated Work-From-Home Policy',
      body: 'Effective May 1st, employees may work from home up to 3 days per week. Full policy document available in the HR portal.',
      createdById: hrManager.id,
    },
    {
      title: 'Office Renovation — 3rd Floor Closure',
      body: 'The 3rd floor will be closed for renovations from April 20–25. Please use alternate seating arrangements on 2nd floor.',
      createdById: admin.id,
    },
  ];

  for (const ann of announcements) {
    await prisma.announcement.create({
      data: { ...ann, organizationId: org.id },
    });
  }
  console.log(`✓ ${announcements.length} announcements seeded`);

  // ══════════════════════════════════════════════════════════
  // WELCOME NOTIFICATIONS
  // ══════════════════════════════════════════════════════════
  for (const u of Object.values(createdUsers)) {
    await prisma.notification.create({
      data: {
        userId: (u as any).id,
        organizationId: org.id,
        type: 'SYSTEM',
        title: 'Welcome to IntelliDocX',
        message: `Welcome, ${(u as any).name}! Your IntelliDocX workspace is ready.`,
        isRead: false,
      },
    });
  }
  console.log('✓ Welcome notifications created');

  // ══════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════
  console.log('\n=====================================================');
  console.log('     SEEDING COMPLETE — FULL DEMO DATA READY');
  console.log('=====================================================');
  console.log('\n  Password for all accounts: password123\n');
  userDefs.forEach(u => console.log(`  ${u.role.padEnd(14)} → ${u.email}`));
  console.log('\n=====================================================\n');
}

main()
  .catch((e) => { console.error('Seeding failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
