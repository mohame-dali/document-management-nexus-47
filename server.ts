import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createRequire } from 'module';
import mongoose from 'mongoose';

mongoose.set('bufferCommands', false);

dotenv.config();

const require = createRequire(import.meta.url);
const connectDB = require('./backend/config/db');
const mockRouter = require('./backend/mockRouter');
const errorHandler = require('./backend/middleware/error');

// Check JWT_SECRET
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('🔴 FATAL: JWT_SECRET absent du .env');
    console.error('   Générer : node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    process.exit(1);
  } else {
    console.warn('⚠️ AVERTISSEMENT: JWT_SECRET absent du .env — utilisation d\'une clé sécurisée pour le développement.');
    process.env.JWT_SECRET = 'dms_dev_jwt_secret_key_64_bytes_secure_random_fallback_token_2026';
  }
}
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';
process.env.JWT_COOKIE_EXPIRE = process.env.JWT_COOKIE_EXPIRE || '30';

// Connect to database (with fallback to mockRouter if offline)
connectDB().catch((err: Error) => {
  console.warn('Database initialization warning:', err.message);
});

// Démarrer le scheduler de backup si MongoDB est connecté
try {
  const { startBackupScheduler } = require('./backend/services/backupScheduler');
  mongoose.connection.on('connected', () => {
    startBackupScheduler().catch((e: Error) => console.warn('[Backup Scheduler] Notice:', e.message));
  });
  if (mongoose.connection.readyState === 1) {
    startBackupScheduler().catch((e: Error) => console.warn('[Backup Scheduler] Notice:', e.message));
  }
} catch (err: unknown) {
  console.warn('[Server] Backup scheduler non démarré:', (err as Error).message);
}

// Cron quotidien à 8h pour le rattrapage des notifications d'activité
try {
  const cron = require('node-cron');
  const { checkDailyNotifications } = require('./backend/utils/activityNotificationHelper');
  cron.schedule('0 8 * * *', () => {
    console.log('[Cron] Exécution du rattrapage quotidien des notifications d\'activité');
    checkDailyNotifications().catch((e: Error) => console.warn('[Cron Notifications] Error:', e.message));
  });
} catch (err: unknown) {
  console.warn('[Server] Cron notification activité non démarré:', (err as Error).message);
}

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
} catch (e: unknown) {
  console.warn('Socket handler initialization notice:', (e as Error).message);
}

// Body & Cookie parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Sanitize NoSQL operator injection in req.body, req.params, req.query (compatible with Express 5)
const mongoSanitize = require('express-mongo-sanitize');
app.use((req, _res, next) => {
  if (req.body) {
    mongoSanitize.sanitize(req.body, { replaceWith: '_', allowDots: false });
  }
  if (req.params) {
    mongoSanitize.sanitize(req.params, { replaceWith: '_', allowDots: false });
  }
  if (req.query) {
    mongoSanitize.sanitize(req.query, { replaceWith: '_', allowDots: false });
  }
  next();
});

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires', 'X-Requested-With', 'Accept', 'Origin']
}));

// Static & Protected document files
const backendDir = path.join(process.cwd(), 'backend');
const { protect } = require('./backend/middleware/auth');
const fileController = require('./backend/controllers/fileController');

// Protected document endpoint
app.get('/api/files/:type/:id/:filename', protect, fileController.serveProtectedFile);

// Protect /courrier against unauthenticated access
app.use('/courrier', protect, fileController.serveCourrierStatic);

// Public profile photos (avatars)
app.use('/uploads/usersphoto', express.static(path.join(backendDir, 'uploads/usersphoto')));
app.use('/uploads/personnelphoto', express.static(path.join(backendDir, 'uploads/personnelphoto')));

// Protect sensitive uploads and templates
app.use('/uploads', protect, express.static(path.join(backendDir, 'uploads')));

// Swagger API Documentation
try {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./backend/config/swagger');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (_req: express.Request, res: express.Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
} catch (err: unknown) {
  console.warn('Swagger docs initialization notice:', (err as Error).message);
}

// If MongoDB is connected, use real backend routes; otherwise fallback seamlessly to mockRouter
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }
  return mockRouter(req, res, next);
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
  app.use('/api/trash', require('./backend/routes/trashRoutes'));
  app.use('/api/organization-chart', require('./backend/routes/organizationChartRoutes'));
  app.use('/api/ai', require('./backend/routes/aiRoutes'));
  app.use('/api/search', require('./backend/routes/globalSearchRoutes'));
} catch (err: unknown) {
  console.warn('Notice loading backend routes:', (err as Error).message);
}

// Fallback to mockRouter for any unhandled /api endpoints
app.use('/api', mockRouter);

// Error handler middleware
app.use(errorHandler);

// Global DB offline error fallback as per web.md
interface AppError extends Error {
  name: string;
  message: string;
}
app.use((err: AppError, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || err.message?.includes('buffering timed out')) {
    console.warn('[AI Studio] Database offline — returning mock response');
    if (req.method === 'GET') {
      return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? { success: true, count: 0, data: [] } : { success: true, data: null });
    }
    return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
  }
  next(err);
});

const portArg = process.argv.find((arg) => arg.startsWith('--port='));
const portArgIndex = process.argv.indexOf('--port');
const portFromArgs = portArg
  ? parseInt(portArg.split('=')[1], 10)
  : portArgIndex !== -1
  ? parseInt(process.argv[portArgIndex + 1], 10)
  : undefined;
const PORT = Number(portFromArgs || (process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : 3000));

// Vérification de la disponibilité des modèles IA GGUF (ALLaM 7B & BGE-M3) au démarrage
function checkAIModels() {
  const modelsDir = path.join(process.cwd(), 'models');
  const chatModelName = 'ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf';
  const embedModelName = 'bge-m3-q4_k_m.gguf';

  const chatPath = process.env.LLAMA_CHAT_MODEL_PATH || path.join(modelsDir, chatModelName);
  const embedPath = process.env.LLAMA_EMBEDDING_MODEL_PATH || path.join(modelsDir, embedModelName);

  const hasChat = fs.existsSync(chatPath) || fs.existsSync(path.join(modelsDir, 'qwen2.5-7b-instruct-q4_k_m.gguf'));
  const hasEmbed = fs.existsSync(embedPath) || fs.existsSync(path.join(modelsDir, 'nomic-embed-text-v1.5.Q8_0.gguf'));

  if (!hasChat || !hasEmbed) {
    console.warn('\n' + '═'.repeat(78));
    console.warn("⚠️ MODÈLE IA MANQUANT. Lancez 'npm run download-models' ou 'npm run setup' pour télécharger ALLaM et BGE-M3.");
    if (!hasChat) console.warn(`   ❌ Modèle Chat absent : ${path.basename(chatPath)}`);
    if (!hasEmbed) console.warn(`   ❌ Modèle Embedding absent : ${path.basename(embedPath)}`);
    console.warn('═'.repeat(78) + '\n');
  } else {
    console.log('[AI] ✅ Modèles GGUF détectés et prêts pour l\'inférence.');
  }
}

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
    app.get('(.*)', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`🔴 Port ${PORT} already in use. Waiting or retry.`);
    } else {
      console.error('Server error:', err);
    }
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    checkAIModels();
  });
}

start().catch((err: unknown) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

