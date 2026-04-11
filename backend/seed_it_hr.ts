import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Get users
  const itUser = await prisma.user.findFirst({ where: { role: 'IT_MANAGER' } });
  const hrUser = await prisma.user.findFirst({ where: { role: 'HR_MANAGER' } });
  const employee = await prisma.user.findFirst({ where: { role: 'EMPLOYEE' } });
  const manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } });
  const teamlead = await prisma.user.findFirst({ where: { role: 'TEAM_LEAD' } });
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  if (!itUser || !hrUser || !employee || !manager || !teamlead || !admin) {
    console.error('Missing required users. Run seed first.');
    return;
  }

  const orgId = itUser.organizationId;

  // ═══ SEED TICKETS ═══
  console.log('Seeding IT tickets...');
  const tickets = [
    { ticketNumber: '#001', title: 'Cannot upload PDF files larger than 5MB', description: 'When I try to upload a PDF file that is larger than 5MB, I get a timeout error. The upload spinner keeps spinning forever and eventually the page freezes.', category: 'OCR/Upload', priority: 'HIGH' as const, status: 'OPEN' as const, submittedById: employee.id },
    { ticketNumber: '#002', title: 'Search results not returning recent documents', description: 'I uploaded a contract document yesterday but it does not appear in search results when I search for its title. The AI classification shows it correctly but search fails.', category: 'Search/NLP', priority: 'MEDIUM' as const, status: 'IN_PROGRESS' as const, submittedById: manager.id, assignedToId: itUser.id },
    { ticketNumber: '#003', title: 'Login session expires too quickly', description: 'My session keeps expiring every 30 minutes even though I am actively using the system. I have to re-login multiple times a day.', category: 'Login/Auth', priority: 'HIGH' as const, status: 'IN_PROGRESS' as const, submittedById: teamlead.id, assignedToId: itUser.id },
    { ticketNumber: '#004', title: 'Notification bell shows wrong count', description: 'The notification bell always shows 3 unread notifications even after I have read all of them. Refreshing the page does not help.', category: 'Notifications', priority: 'LOW' as const, status: 'RESOLVED' as const, submittedById: employee.id, assignedToId: itUser.id, resolvedAt: new Date() },
    { ticketNumber: '#005', title: 'Document version history not loading', description: 'When I click on version history for any document, the panel shows a loading spinner indefinitely. Tried on Chrome and Firefox.', category: 'Versioning', priority: 'MEDIUM' as const, status: 'OPEN' as const, submittedById: manager.id },
    { ticketNumber: '#006', title: 'Cannot access shared document link', description: 'I received a shared document link from my manager but when I click it, I get an Access Denied error even though I have the right permissions.', category: 'Access/Permission', priority: 'CRITICAL' as const, status: 'OPEN' as const, submittedById: teamlead.id },
  ];

  for (const t of tickets) {
    await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {},
      create: { ...t, organizationId: orgId },
    });
  }

  // Add messages to ticket #002
  const ticket2 = await prisma.ticket.findUnique({ where: { ticketNumber: '#002' } });
  if (ticket2) {
    const existingMsgs = await prisma.ticketMessage.count({ where: { ticketId: ticket2.id } });
    if (existingMsgs === 0) {
      await prisma.ticketMessage.createMany({
        data: [
          { ticketId: ticket2.id, senderId: manager.id, message: 'I uploaded a contract called "Q4 Partnership Agreement" yesterday at 3pm but searching for it returns nothing.' },
          { ticketId: ticket2.id, senderId: itUser.id, message: 'Thanks for reporting this. I can see the document in the database. The search index sync appears to be delayed. I am investigating the Elasticsearch reindex process.' },
          { ticketId: ticket2.id, senderId: itUser.id, message: 'I have triggered a manual reindex. Can you try searching again and let me know if it appears now?', isInternal: false },
        ],
      });
    }
  }

  // Add messages to ticket #004 (resolved)
  const ticket4 = await prisma.ticket.findUnique({ where: { ticketNumber: '#004' } });
  if (ticket4) {
    const existingMsgs = await prisma.ticketMessage.count({ where: { ticketId: ticket4.id } });
    if (existingMsgs === 0) {
      await prisma.ticketMessage.createMany({
        data: [
          { ticketId: ticket4.id, senderId: employee.id, message: 'The notification badge is stuck at 3. I have clicked and read everything.' },
          { ticketId: ticket4.id, senderId: itUser.id, message: 'This was a caching issue in the notification service. I have cleared the Redis cache and deployed a fix. The count should now update correctly when you mark notifications as read.', isInternal: false },
          { ticketId: ticket4.id, senderId: employee.id, message: 'It is working now. Thank you for the quick fix!' },
        ],
      });
    }
  }

  console.log('  ✓ 6 tickets + messages seeded');

  // ═══ SEED HR EMPLOYEE RECORDS ═══
  console.log('Seeding HR employee records...');
  const allUsers = await prisma.user.findMany({ where: { organizationId: orgId } });

  for (let i = 0; i < allUsers.length; i++) {
    const u = allUsers[i];
    await prisma.hrEmployee.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        employeeCode: `EMP-${String(i + 1).padStart(3, '0')}`,
        department: u.role.includes('IT') ? 'Technology' : u.role.includes('HR') ? 'Human Resources' : u.role.includes('ADMIN') || u.role.includes('SUPER') ? 'Administration' : 'Operations',
        designation: u.role.replace('_', ' '),
        dateJoined: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
        organizationId: orgId,
      },
    });
  }
  console.log(`  ✓ ${allUsers.length} employee records seeded`);

  // ═══ SEED ANNOUNCEMENTS ═══
  console.log('Seeding announcements...');
  const annCount = await prisma.announcement.count({ where: { organizationId: orgId } });
  if (annCount === 0) {
    await prisma.announcement.createMany({
      data: [
        { title: 'Company-wide Policy Update: Remote Work Guidelines', body: 'Starting next month, all employees are eligible for hybrid work arrangements. Please review the updated remote work policy on the HR portal and submit your preferred work schedule by the end of this week.', createdById: hrUser.id, visibleTo: 'all', organizationId: orgId },
        { title: 'Annual Performance Review Cycle Begins', body: 'The annual performance review cycle has officially begun. All managers are requested to complete self-assessments and schedule 1-on-1 review meetings with their direct reports by the end of the month.', createdById: hrUser.id, visibleTo: 'all', organizationId: orgId },
        { title: 'New Employee Wellness Program Launch', body: 'We are excited to announce the launch of our new Employee Wellness Program! This includes gym membership subsidies, mental health support, and weekly yoga sessions. Details will be shared via email.', createdById: hrUser.id, visibleTo: 'all', organizationId: orgId },
      ],
    });
    console.log('  ✓ 3 announcements seeded');
  }

  // ═══ SEED ONBOARDING TASKS ═══
  console.log('Seeding onboarding tasks...');
  const empRecord = await prisma.hrEmployee.findFirst({ where: { userId: employee.id } });
  if (empRecord) {
    const onbCount = await prisma.onboardingChecklist.count({ where: { employeeId: empRecord.id } });
    if (onbCount === 0) {
      await prisma.onboardingChecklist.createMany({
        data: [
          { employeeId: empRecord.id, taskName: 'Sign Employment Contract', taskType: 'document', status: 'done', assignedToRole: 'HR', completedAt: new Date(), organizationId: orgId },
          { employeeId: empRecord.id, taskName: 'Complete IT Equipment Setup', taskType: 'it_setup', status: 'in_progress', assignedToRole: 'IT_MANAGER', organizationId: orgId },
          { employeeId: empRecord.id, taskName: 'Attend Security Training', taskType: 'training', status: 'pending', assignedToRole: 'HR', dueDate: new Date(Date.now() + 7 * 86400000), organizationId: orgId },
          { employeeId: empRecord.id, taskName: 'Setup Access Credentials', taskType: 'access', status: 'pending', assignedToRole: 'IT_MANAGER', dueDate: new Date(Date.now() + 3 * 86400000), organizationId: orgId },
        ],
      });
      console.log('  ✓ 4 onboarding tasks seeded');
    }
  }

  console.log('\n✅ IT & HR seed data complete!');
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
