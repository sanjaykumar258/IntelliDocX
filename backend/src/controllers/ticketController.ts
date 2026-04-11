import { Response } from 'express';
import * as ticketService from '../services/ticketService';

export const createTicket = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { title, description, category, priority } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'Title and description are required' });
    const ticket = await ticketService.createTicket({
      title, description, category, priority,
      submittedById: user.userId,
      organizationId: user.organizationId,
    });
    res.status(201).json(ticket);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const getTickets = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { status, priority } = req.query;
    const filters: any = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (!['IT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      filters.submittedById = user.userId;
    }
    const tickets = await ticketService.listTickets(user.organizationId, filters);
    res.json(tickets);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const getMyTickets = async (req: any, res: Response) => {
  try {
    const tickets = await ticketService.listTickets(req.user.organizationId, { submittedById: req.user.userId });
    res.json(tickets);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const getTicketById = async (req: any, res: Response) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    const user = req.user;
    if (!['IT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role) && ticket.submittedById !== user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!['IT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      ticket.messages = ticket.messages.filter((m: any) => !m.isInternal);
    }
    res.json(ticket);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const updateStatus = async (req: any, res: Response) => {
  try {
    const { status } = req.body;
    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const ticket = await ticketService.updateTicketStatus(req.params.id, status);
    res.json(ticket);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const assignTicket = async (req: any, res: Response) => {
  try {
    const { assignedToId } = req.body;
    const ticket = await ticketService.assignTicket(req.params.id, assignedToId || req.user.userId);
    res.json(ticket);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const addMessage = async (req: any, res: Response) => {
  try {
    const { message, isInternal } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });
    const ticket = await ticketService.getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    const user = req.user;
    const isIT = ['IT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);
    if (!isIT && ticket.submittedById !== user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const msg = await ticketService.addTicketMessage({
      ticketId: req.params.id,
      senderId: user.userId,
      message,
      isInternal: (isInternal && isIT) || false, // Only IT can mark messages as internal
    });
    res.status(201).json(msg);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const deleteTicket = async (req: any, res: Response) => {
  try {
    await ticketService.deleteTicket(req.params.id);
    res.json({ message: 'Ticket deleted' });
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const getStats = async (req: any, res: Response) => {
  try {
    const stats = await ticketService.getTicketStats(req.user.organizationId);
    res.json(stats);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};
