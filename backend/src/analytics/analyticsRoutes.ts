import { Router } from 'express';
import { analyticsController } from './analyticsController';
import { requireMinRole } from '../middleware/rbac';

const router = Router();

// Personal analytics — all users
router.get('/me', analyticsController.getPersonalOverview);

// Manager+ can view full analytics
router.use(requireMinRole('TEAM_LEAD'));

router.get('/overview', analyticsController.getOverview);
router.get('/dashboard', analyticsController.getOverview);
router.get('/documents', analyticsController.getDocumentStats);
router.get('/workflows', analyticsController.getWorkflowStats);
router.get('/users', analyticsController.getUserStats);
router.get('/ai', analyticsController.getAIStats);
router.get('/blockchain', analyticsController.getBlockchainStats);
router.get('/audit-logs', analyticsController.getAuditLogs);

export default router;
