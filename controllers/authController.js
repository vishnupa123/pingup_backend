import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../utils/email.js';

// Temporary memory map to store OTPs before signup
const tempOtpStorage = new Map();

// Helper to set cookie consistently
const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
  });
};



// 1. Generate OTP function
export const generateOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const formattedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: formattedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

    // Store in temporary map
    tempOtpStorage.set(formattedEmail, { otp, otpExpires });

    // Send email using Nodemailer utility
    await sendEmail(formattedEmail, otp);

    res.status(200).json({ message: '6-digit OTP sent successfully to your email' });
  } catch (error) {
    console.error('Generate OTP Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};




// 2. Verify OTP and Complete Signup
export const verifyAndSignup = async (req, res) => {
  try {
    const { username, fullName, email, password, otp } = req.body;

    if (!username || !fullName || !email || !password || !otp) {
      return res.status(400).json({ message: 'All fields including OTP are required' });
    }

    const formattedEmail = email.toLowerCase().trim();
    const formattedUsername = username.toLowerCase().trim();

    // Verify OTP from storage
    const record = tempOtpStorage.get(formattedEmail);
    if (!record) {
      return res.status(400).json({ message: 'Please request an OTP first' });
    }

    if (record.otp !== otp || record.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: formattedUsername });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const profilePic = req.file ? req.file.path : '';

    // Create new user (Password hashing is usually handled in User model pre-save hook)
    const newUser = new User({ 
      username: formattedUsername, 
      fullName, 
      email: formattedEmail, 
      password, 
      profilePic 
    });
    
    await newUser.save();

    // Clear OTP after successful registration
    tempOtpStorage.delete(formattedEmail);

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    setTokenCookie(res, token);

    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: { 
        id: newUser._id, 
        username: newUser.username, 
        fullName: newUser.fullName, 
        email: newUser.email,
        profilePic: newUser.profilePic 
      } 
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



// 3. Login function
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const formattedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: formattedEmail });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    setTokenCookie(res, token);

    res.status(200).json({ 
      message: 'Login successful',
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        fullName: user.fullName, 
        email: user.email,
        profilePic: user.profilePic
      } 
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};




// 4. Logout function
export const logout = (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};