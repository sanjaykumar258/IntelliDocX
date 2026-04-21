import prisma from '../utils/prisma';
import Logger from '../utils/logger';
import { createNotification } from './notificationService';

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
  const ticket = await prisma.ticket.create({
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

  // Notify IT Admins
  const its = await prisma.user.findMany({
    where: { organizationId: data.organizationId, role: { in: ['IT_MANAGER', 'ADMIN', 'SUPER_ADMIN'] } }
  });
  for (const it of its) {
    await createNotification(
      it.id,
      it.organizationId,
      'SYSTEM',
      `New Ticket: ${ticket.ticketNumber}`,
      `${ticket.submittedBy?.name} reported: ${ticket.title}`
    );
  }

  return ticket;
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
  const ticket = await prisma.ticket.update({ where: { id }, data, include: { submittedBy: true } });

  if (status === 'RESOLVED' || status === 'CLOSED') {
    await createNotification(
      ticket.submittedById,
      ticket.organizationId,
      'SYSTEM',
      `Ticket ${status === 'RESOLVED' ? 'Resolved' : 'Closed'}`,
      `Your ticket ${ticket.ticketNumber} has been ${status.toLowerCase()}.`
    );
  }

  return ticket;
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
  const msg = await prisma.ticketMessage.create({
    data: {
      ticketId: data.ticketId,
      senderId: data.senderId,
      message: data.message,
      isInternal: data.isInternal || false,
    },
    include: {
      sender: { select: { id: true, name: true, email: true, role: true } },
      ticket: { select: { submittedById: true, organizationId: true, ticketNumber: true, assignedToId: true } }
    },
  });

  // Notify the other party if not internal
  if (!msg.isInternal) {
    const isSenderSubmitter = msg.senderId === msg.ticket.submittedById;
    if (isSenderSubmitter) {
      // Notify assignee or IT admins
      if (msg.ticket.assignedToId) {
        await createNotification(msg.ticket.assignedToId, msg.ticket.organizationId, 'SYSTEM', `New Reply on ${msg.ticket.ticketNumber}`, `${msg.sender.name} replied to the ticket.`);
      } else {
        const its = await prisma.user.findMany({ where: { organizationId: msg.ticket.organizationId, role: { in: ['IT_MANAGER', 'ADMIN'] } } });
        for (const it of its) await createNotification(it.id, it.organizationId, 'SYSTEM', `New Reply on ${msg.ticket.ticketNumber}`, `${msg.sender.name} replied to the ticket.`);
      }
    } else {
      // Notify submitter
      await createNotification(msg.ticket.submittedById, msg.ticket.organizationId, 'SYSTEM', `IT replied to ${msg.ticket.ticketNumber}`, `${msg.sender.name} sent a message.`);
    }
  }

  return msg;
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
