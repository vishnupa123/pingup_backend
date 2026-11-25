import express from 'express';
import * as userController from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// --- MY ACCOUNT (PRIVATE) ---
router.get('/me', authMiddleware, userController.getMyProfile);
router.get('/online', authMiddleware, userController.getOnlineUsers);
router.patch('/update', authMiddleware, upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'cover_photo', maxCount: 1 }
]), userController.updateProfile);
router.delete('/delete', authMiddleware, userController.deleteProfile);

// --- SOCIAL ACTIONS (PUBLIC/INTERACTIVE) ---
router.get('/', authMiddleware, userController.getAllUsers);
router.get('/profile/:id', authMiddleware, userController.getUserProfile);
router.post('/follow/:id', authMiddleware, userController.followUnfollowUser);

router.get('/search', authMiddleware, userController.searchUser);




router.post("/change-password", authMiddleware, userController.changePassword);



export default router;