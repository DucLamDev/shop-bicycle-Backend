import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import passport from 'passport';
import { initializePassport } from './config/passport.js';

import authRoutes from './routes/auth.js';
import googleAuthRoutes from './routes/googleAuth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import partnerRoutes from './routes/partners.js';
import dashboardRoutes from './routes/dashboard.js';
import couponRoutes from './routes/coupons.js';
import importRoutes from './routes/imports.js';
import expenseRoutes from './routes/expenses.js';
import customerRoutes from './routes/customers.js';
import invoiceRoutes from './routes/invoice.js';
import shippingRoutes from './routes/shipping.js';
import miniGameRoutes from './routes/miniGame.js';
import affiliateRoutes from './routes/affiliate.js';
import studentVerificationRoutes from './routes/studentVerification.js';
import chatRoutes from './routes/chat.js';
import uploadRoutes from './routes/upload.js';
import settingsRoutes from './routes/settings.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Trust first proxy for HTTPS on Render/Heroku
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible in routes
app.set('io', io);

app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Initialize Passport
initializePassport();
app.use(passport.initialize());

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 1000, // Allow 1000 requests per minute
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/mini-game', miniGameRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/student-verification', studentVerificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join admin room
  socket.on('joinAdmin', () => {
    socket.join('admin');
    console.log('Admin joined:', socket.id);
  });

  // Join specific chat room
  socket.on('joinChat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`Client joined chat: ${chatId}`);
  });

  // Leave chat room
  socket.on('leaveChat', (chatId) => {
    socket.leave(`chat_${chatId}`);
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    socket.to(`chat_${data.chatId}`).emit('userTyping', data);
  });

  // Handle dashboard subscription
  socket.on('subscribeDashboard', () => {
    socket.join('dashboard');
    console.log('Dashboard subscriber:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Function to emit dashboard updates
export const emitDashboardUpdate = (data) => {
  io.to('dashboard').emit('dashboardUpdate', data);
};

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
