import prisma from '../utils/prisma';
import Logger from '../utils/logger';

export const generateTicketNumber = async (): Promise<string> => {
  const count = await prisma.ticket.count();
  return `#${String(count + 1).padStart(3, '0')}`;
};

export const createTicket = async (data: {
  title: string;
  description: string;
  category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  submittedById: string;
  organizationId: string;
}) => {
  const ticketNumber = await generateTicketNumber();
  return prisma.ticket.create({
    data: {
      ticketNumber,
      title: data.title,
      description: data.description,
      category: data.category || 'Other',
      priority: data.priority || 'MEDIUM',
      submittedById: data.submittedById,
      organizationId: data.organizationId,
    },
    include: {
      submittedBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
};

export const listTickets = async (
  organizationId: string,
  filters?: { status?: string; priority?: string; assignedToId?: string; submittedById?: string }
) => {
  const where: any = { organizationId };
  if (filters?.status) where.status = filters.status;
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters?.submittedById) where.submittedById = filters.submittedById;

  return prisma.ticket.findMany({
    where,
    include: {
      submittedBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true, attachments: true } },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
};

export const getTicketById = async (id: string) => {
  return prisma.ticket.findUnique({
    where: { id },
    include: {
      submittedBy: { select: { id: true, name: true, email: true, role: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      messages: {
        include: { sender: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
      attachments: {
        include: { uploadedBy: { select: { id: true, name: true } } },
      },
    },
  });
};

export const updateTicketStatus = async (id: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => {
  const data: any = { status };
  if (status === 'RESOLVED') data.resolvedAt = new Date();
  return prisma.ticket.update({ where: { id }, data });
};

export const assignTicket = async (id: string, assignedToId: string) => {
  return prisma.ticket.update({
    where: { id },
    data: { assignedToId, status: 'IN_PROGRESS' },
  });
};

export const addTicketMessage = async (data: {
  ticketId: string;
  senderId: string;
  message: string;
  isInternal?: boolean;
}) => {
  return prisma.ticketMessage.create({
    data: {
      ticketId: data.ticketId,
      senderId: data.senderId,
      message: data.message,
      isInternal: data.isInternal || false,
    },
    include: {
      sender: { select: { id: true, name: true, email: true, role: true } },
    },
  });
};

export const deleteTicket = async (id: string) => {
  return prisma.ticket.delete({ where: { id } });
};

export const getTicketStats = async (organizationId: string) => {
  const [open, inProgress, resolvedToday, total] = await Promise.all([
    prisma.ticket.count({ where: { organizationId, status: 'OPEN' } }),
    prisma.ticket.count({ where: { organizationId, status: 'IN_PROGRESS' } }),
    prisma.ticket.count({
      where: {
        organizationId,
        status: 'RESOLVED',
        resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.ticket.count({ where: { organizationId } }),
  ]);

  const highPriorityOpen = await prisma.ticket.count({
    where: { organizationId, status: 'OPEN', priority: { in: ['HIGH', 'CRITICAL'] } },
  });

  const resolved = await prisma.ticket.count({ where: { organizationId, status: 'RESOLVED' } });
  const closed = await prisma.ticket.count({ where: { organizationId, status: 'CLOSED' } });

  return { open, highPriorityOpen, inProgress, resolvedToday, resolved, closed, total };
};
