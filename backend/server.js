const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const errorHandler = require('./middleware/error');
const cookieParser = require('cookie-parser');

// Load env vars
dotenv.config();

// Set default JWT cookie expiration if not provided
if (!process.env.JWT_COOKIE_EXPIRE) {
  process.env.JWT_COOKIE_EXPIRE = 30; // Default to 30 days
}

// Connect to database
connectDB();

const app = express();
const httpServer = createServer(app);

// CORS Allowed Origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origine non autorisée par CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.io connection handler
require('./sockets/index')(io);

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Enable CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origine non autorisée par CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With']
}));

const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: false,           // Désactiver CSP pour éviter les blocages frontend (React, Axios, images)
  crossOriginResourcePolicy: { policy: 'cross-origin' },  // Autorise les images /uploads depuis le frontend
  crossOriginEmbedderPolicy: false,       // Évite les blocages d'embed
  hsts: {
    maxAge: 31536000,                     // 1 an en secondes (HSTS uniquement en production HTTPS)
    includeSubDomains: true,
    preload: true
  }
}));

const rateLimit = require('express-rate-limit');

// Trust proxy si derrière un reverse proxy (Nginx, Heroku, etc.)
// app.set('trust proxy', 1);   // Décommenter si nécessaire

// Limiteur global pour toutes les APIs
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,        // Fenêtre de 15 minutes
  max: 500,                         // 500 requêtes max par IP
  standardHeaders: true,            // Retourne les headers RateLimit-*
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de requêtes. Réessayez dans 15 minutes.'
  }
});

// Limiteur strict pour le login (anti brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,                           // 5 tentatives max par IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,     // Ne compte pas les logins réussis
  message: {
    success: false,
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
  }
});

// Appliquer les limiteurs
app.use('/api', globalLimiter);
app.use('/api/auth/login', loginLimiter);

// Set static folders for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/usersphoto', express.static(path.join(__dirname, 'uploads/usersphoto')));
app.use('/uploads/personnelphoto', express.static(path.join(__dirname, 'uploads/personnelphoto')));

// Add static serving for courrier documents
app.use('/courrier', express.static(path.join(__dirname, 'courrier')));

// Add static serving for templates
app.use('/uploads/templates', express.static(path.join(__dirname, 'uploads/templates')));

// Route files
const auth = require('./routes/auth');
const users = require('./routes/users');
const departments = require('./routes/departments');
const incomingDocuments = require('./routes/incomingDocuments');
const outgoingDocuments = require('./routes/outgoingDocuments');
const folders = require('./routes/folders');
const messages = require('./routes/messages');
const documentOptions = require('./routes/documentOptions');
const scan = require('./routes/scan');
const serialNumber = require('./routes/serialNumber');
const templates = require('./routes/templates');
const responsibleNotifications = require('./routes/responsibleNotifications');
const auditLogs = require('./routes/auditLogs');
const activityNotifications = require('./routes/activityNotifications');
const messageSettings = require('./routes/messageSettings');
const backup = require('./routes/backup');
const organizationSettings = require('./routes/organizationSettingsRoutes');
const hrPersonnel = require('./routes/personnelRoutes');
const hrPersonnelDocuments = require('./routes/personnelDocumentRoutes');

// Mount routers
app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/departments', departments);
app.use('/api/incoming-documents', incomingDocuments);
app.use('/api/outgoing-documents', outgoingDocuments);
app.use('/api/folders', folders);
app.use('/api/messages', messages);
app.use('/api/document-options', documentOptions);
app.use('/api/scan', scan);
app.use('/api/serial-number', serialNumber);
app.use('/api/templates', templates);
app.use('/api/responsible-notifications', responsibleNotifications);
app.use('/api/audit-logs', auditLogs);
app.use('/api/activity-notifications', activityNotifications);
app.use('/api/message-settings', messageSettings);
app.use('/api/backup', backup);
app.use('/api/organization-settings', organizationSettings);
app.use('/api/hr', hrPersonnel);
app.use('/api/hr', hrPersonnelDocuments);

// Add a simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Try to start the server, if port is in use, increment and try again
const startServer = (port) => {
  httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Access the API at http://localhost:${port}/api`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error(err);
    }
  });
};

startServer(PORT);

// Scanner service integration with sockets
const scannerService = require('./utils/scanner');

// Check scanner hardware on server startup
console.log('\n===== CHECKING FOR SCANNER HARDWARE =====');
console.log('Checking for connected scanners...');

// List available scanners and display in console
scannerService.listScanners()
  .then(scanners => {
    console.log('\nScanner Hardware Status:');
    console.log('---------------------------');
    if (scanners && scanners.length > 0) {
      console.log(`Found ${scanners.length} scanner(s):`);
      scanners.forEach((scanner, index) => {
        console.log(`\n[Scanner ${index + 1}]`);
        console.log(`ID: ${scanner.id || 'N/A'}`);
        console.log(`Name: ${scanner.name || 'Unknown'}`);
        console.log(`Status: ${scanner.status || 'N/A'}`);
      });
    } else {
      console.log('No physical scanners detected.');
      console.log('Please make sure your scanner is properly connected and drivers are installed.');
    }
    console.log('---------------------------\n');
  })
  .catch(error => {
    console.error('\nScanner Hardware Error:');
    console.error('---------------------------');
    console.error(`Error: ${error.message}`);
    console.error('Check scanner connections and drivers.');
    console.error('---------------------------\n');
  });

// Forward scanner events to connected clients
scannerService.on('scanStart', (data) => {
  io.emit('scan:started', data);
});

scannerService.on('scanComplete', (data) => {
  io.emit('scan:completed', data);
});

scannerService.on('scanError', (error) => {
  io.emit('scan:error', { message: error.message });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  httpServer.close(() => process.exit(1));
});
