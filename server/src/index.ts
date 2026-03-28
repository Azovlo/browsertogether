import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';

import { roomRoutes } from './routes/rooms';
import { fileRoutes } from './routes/files';
import { setupSocketHandlers } from './services/socketService';
import { RoomManager } from './services/roomManager';
import { BrowserService } from './services/browserService';

dotenv.config();

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const httpServer = createServer(app);

const corsOrigin = isProduction ? true : CLIENT_URL;

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 50 * 1024 * 1024, // 50MB for file uploads
});

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Initialize services
const roomManager = new RoomManager();
const browserService = new BrowserService();

// Routes
app.use('/api/rooms', roomRoutes(roomManager));
app.use('/api/files', fileRoutes(roomManager));

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React client in production
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, 'public');
  app.use(express.static(clientBuild));
  app.get('*', (_, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

// Setup Socket.io handlers
setupSocketHandlers(io, roomManager, browserService);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await browserService.cleanup();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await browserService.cleanup();
  process.exit(0);
});

httpServer.listen(PORT, () => {
  console.log(`🚀 BrowserTogether server running on port ${PORT}`);
  console.log(`📡 Accepting connections from ${CLIENT_URL}`);
});

export { io, roomManager, browserService };
