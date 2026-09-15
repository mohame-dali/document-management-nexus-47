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

// File filter for photos
const photoFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    req.fileValidationError = 'Only image files are allowed!';
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

// File filter for documents
const documentFilter = (req, file, cb) => {
  // Accept only PDF files
  if (!file.originalname.match(/\.(pdf|PDF)$/)) {
    req.fileValidationError = 'Only PDF files are allowed!';
    return cb(new Error('Only PDF files are allowed!'), false);
  }
  cb(null, true);
};

// File filter for templates (Word documents)
const templateFilter = (req, file, cb) => {
  // Accept only Word documents
  if (!file.originalname.match(/\.(doc|docx|DOC|DOCX)$/)) {
    req.fileValidationError = 'Only Word documents are allowed!';
    return cb(new Error('Only Word documents are allowed!'), false);
  }
  cb(null, true);
};

// Handle scanned document paths
exports.handleScannedDocument = (req, res, next) => {
  // If a scanned document path is provided in the request body, use it
  if (req.body.scannedDocumentPath) {
    req.file = {
      path: req.body.scannedDocumentPath,
      filename: path.basename(req.body.scannedDocumentPath)
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
