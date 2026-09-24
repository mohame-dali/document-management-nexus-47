import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createRequire } from 'module';
import mongoose from 'mongoose';

dotenv.config();

const require = createRequire(import.meta.url);
const connectDB = require('./backend/config/db');
const mockRouter = require('./backend/mockRouter');
const errorHandler = require('./backend/middleware/error');

// Set default JWT variables if not provided
process.env.JWT_SECRET = process.env.JWT_SECRET || 'nexus47-super-secret-key-ai-studio';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';
process.env.JWT_COOKIE_EXPIRE = process.env.JWT_COOKIE_EXPIRE || '30';

// Connect to database (with fallback to mockRouter if offline)
connectDB().catch((err: any) => {
  console.warn('Database initialization warning:', err.message);
});

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

try {
  require('./backend/sockets/index')(io);
} catch (e: any) {
  console.warn('Socket handler initialization notice:', e.message);
}

// Body & Cookie parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires', 'X-Requested-With', 'Accept', 'Origin']
}));

// Static files for uploads & documents
const backendDir = path.join(process.cwd(), 'backend');
app.use('/uploads', express.static(path.join(backendDir, 'uploads')));
app.use('/uploads/usersphoto', express.static(path.join(backendDir, 'uploads/usersphoto')));
app.use('/uploads/personnelphoto', express.static(path.join(backendDir, 'uploads/personnelphoto')));
app.use('/courrier', express.static(path.join(backendDir, 'courrier')));
app.use('/uploads/templates', express.static(path.join(backendDir, 'uploads/templates')));

// Check if MongoDB is connected; if not, route to mockRouter
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return mockRouter(req, res, next);
  }
  next();
});

// Real backend routes (used when MongoDB is connected)
try {
  app.use('/api/auth', require('./backend/routes/auth'));
  app.use('/api/users', require('./backend/routes/users'));
  app.use('/api/departments', require('./backend/routes/departments'));
  app.use('/api/incoming-documents', require('./backend/routes/incomingDocuments'));
  app.use('/api/outgoing-documents', require('./backend/routes/outgoingDocuments'));
  app.use('/api/folders', require('./backend/routes/folders'));
  app.use('/api/messages', require('./backend/routes/messages'));
  app.use('/api/document-options', require('./backend/routes/documentOptions'));
  app.use('/api/scan', require('./backend/routes/scan'));
  app.use('/api/serial-number', require('./backend/routes/serialNumber'));
  app.use('/api/templates', require('./backend/routes/templates'));
  app.use('/api/responsible-notifications', require('./backend/routes/responsibleNotifications'));
  app.use('/api/audit-logs', require('./backend/routes/auditLogs'));
  app.use('/api/activity-notifications', require('./backend/routes/activityNotifications'));
  app.use('/api/message-settings', require('./backend/routes/messageSettings'));
  app.use('/api/backup', require('./backend/routes/backup'));
  app.use('/api/organization-settings', require('./backend/routes/organizationSettingsRoutes'));
  app.use('/api/hr', require('./backend/routes/personnelRoutes'));
  app.use('/api/hr', require('./backend/routes/personnelDocumentRoutes'));
  app.use('/api/hr/stages', require('./backend/routes/rhStageRoutes'));
  app.use('/api/hr/references', require('./backend/routes/rhReferenceRoutes'));
  app.use('/api/hr', require('./backend/routes/rhStagePersonnelRoutes'));
  app.use('/api/hr', require('./backend/routes/rhPersonnelHistoryRoutes'));
  app.use('/api/attendance', require('./backend/routes/attendanceRoutes'));
  app.use('/api/attendance', require('./backend/routes/attendanceDeclarationRoutes'));
  app.use('/api/hr/leave-reasons', require('./backend/routes/leaveReasonRoutes'));
} catch (err: any) {
  console.warn('Notice loading backend routes:', err.message);
}

// Fallback to mockRouter for any unhandled /api endpoints
app.use('/api', mockRouter);

// Error handler middleware
app.use(errorHandler);

// Global DB offline error fallback as per web.md
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || err.message?.includes('buffering timed out')) {
    console.warn('[AI Studio] Database offline — returning mock response');
    if (req.method === 'GET') {
      return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? { success: true, count: 0, data: [] } : { success: true, data: null });
    }
    return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
  }
  next(err);
});

const portArgIndex = process.argv.indexOf('--port');
const portFromArgs = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1], 10) : undefined;
const PORT = Number(portFromArgs || 3000);

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
