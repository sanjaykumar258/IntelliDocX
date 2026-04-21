import { Router } from 'express';
import multer from 'multer';
import * as documentController from '../controllers/documentController';
import { getAccessLogs, signDocument, getSignatures } from '../controllers/blockchainController';
import { requireAuth } from '../middleware/auth';
import { requireRole, requireMinRole } from '../middleware/rbac';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes in this router require auth (applied by app.ts via protectedMiddleware)
router.use(requireAuth);

// ── Upload ────────────────────────────────────────────────────
// Employee+ (not Guests)
router.post('/upload',
  requireMinRole('EMPLOYEE'),
  upload.array('files'),
  documentController.uploadDocument
);

// ── Search ────────────────────────────────────────────────────
// All authenticated users
router.get('/search',
  requireMinRole('GUEST'),
  documentController.searchDocuments
);

// ── List ──────────────────────────────────────────────────────
// All authenticated users
router.get('/',
  requireMinRole('GUEST'),
  documentController.getDocuments
);

// ── Bulk download ─────────────────────────────────────────────
// Employee+
router.get('/download-all',
  requireMinRole('EMPLOYEE'),
  documentController.downloadAllDocuments
);

// ── IMPORTANT: Specific non-parameterized routes BEFORE /:id ──
// These MUST appear before any route with /:id, otherwise Express
// will intercept 'bulk' and 'all' as values for :id.

// Bulk Delete — Employee+
router.delete('/bulk',
  requireMinRole('EMPLOYEE'),
  documentController.bulkDeleteDocuments
);

// Delete All — Admin+
router.delete('/all',
  requireMinRole('ADMIN'),
  documentController.deleteAllDocuments
);

// ── Parameterized routes (:id) — must come AFTER specific routes ─
// Get by ID — All authenticated
router.get('/:id',
  requireMinRole('GUEST'),
  documentController.getDocumentById
);

// Update file — Employee+
router.put('/:id/update',
  requireMinRole('EMPLOYEE'),
  upload.single('file'),
  documentController.updateDocumentFile
);

// Rollback — Admin+
router.post('/:id/rollback',
  requireRole(['SUPER_ADMIN', 'ADMIN']),
  documentController.rollbackDocument
);

// Download — All authenticated
router.get('/:id/download',
  requireMinRole('GUEST'),
  documentController.downloadDocument
);

// Delete — Employee+ (with approval flow for non-admins)
router.delete('/:id',
  requireMinRole('EMPLOYEE'),
  documentController.deleteDocument
);

// Versions — All authenticated
router.get('/:id/versions',
  requireMinRole('GUEST'),
  documentController.getDocumentVersions
);

// Verify — All authenticated
router.get('/:id/verify',
  requireMinRole('GUEST'),
  documentController.verifyDocument
);

// Audit certificate — Manager+
router.get('/:id/audit',
  requireMinRole('MANAGER'),
  documentController.getAuditCertificate
);

// AI Chat — Employee+
router.post('/:id/chat',
  requireMinRole('EMPLOYEE'),
  documentController.chatWithDocument
);

// Document Expiry — Manager+
router.post('/:id/set-expiry',
  requireMinRole('MANAGER'),
  documentController.setExpiry
);

// Comments — Get: all auth; Post: Employee+
router.get('/:id/comments',
  requireMinRole('GUEST'),
  documentController.getComments
);
router.post('/:id/comments',
  requireMinRole('EMPLOYEE'),
  documentController.addComment
);

// Sharing — Employee+
router.post('/:id/share',
  requireMinRole('EMPLOYEE'),
  documentController.createShareLink
);
router.get('/:id/shares',
  requireMinRole('EMPLOYEE'),
  documentController.getShares
);

// Blockchain Security
router.get('/:id/blockchain/access-logs', requireMinRole('GUEST'), getAccessLogs);
router.post('/:id/blockchain/sign', requireMinRole('EMPLOYEE'), signDocument);
router.get('/:id/blockchain/signatures', requireMinRole('GUEST'), getSignatures);

export default router;
