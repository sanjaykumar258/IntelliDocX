import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { requireAuth } from '../middleware/auth';
import { requireRole, requireMinRole } from '../middleware/rbac';

const router = Router();

// Public route (for accepting invitations - no auth needed)
router.post('/accept-invitation', adminController.acceptInvitation);

// All routes below require auth
router.use(requireAuth);

// Super Admin & Admin routes
router.post('/invite', requireRole(['SUPER_ADMIN', 'ADMIN']), adminController.inviteUser);
router.get('/users', requireMinRole('MANAGER'), adminController.getUsers);
router.put('/users/:id/role', requireRole(['SUPER_ADMIN', 'ADMIN']), adminController.changeUserRole);
router.put('/users/:id/toggle-status', requireRole(['SUPER_ADMIN', 'ADMIN']), adminController.toggleUserStatus);
router.get('/invitations', requireRole(['SUPER_ADMIN', 'ADMIN']), adminController.getInvitations);
router.get('/stats', requireMinRole('MANAGER'), adminController.getOrgStats);

// Approval routes (Manager+ can view/resolve)
router.get('/approvals', requireMinRole('MANAGER'), adminController.getApprovals);
router.get('/approvals/pending', requireMinRole('MANAGER'), adminController.getPendingApprovals);
router.post('/approvals/:id/resolve', requireMinRole('MANAGER'), adminController.resolveApproval);
router.post('/approvals/request', adminController.requestApproval);

export default router;
