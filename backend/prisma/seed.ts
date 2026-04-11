import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: { url },
  },
});

async function main() {
  const commonPassword = 'password123';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(commonPassword, salt);

  console.log(`Seeding default data using connection: ${url}`);

  // Clean up existing data
  console.log('Cleaning up existing data...');
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
  // Clean IT & HR tables
  await prisma.ticketAttachment.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.onboardingChecklist.deleteMany();
  await prisma.hrDocument.deleteMany();
  await prisma.hrEmployee.deleteMany();
  await prisma.announcement.deleteMany();
  // Clean core tables
  await prisma.document.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Create Organization
  const org = await prisma.organization.create({
    data: {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      name: 'IntelliDocX HQ',
      domain: 'intellidocx.com',
    },
  });

  // Create Users for ALL 8 roles
  const users = [
    { email: 'superadmin@acme.com', name: 'Super Admin', role: Role.SUPER_ADMIN },
    { email: 'admin@acme.com', name: 'System Admin', role: Role.ADMIN },
    { email: 'manager@acme.com', name: 'Department Manager', role: Role.MANAGER },
    { email: 'hr@acme.com', name: 'HR Manager', role: Role.HR_MANAGER },
    { email: 'it@acme.com', name: 'IT Manager', role: Role.IT_MANAGER },
    { email: 'teamlead@acme.com', name: 'Team Lead', role: Role.TEAM_LEAD },
    { email: 'employee@acme.com', name: 'Employee User', role: Role.EMPLOYEE },
    { email: 'guest@acme.com', name: 'Guest Viewer', role: Role.GUEST },
  ];

  for (const user of users) {
    await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        passwordHash,
        role: user.role,
        status: UserStatus.ACTIVE,
        organizationId: org.id,
      },
    });
  }

  console.log('\n=============================================');
  console.log('    SEEDING COMPLETE — ALL 8 ROLES');
  console.log('=============================================');
  console.log('\nAll passwords: ' + commonPassword);
  console.log('');
  users.forEach(u => console.log(`  ${u.role.padEnd(14)} → ${u.email}`));
  console.log('=============================================\n');

  // Create 3-Step Workflow Template: Team Lead → Manager → Admin
  console.log('Seeding 3-Step Workflow Template...');
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN, organizationId: org.id } });
  if (admin) {
    await prisma.workflowTemplate.create({
      data: {
        name: 'Standard Document Approval',
        organizationId: org.id,
        createdBy: admin.id,
        isActive: true,
        slaHours: 48,
        steps: {
          create: [
            { order: 1, name: 'Team Lead Review', requiredRole: Role.TEAM_LEAD },
            { order: 2, name: 'Manager Approval', requiredRole: Role.MANAGER },
            { order: 3, name: 'Final Admin Approval', requiredRole: Role.ADMIN, isFinal: true }
          ]
        }
      }
    });
    console.log('  ✓ Template created: Employee → Team Lead → Manager → Admin');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
