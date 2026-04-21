import { Router } from 'express';
import * as authController from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ── Public routes (no auth) ──────────────────────────────────
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// ── 2FA Login (public — user is not fully authenticated yet) ─
router.post('/login/2fa', authController.verifyLogin2fa);

// ── Session management (authenticated) ──────────────────────
// IMPORTANT: Specific routes MUST come before parameterized routes.
// 'DELETE /sessions/all' must be before 'DELETE /sessions/:id'
// otherwise Express matches 'all' as the :id parameter.
router.get('/sessions', requireAuth, authController.getSessions);
router.delete('/sessions/all', requireAuth, authController.revokeAllSessions);  // ← MUST be before /:id
router.delete('/sessions/:id', requireAuth, authController.revokeSessionById);

// ── Two-Factor Authentication (authenticated) ────────────────
router.post('/2fa/enable', requireAuth, authController.enable2fa);
router.post('/2fa/verify', requireAuth, authController.verify2fa);
router.post('/2fa/disable', requireAuth, authController.disable2fa);

export default router;
