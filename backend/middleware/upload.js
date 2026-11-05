const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'uploads');
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
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'user-' + uniqueSuffix + ext);
  }
});

// Configure storage for personnel photos
const personnelPhotoStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, personnelPhotoDir);
  },
  filename: function(req, file, cb) {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
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
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
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
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
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
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'template-' + uniqueSuffix + ext);
  }
});

// File filter for photos (stricte validation extension + MIME type)
const photoFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const extMatch = file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  
  if (!extMatch || !allowedMimeTypes.includes(file.mimetype)) {
    req.fileValidationError = 'Only valid image files (JPG, PNG, GIF, WEBP) are allowed!';
    return cb(new Error('Only valid image files (JPG, PNG, GIF, WEBP) are allowed!'), false);
  }
  cb(null, true);
};

// File filter for documents (stricte validation PDF extension + MIME type)
const documentFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf'];
  const extMatch = file.originalname.match(/\.pdf$/i);
  
  if (!extMatch || (!allowedMimeTypes.includes(file.mimetype) && file.mimetype !== 'application/x-pdf')) {
    req.fileValidationError = 'Only PDF files are allowed!';
    return cb(new Error('Only PDF files are allowed!'), false);
  }
  cb(null, true);
};

// File filter for templates (Word documents extension + MIME type)
const templateFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream'
  ];
  const extMatch = file.originalname.match(/\.(doc|docx)$/i);
  
  if (!extMatch || !allowedMimeTypes.includes(file.mimetype)) {
    req.fileValidationError = 'Only Word documents (.doc, .docx) are allowed!';
    return cb(new Error('Only Word documents (.doc, .docx) are allowed!'), false);
  }
  cb(null, true);
};

// Handle scanned document paths with strict Path Traversal protection
exports.handleScannedDocument = (req, res, next) => {
  if (req.body && req.body.scannedDocumentPath) {
    const rawPath = String(req.body.scannedDocumentPath);
    const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || uploadDir);
    const requestedPath = path.isAbsolute(rawPath) ? path.resolve(rawPath) : path.resolve(process.cwd(), rawPath);

    // Ensure path stays within allowed uploads root
    if (!requestedPath.startsWith(UPLOAD_ROOT + path.sep)) {
      return res.status(400).json({ success: false, message: 'Invalid file path' });
    }

    if (!fs.existsSync(requestedPath) || !fs.statSync(requestedPath).isFile()) {
      return res.status(400).json({ success: false, message: 'File not found' });
    }

    req.file = {
      path: requestedPath,
      filename: path.basename(requestedPath)
    };
  }
  next();
};

// Export configured multer instances
exports.uploadUserPhoto = multer({ 
  storage: userPhotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: photoFilter
});

exports.uploadPersonnelPhoto = multer({ 
  storage: personnelPhotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: photoFilter
});

exports.uploadDocument = (req, res, next) => {
  // If there's already a scannedDocumentPath, skip multer and handle it
  if (req.body.scannedDocumentPath) {
    return exports.handleScannedDocument(req, res, next);
  }
  
  // Otherwise, use multer to handle the uploaded file
  multer({
    storage: documentStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: documentFilter
  }).single('document')(req, res, (err) => {
    if (err) {
      return next(err);
    }
    next();
  });
};

exports.upload = multer({
  storage: attachmentStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Export template upload configuration
exports.uploadTemplate = multer({ 
  storage: templateStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: templateFilter
});
