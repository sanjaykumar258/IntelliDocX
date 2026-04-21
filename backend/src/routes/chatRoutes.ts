import express from 'express';
import { systemChat, allDocumentsChat } from '../controllers/chatController';

const router = express.Router();

router.post('/system', systemChat);
router.post('/documents', allDocumentsChat);

export default router;
