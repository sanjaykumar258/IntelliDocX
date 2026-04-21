import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireMinRole } from '../middleware/rbac';
import {
  getMyDocumentStats,
  getMyDocuments,
  getApprovalHistory,
  withdrawDocument
} from '../controllers/employeeDocController';

const router = Router();
router.use(requireAuth);
router.use(requireMinRole('EMPLOYEE'));

// KPI stats
router.get('/my/stats', getMyDocumentStats);

// My documents list (with workflow status)
router.get('/my', getMyDocuments);

// Approval history for a specific doc
router.get('/:id/approval-history', getApprovalHistory);

// Withdraw pending doc
router.post('/:id/withdraw', withdrawDocument);

export default router;
