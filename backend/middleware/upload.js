const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ErrorResponse = require('../utils/errorResponse');
const {
  precheckFileFilter,
  validateUploadedFile,
  removeFileSafe,
} = require('../utils/fileSecurity');

// Create uploads directory if it doesn't exist (shared application root)
const uploadDir = path.resolve(
  process.env.UPLOAD_PATH || process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads')
);
const usersPhotoDir = path.join(uploadDir, 'usersphoto');
const personnelPhotoDir = path.join(uploadDir, 'personnelphoto');
const tempDir = path.join(uploadDir, 'temp');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(usersPhotoDir)) {
  fs.mkdirSync(usersPhotoDir, { recursive: true });
}

if (!fs.existsSync(personnelPhotoDir)) {
  fs.mkdirSync(personnelPhotoDir, { recursive: true });
}

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure storage for user photos
const userPhotoStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, usersPhotoDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'user-' + uniqueSuffix + ext);
  }
});

// Configure storage for personnel photos
const personnelPhotoStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, personnelPhotoDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'personnel-' + uniqueSuffix + ext);
  }
});

// Configure storage for documents (incoming and outgoing)
// This is just a temporary storage, documents will be moved to appropriate folders later
const documentStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, tempDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'doc-' + uniqueSuffix + ext);
  }
});

// Configure storage for message attachments
const attachmentStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const attachmentDir = path.join(uploadDir, 'attachments');
    if (!fs.existsSync(attachmentDir)) {
      fs.mkdirSync(attachmentDir, { recursive: true });
    }
    cb(null, attachmentDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'msg-' + uniqueSuffix + ext);
  }
});

// Configure storage for templates
const templateStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const templateDir = path.join(uploadDir, 'templates');
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }
    cb(null, templateDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'template-' + uniqueSuffix + ext);
  }
});

function makeFileFilter(context) {
  return (req, file, cb) => {
    const check = precheckFileFilter(file, context);
    if (!check.valid) {
      req.fileValidationError = check.message;
      return cb(new ErrorResponse(check.message, check.statusCode || 415), false);
    }
    cb(null, true);
  };
}

function collectUploadedFiles(req) {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') {
    return Object.values(req.files).flat();
  }
  return [];
}

function createSecureMulter(multerInstance, context) {
  const wrapMethod = (methodName) => (...args) => {
    const multerMiddleware = multerInstance[methodName](...args);
    return (req, res, next) => {
      multerMiddleware(req, res, async (err) => {
        if (err) {
          return next(err);
        }
        const files = collectUploadedFiles(req);
        if (files.length === 0) {
          return next();
        }
        try {
          for (const file of files) {
            await validateUploadedFile(file.path, context, file.originalname);
          }
          return next();
        } catch (secErr) {
          for (const file of files) {
            removeFileSafe(file.path);
          }
          return next(secErr);
        }
      });
    };
  };

  return {
    single: wrapMethod('single'),
    array: wrapMethod('array'),
    fields: wrapMethod('fields'),
    any: wrapMethod('any'),
    none: wrapMethod('none'),
  };
}

// Handle scanned document IDs & paths with strict owner + Path Traversal protection
exports.handleScannedDocument = (req, res, next) => {
  const rawScanId = req.body?.scanId ? String(req.body.scanId).trim() : '';
  const rawPath = req.body?.scannedDocumentPath ? String(req.body.scannedDocumentPath).trim() : '';

  if (!rawScanId && !rawPath) {
    return next();
  }

  // Extract scanId from either explicit scanId field or /api/scan/file/<scanId>
  let resolvedScanId = rawScanId;
  if (!resolvedScanId && rawPath) {
    const urlMatch = rawPath.match(/^(?:\/api)?\/scan\/file\/([A-Za-z0-9_-]{8,64})$/);
    if (urlMatch) {
      resolvedScanId = urlMatch[1];
    }
  }

  if (resolvedScanId) {
    const scannerService = require('../utils/scanner');
    const { validateScanId } = require('../utils/scanner/validation');
    try {
      const safeScanId = validateScanId(resolvedScanId);
      const job = scannerService.getStatusManager().getJob(safeScanId);
      const requestUserId = String(req.user?.id || req.user?._id || '');

      if (!job) {
        return res.status(400).json({ success: false, message: 'Scanned job not found' });
      }
      if (job.ownerId && requestUserId && job.ownerId !== requestUserId) {
        return res.status(403).json({ success: false, message: 'Forbidden scan access' });
      }
      if (job.stage !== 'done' || !job.filePath) {
        return res.status(400).json({ success: false, message: 'Scanned file not ready' });
      }

      const allowedTempRoot = path.resolve(scannerService.getConfig().tempDir);
      const jobFilePath = path.resolve(job.filePath);
      if (!jobFilePath.startsWith(allowedTempRoot + path.sep) || !fs.existsSync(jobFilePath)) {
        return res.status(400).json({ success: false, message: 'Scanned file not found' });
      }

      req.body.scannedDocumentPath = jobFilePath;
      return next();
    } catch (_) {
      return res.status(400).json({ success: false, message: 'Invalid scan identifier' });
    }
  }

  // Fallback for courrier/... relative DB paths or direct temp upload paths
  const courrierRoot = path.resolve(__dirname, '..', 'courrier');
  if (rawPath.startsWith('courrier/')) {
    const courrierPath = path.resolve(__dirname, '..', rawPath);
    if (!courrierPath.startsWith(courrierRoot + path.sep) || !fs.existsSync(courrierPath)) {
      return res.status(400).json({ success: false, message: 'Invalid file path' });
    }
    return next();
  }

  const requestedPath = path.isAbsolute(rawPath) ? path.resolve(rawPath) : path.resolve(process.cwd(), rawPath);
  if (!requestedPath.startsWith(uploadDir + path.sep)) {
    return res.status(400).json({ success: false, message: 'Invalid file path' });
  }
  if (!fs.existsSync(requestedPath) || !fs.statSync(requestedPath).isFile()) {
    return res.status(400).json({ success: false, message: 'File not found' });
  }

  req.body.scannedDocumentPath = requestedPath;
  return next();
};

// Export configured secure multer instances
exports.uploadUserPhoto = createSecureMulter(
  multer({
    storage: userPhotoStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: makeFileFilter('photo'),
  }),
  'photo'
);

exports.uploadPersonnelPhoto = createSecureMulter(
  multer({
    storage: personnelPhotoStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: makeFileFilter('photo'),
  }),
  'photo'
);

const documentMulter = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: makeFileFilter('document'),
}).single('document');

exports.uploadDocument = (req, res, next) => {
  if (req.body && (req.body.scanId || req.body.scannedDocumentPath)) {
    return exports.handleScannedDocument(req, res, next);
  }

  documentMulter(req, res, async (err) => {
    if (err) {
      return next(err);
    }
    if (req.file) {
      try {
        await validateUploadedFile(req.file.path, 'document', req.file.originalname);
      } catch (secErr) {
        removeFileSafe(req.file.path);
        return next(secErr);
      }
    }
    if (req.body && (req.body.scanId || req.body.scannedDocumentPath) && !req.file) {
      return exports.handleScannedDocument(req, res, next);
    }
    next();
  });
};

exports.upload = createSecureMulter(
  multer({
    storage: attachmentStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: makeFileFilter('attachment'),
  }),
  'attachment'
);

// Export template upload configuration
exports.uploadTemplate = createSecureMulter(
  multer({
    storage: templateStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: makeFileFilter('template'),
  }),
  'template'
);

