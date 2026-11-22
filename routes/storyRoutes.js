import express from 'express';
import { upload } from '../config/cloudinary.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createStory, getFeedStories, deleteStory } from '../controllers/storyController.js';

const router = express.Router();

router.post('/create', authMiddleware, upload.single('media'), createStory);
router.get('/feed', authMiddleware, getFeedStories);
router.delete('/:id', authMiddleware, deleteStory);

export default router;
