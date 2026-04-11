import prisma from '../utils/prisma';

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
  return prisma.leaveRequest.create({ data, include: { employee: { include: { user: { select: { name: true } } } } } });
};

export const approveLeave = async (id: string, approvedById: string) => {
  return prisma.leaveRequest.update({ where: { id }, data: { status: 'APPROVED', approvedById } });
};

export const rejectLeave = async (id: string, approvedById: string) => {
  return prisma.leaveRequest.update({ where: { id }, data: { status: 'REJECTED', approvedById } });
};

export const getHrStats = async (organizationId: string) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [totalEmployees, newThisMonth, pendingDocs, activeOnboarding, pendingLeaves] = await Promise.all([
    prisma.hrEmployee.count({ where: { organizationId, status: 'ACTIVE' } }),
    prisma.hrEmployee.count({ where: { organizationId, createdAt: { gte: monthStart } } }),
    prisma.hrDocument.count({ where: { organizationId, requiresSignature: true, signedAt: null } }),
    prisma.onboardingChecklist.count({ where: { organizationId, status: { not: 'done' } } }),
    prisma.leaveRequest.count({ where: { organizationId, status: 'PENDING' } }),
  ]);
  return { totalEmployees, newThisMonth, pendingDocs, activeOnboarding, pendingLeaves };
};
