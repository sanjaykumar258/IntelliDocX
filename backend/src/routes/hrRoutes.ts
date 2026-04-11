import { Router } from 'express';
import * as hrController from '../controllers/hrController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// HR specific routes (require HR_MANAGER, ADMIN, or SUPER_ADMIN)
const hrOnly = requireRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN']);

router.get('/employees', hrOnly, hrController.getEmployees);
router.get('/employees/:id', hrOnly, hrController.getEmployeeById);
router.put('/employees/:id', hrOnly, hrController.updateEmployee);

router.get('/documents', hrOnly, hrController.getHrDocuments);
router.post('/documents', hrOnly, hrController.createHrDocument);
router.put('/documents/:id/sign', hrController.signDocument); // Employees sign their own docs

router.get('/onboarding', hrOnly, hrController.getOnboarding);
router.post('/onboarding', hrOnly, hrController.createOnboarding);
router.put('/onboarding/:id', hrOnly, hrController.updateOnboardingTask);

router.get('/announcements', hrController.getAnnouncements); // Everyone can see
router.post('/announcements', hrOnly, hrController.createAnnouncement);

router.get('/leave', hrController.getLeaveRequests); // HR sees all; Employee sees own (handled in controller)
router.post('/leave', hrController.createLeaveRequest);
router.put('/leave/:id/approve', requireRole(['HR_MANAGER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN']), hrController.approveLeave);
router.put('/leave/:id/reject', requireRole(['HR_MANAGER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN']), hrController.rejectLeave);

router.get('/stats', hrOnly, hrController.getHrStats);

export default router;
