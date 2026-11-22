import jwt from 'jsonwebtoken';

export const authMiddleware = async (req, res, next) => {
  try {
    // 1. Get token from cookies or Authorization header
    let token = req.cookies?.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach user ID to the request object
    // Now your controllers (like createPost) can use req.user.id
    req.user = decoded; 

    next(); // Move to the next function (the controller)
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};