import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import connectDB from './config/db.js';

// Import Routes & Models
import authRoutes from './routes/auth.js'; 
import postRoutes from './routes/postRoutes.js';
import userRoutes from './routes/userRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import storyRoutes from './routes/storyRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import Message from './models/Message.js';
import { encryptMessage } from './utils/messageCrypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set('io', io);

// Socket events
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    if (userId) socket.join(String(userId));
  });

  socket.on('send_message', async (data) => {
    try {
      const newMessage = new Message({
        sender: data.sender,
        receiver: data.receiver,
        message: encryptMessage(data.message)
      });
      await newMessage.save();

      io.emit('receive_message', newMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
  });
});

// --- CORS & Middleware ---
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json()); 
app.use(cookieParser()); 

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/notifications', notificationRoutes);

// --- Start Server ---
const PORT = process.env.PORT || 8000;
const startServer = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  try {
    await connectDB(uri);

    server.listen(PORT, () => {
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
