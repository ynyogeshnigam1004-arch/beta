/**
 * Voice AI Calling Platform - Main Server
 * WebSocket server for real-time voice AI interactions
 * Updated for Render deployment - OAuth Fix
 */

require('dotenv').config({ override: true });
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');

// MongoDB connection
const { connectDB, checkConnection } = require('./config/database');

// Routes
const authRoutes = require('./routes/authEnhanced');
const assistantRoutes = require('./routes/assistants');

// Server configuration
const PORT = process.env.PORT || 10000;

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS Configuration - Allow all origins for debugging
app.use(cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

// Add explicit OPTIONS handler
app.options('*', cors());

// Health check endpoints
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Voice AI Platform Backend is running on Render',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get('/health', async (req, res) => {
  try {
    const dbStatus = await checkConnection();
    res.json({
      success: true,
      message: 'Voice AI Platform Backend is healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus.connected ? 'connected' : 'disconnected',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Mount authentication routes
app.use('/api/auth', authRoutes);

// Mount assistant routes
app.use('/api/assistants', assistantRoutes);

// Test endpoint to verify API is working
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working correctly',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Initialize WebSocket server
const wss = new WebSocket.Server({
  server,
  path: '/ws'
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');
  
  ws.on('message', (message) => {
    console.log('Received WebSocket message:', message.toString());
    // Echo back for now
    ws.send(JSON.stringify({
      type: 'echo',
      data: message.toString(),
      timestamp: new Date().toISOString()
    }));
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected successfully!');

    // Start HTTP server
    server.listen(PORT, '0.0.0.0', () => {
      console.log('============================================================');
      console.log('🚀 Voice AI Calling Platform Server');
      console.log('============================================================');
      console.log(`📡 HTTP Server: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket Server: ws://localhost:${PORT}/ws`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
      console.log('============================================================');
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('MongoDB: ✅ Connected');
      console.log('============================================================');
      console.log('Server is ready to accept connections! 🎉');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();