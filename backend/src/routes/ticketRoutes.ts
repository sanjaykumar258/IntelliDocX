import { Router } from 'express';
import * as ticketController from '../controllers/ticketController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// IT sees all tickets; user sees own only (handled in controller)
router.get('/', ticketController.getTickets);
router.get('/my', ticketController.getMyTickets);
router.get('/stats', requireRole(['IT_MANAGER', 'ADMIN', 'SUPER_ADMIN']), ticketController.getStats);
router.get('/:id', ticketController.getTicketById);

// Any user can submit a ticket
router.post('/', ticketController.createTicket);

// IT updates status or assigns
router.put('/:id/status', requireRole(['IT_MANAGER', 'ADMIN', 'SUPER_ADMIN']), ticketController.updateStatus);
router.put('/:id/assign', requireRole(['IT_MANAGER', 'ADMIN', 'SUPER_ADMIN']), ticketController.assignTicket);

// Add reply (user or IT)
router.post('/:id/messages', ticketController.addMessage);

// Admin/IT only
router.delete('/:id', requireRole(['IT_MANAGER', 'ADMIN', 'SUPER_ADMIN']), ticketController.deleteTicket);

export default router;
