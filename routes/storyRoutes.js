import express from 'express';
import { upload } from '../config/cloudinary.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createStory, getStoryFeed, getMyStories, deleteStory } from '../controllers/storyController.js';

const router = express.Router();

// Create story (text or image/video). For media, send file in `media` field.
router.post('/create', authMiddleware, upload.single('media'), createStory);

// Stories from users I follow (last 24h)
router.get('/feed', authMiddleware, getStoryFeed);

// My own stories (last 24h)
router.get('/me', authMiddleware, getMyStories);

// Delete my story
router.delete('/:id', authMiddleware, deleteStory);

export default router;
