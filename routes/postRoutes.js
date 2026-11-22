import express from 'express';
import { upload } from '../config/cloudinary.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createPost, getAllPosts, getPostById, deletePost, updatePost, toggleLike, getPostsByUser } from '../controllers/postController.js';
import { addComment, getCommentsByPost } from '../controllers/commentController.js';

const router = express.Router();

// --- FEED & CREATE ---
router.post('/create-post', authMiddleware, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]), createPost);

router.get('/', authMiddleware, getAllPosts);

// ✅ added — must be before /:id to avoid conflict
router.get('/user/:userId', authMiddleware, getPostsByUser);

// --- COMMENT ROUTES ---
router.post('/:postId/comments', authMiddleware, addComment);
router.get('/:postId/comments', authMiddleware, getCommentsByPost);

// --- INDIVIDUAL POST ROUTES ---
router.get('/:id', authMiddleware, getPostById);
router.patch('/:id', authMiddleware, updatePost);
router.delete('/:id', authMiddleware, deletePost);
router.post('/:id/like', authMiddleware, toggleLike);

export default router;