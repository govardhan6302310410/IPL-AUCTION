import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import playerRoutes from './routes/players.js';
import roomRoutes from './routes/rooms.js';
import analyticsRoutes from './routes/analytics.js';
import tournamentRoutes from './routes/tournament.js';
import historyRoutes from './routes/history.js';
import { initializeSocket } from './socket/socketServer.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

import mongoose from 'mongoose';

// Root status route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: '🏏 IPL Mega Auction API Server is running live',
    health: '/api/health'
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongodb: isDbConnected ? 'connected' : 'connecting_or_offline'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tournament', tournamentRoutes);
app.use('/api/history', historyRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = () => {
  initializeSocket(httpServer);

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use by another process.`);
      console.error(`   Please terminate any running node process using port ${PORT} or restart nodemon.\n`);
    } else {
      console.error('Server error:', err);
    }
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🏏 IPL Auction Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });

  connectDB();
};

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

startServer();

export { app, httpServer };
