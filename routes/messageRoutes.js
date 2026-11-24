import express from 'express';
import { getMessages, sendMessage, getMyChatList, markMessagesSeen } from '../controllers/messageController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. സ്റ്റാറ്റിക് റൂട്ടുകൾ ആദ്യം എഴുതുക
router.get('/conversations/users', authMiddleware, getMyChatList);

// 2. പോസ്റ്റ് റൂട്ടുകൾ
router.post('/send', authMiddleware, sendMessage);
router.post('/seen/:otherUserId', authMiddleware, markMessagesSeen);

// 3. ഡൈനാമിക് റൂട്ടുകൾ (ഏറ്റവും താഴെ)
router.get('/:userId/:otherUserId', authMiddleware, getMessages);
router.get('/:id', authMiddleware, getMessages);

export default router;