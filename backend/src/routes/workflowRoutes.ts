import { Router } from 'express';
import * as workflowController from '../controllers/workflowController';
import { requireAuth } from '../middleware/auth';
import { requireRole, requireMinRole } from '../middleware/rbac';

const router = Router();

router.use(requireAuth);

// Templates — Admin+ can create
router.post('/templates', 
  requireRole(['SUPER_ADMIN', 'ADMIN']), 
  workflowController.createTemplate
);

// Templates — Manager+ can view
router.get('/templates', 
  requireMinRole('TEAM_LEAD'), 
  workflowController.getTemplates
);

// Start workflow — Employee+ can start
router.post('/start/:documentId', 
  requireMinRole('EMPLOYEE'), 
  workflowController.startWorkflow
);

// Perform approval/rejection — Team Lead+ can act
router.post('/action/:instanceId', 
  requireMinRole('TEAM_LEAD'), 
  workflowController.performAction
);

// View active workflows — Employee+ can see
router.get('/active', 
  requireMinRole('EMPLOYEE'), 
  workflowController.getActiveInstances
);

// View workflow history — all authenticated users
router.get('/history/:documentId', 
  requireMinRole('GUEST'), 
  workflowController.getHistory
);

export default router;
