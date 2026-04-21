import prisma from '../utils/prisma';
import { createNotification } from './notificationService';

export const listEmployees = async (organizationId: string) => {
  return prisma.hrEmployee.findMany({
    where: { organizationId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, status: true } },
      manager: { select: { id: true, name: true } },
      _count: { select: { hrDocuments: true, leaveRequests: true, onboardingTasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getEmployeeById = async (id: string) => {
  return prisma.hrEmployee.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, status: true } },
      manager: { select: { id: true, name: true } },
      hrDocuments: { orderBy: { createdAt: 'desc' } },
      onboardingTasks: { orderBy: { dueDate: 'asc' } },
      leaveRequests: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
};

export const updateEmployee = async (id: string, data: any) => {
  return prisma.hrEmployee.update({ where: { id }, data });
};

export const listHrDocuments = async (organizationId: string, filters?: { hrDocType?: string; employeeId?: string }) => {
  const where: any = { organizationId };
  if (filters?.hrDocType) where.hrDocType = filters.hrDocType;
  if (filters?.employeeId) where.employeeId = filters.employeeId;
  return prisma.hrDocument.findMany({
    where,
    include: {
      employee: { include: { user: { select: { name: true, email: true } } } },
      signedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const createHrDocument = async (data: any) => {
  return prisma.hrDocument.create({ data });
};

export const signHrDocument = async (id: string, signedById: string) => {
  return prisma.hrDocument.update({
    where: { id },
    data: { signedAt: new Date(), signedById },
  });
};

export const listOnboarding = async (organizationId: string) => {
  return prisma.onboardingChecklist.findMany({
    where: { organizationId },
    include: { employee: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  });
};

export const createOnboarding = async (data: any) => {
  return prisma.onboardingChecklist.create({ data });
};

export const updateOnboardingTask = async (id: string, data: any) => {
  if (data.status === 'done' && !data.completedAt) data.completedAt = new Date();
  return prisma.onboardingChecklist.update({ where: { id }, data });
};

export const listAnnouncements = async (organizationId: string) => {
  return prisma.announcement.findMany({
    where: {
      organizationId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { createdBy: { select: { id: true, name: true, role: true } } },
    orderBy: { publishedAt: 'desc' },
  });
};

export const createAnnouncement = async (data: any) => {
  return prisma.announcement.create({ data, include: { createdBy: { select: { id: true, name: true } } } });
};

export const listLeaveRequests = async (organizationId: string, employeeId?: string) => {
  const where: any = { organizationId };
  if (employeeId) where.employeeId = employeeId;
  return prisma.leaveRequest.findMany({
    where,
    include: {
      employee: { include: { user: { select: { name: true, email: true } } } },
      approvedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const createLeaveRequest = async (data: any) => {
  // Check for overlapping leaves
  const overlappingLeaves = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: data.employeeId,
      status: { in: ['PENDING', 'APPROVED'] },
      AND: [
        { fromDate: { lte: data.toDate } },
        { toDate: { gte: data.fromDate } }
      ]
    }
  });

  if (overlappingLeaves) {
    throw new Error('Leave request overlaps with an existing pending or approved leave.');
  }

  const leave = await prisma.leaveRequest.create({ data, include: { employee: { include: { user: { select: { name: true } } } } } });
  
  // Notify HR Managers
  const hrs = await prisma.user.findMany({
    where: { organizationId: data.organizationId, role: { in: ['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN'] } }
  });
  for (const hr of hrs) {
    await createNotification(
      hr.id,
      hr.organizationId,
      'SYSTEM',
      'New Leave Request',
      `${leave.employee.user.name} submitted a ${leave.leaveType} request.`
    );
  }
  
  return leave;
};

export const approveLeave = async (id: string, approvedById: string) => {
  const leave = await prisma.leaveRequest.update({ where: { id }, data: { status: 'APPROVED', approvedById }, include: { employee: true } });
  await createNotification(leave.employee.userId, leave.organizationId, 'SYSTEM', 'Leave Approved', `Your ${leave.leaveType} request has been approved.`);
  return leave;
};

export const rejectLeave = async (id: string, approvedById: string) => {
  const leave = await prisma.leaveRequest.update({ where: { id }, data: { status: 'REJECTED', approvedById }, include: { employee: true } });
  await createNotification(leave.employee.userId, leave.organizationId, 'SYSTEM', 'Leave Rejected', `Your ${leave.leaveType} request was rejected.`);
  return leave;
};

export const getHrStats = async (organizationId: string) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [totalEmployees, newThisMonth, pendingDocs, activeOnboarding, pendingLeaves] = await Promise.all([
    prisma.user.count({ where: { organizationId, role: { not: 'GUEST' } } }),
    prisma.user.count({ where: { organizationId, createdAt: { gte: monthStart }, role: { not: 'GUEST' } } }),
    prisma.hrDocument.count({ where: { organizationId, requiresSignature: true, signedAt: null } }),
    prisma.onboardingChecklist.count({ where: { organizationId, status: { not: 'done' } } }),
    prisma.leaveRequest.count({ where: { organizationId, status: 'PENDING' } }),
  ]);
  return { totalEmployees, newThisMonth, pendingDocs, activeOnboarding, pendingLeaves };
};
