import express from 'express';
import { generateOtp, verifyAndSignup, login, logout } from '../controllers/authController.js';
import { upload } from '../config/cloudinary.js'; // Your Cloudinary config

const router = express.Router();

// 1. Generate OTP route (Sends 6-digit OTP to email)
router.post('/generate-otp', generateOtp);

// 2. Signup route with profile picture upload and OTP verification
router.post('/signup', upload.single('profilePic'), verifyAndSignup);

// 3. Login route (no file upload needed here)
router.post('/login', login);

// 4. Logout route
router.post('/logout', logout);

export default router;