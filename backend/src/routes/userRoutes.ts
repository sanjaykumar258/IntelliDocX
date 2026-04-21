import { Router } from 'express';
import multer from 'multer';
import * as userController from '../controllers/userController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

router.use(requireAuth);

// Self-service profile update — any authenticated user can update their own name
// IMPORTANT: Must come BEFORE /:id to prevent 'me' being caught as an ID
router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);
router.post('/me/avatar', upload.single('avatar'), userController.uploadAvatar);

// Admin-only operations
router.post('/', requireRole(['ADMIN', 'SUPER_ADMIN']), userController.createUser);
router.get('/', requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER']), userController.getUsers);
router.delete('/all', requireRole(['ADMIN', 'SUPER_ADMIN']), userController.deleteAllUsers);
router.put('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), userController.updateUser);
router.delete('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), userController.deleteUser);

export default router;
