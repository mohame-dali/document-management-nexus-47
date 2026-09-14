const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const BackupPolicy = require('../models/BackupPolicy');
const BackupHistory = require('../models/BackupHistory');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');

// @desc    Get backup statistics
// @route   GET /api/backup/stats
// @access  Private (Admin roles only)
exports.getBackupStats = asyncHandler(async (req, res, next) => {
  // Get document counts
  const totalIncomingDocuments = await IncomingDocument.countDocuments();
  const totalOutgoingDocuments = await OutgoingDocument.countDocuments();

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get this week's date range
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  // Get this month's date range
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  // Count documents created in different periods
  const documentsCreatedToday = await IncomingDocument.countDocuments({
    createdAt: { $gte: today, $lt: tomorrow }
  }) + await OutgoingDocument.countDocuments({
    createdAt: { $gte: today, $lt: tomorrow }
  });

  const documentsCreatedThisWeek = await IncomingDocument.countDocuments({
    createdAt: { $gte: startOfWeek, $lt: endOfWeek }
  }) + await OutgoingDocument.countDocuments({
    createdAt: { $gte: startOfWeek, $lt: endOfWeek }
  });

  const documentsCreatedThisMonth = await IncomingDocument.countDocuments({
    createdAt: { $gte: startOfMonth, $lt: endOfMonth }
  }) + await OutgoingDocument.countDocuments({
    createdAt: { $gte: startOfMonth, $lt: endOfMonth }
  });

  // Get last backup date
  const lastBackup = await BackupHistory.findOne({ status: 'completed' })
    .sort({ endTime: -1 });

  // Calculate estimated file size (simplified calculation)
  const estimatedSizeBytes = (totalIncomingDocuments + totalOutgoingDocuments) * 1024 * 50; // Rough estimate
  const totalFileSize = formatFileSize(estimatedSizeBytes);

  res.status(200).json({
    success: true,
    data: {
      totalIncomingDocuments,
      totalOutgoingDocuments,
      totalFileSize,
      lastBackupDate: lastBackup ? lastBackup.endTime : null,
      documentsCreatedToday,
      documentsCreatedThisWeek,
      documentsCreatedThisMonth
    }
  });
});

// @desc    Get backup policy
// @route   GET /api/backup/policy
// @access  Private (Admin roles only)
exports.getBackupPolicy = asyncHandler(async (req, res, next) => {
  let policy = await BackupPolicy.findOne().sort({ updatedAt: -1 });
  
  if (!policy) {
    // Create default policy if none exists
    policy = await BackupPolicy.create({
      enabled: false,
      frequency: 'weekly',
      includeAttachments: true,
      compressionLevel: 'medium',
      retentionDays: 30,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });
  }

  res.status(200).json({
    success: true,
    data: policy
  });
});

// @desc    Update backup policy
// @route   PUT /api/backup/policy
// @access  Private (Admin roles only)
exports.updateBackupPolicy = asyncHandler(async (req, res, next) => {
  const { enabled, frequency, includeAttachments, compressionLevel, retentionDays } = req.body;

  let policy = await BackupPolicy.findOne().sort({ updatedAt: -1 });
  
  if (!policy) {
    policy = await BackupPolicy.create({
      enabled,
      frequency,
      includeAttachments,
      compressionLevel,
      retentionDays,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });
  } else {
    policy = await BackupPolicy.findByIdAndUpdate(
      policy._id,
      {
        enabled,
        frequency,
        includeAttachments,
        compressionLevel,
        retentionDays,
        updatedBy: req.user.id
      },
      { new: true, runValidators: true }
    );
  }

  res.status(200).json({
    success: true,
    data: policy
  });
});

// @desc    Create manual backup
// @route   POST /api/backup/create
// @access  Private (Admin roles only)
exports.createBackup = asyncHandler(async (req, res, next) => {
  const { year, exportPath } = req.body;
  const policy = await BackupPolicy.findOne().sort({ updatedAt: -1 });
  const includeAttachments = policy ? policy.includeAttachments : true;
  const compressionLevel = policy ? policy.compressionLevel : 'medium';

  // Create backup history record
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = year ? `backup-${year}-${timestamp}.zip` : `backup-${timestamp}.zip`;
  const backupDir = exportPath || path.join(process.cwd(), 'backups');
  const filePath = path.join(backupDir, fileName);

  // Ensure backup directory exists
  try {
    await fs.mkdir(backupDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const backupRecord = await BackupHistory.create({
    type: 'manual',
    fileName,
    filePath,
    includeAttachments,
    compressionLevel,
    createdBy: req.user.id,
    backupYear: year || null,
    exportPath: exportPath || null
  });

  // Start backup process in background
  processBackup(backupRecord._id, includeAttachments, compressionLevel, year);

  res.status(201).json({
    success: true,
    data: {
      backupId: backupRecord._id,
      message: year ? `Backup for year ${year} creation started` : 'Backup process started'
    }
  });
});

// @desc    Get backup status
// @route   GET /api/backup/status/:id
// @access  Private (Admin roles only)
exports.getBackupStatus = asyncHandler(async (req, res, next) => {
  const backup = await BackupHistory.findById(req.params.id);

  if (!backup) {
    return next(new ErrorResponse('Backup not found', 404));
  }

  res.status(200).json({
    success: true,
    data: backup
  });
});

// @desc    Get backup history
// @route   GET /api/backup/history
// @access  Private (Admin roles only)
exports.getBackupHistory = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const total = await BackupHistory.countDocuments();
  const backups = await BackupHistory.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(startIndex)
    .populate('createdBy', 'name');

  // Pagination result
  const pagination = {};

  if (startIndex + limit < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: backups.length,
    pagination,
    data: backups
  });
});

// Helper function to process backup
async function processBackup(backupId, includeAttachments, compressionLevel, year = null) {
  try {
    const backup = await BackupHistory.findById(backupId);
    if (!backup) return;

    // Filter documents by year if specified
    let incomingQuery = {};
    let outgoingQuery = {};
    
    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${parseInt(year) + 1}-01-01`);
      incomingQuery.createdAt = { $gte: startDate, $lt: endDate };
      outgoingQuery.createdAt = { $gte: startDate, $lt: endDate };
    }

    // Get documents
    const incomingDocs = await IncomingDocument.find(incomingQuery).populate('createdBy folder');
    const outgoingDocs = await OutgoingDocument.find(outgoingQuery).populate('createdBy');

    // Create archive
    const output = require('fs').createWriteStream(backup.filePath);
    const archive = archiver('zip', {
      zlib: { level: getCompressionLevel(compressionLevel) }
    });

    output.on('close', async () => {
      // Update backup record on completion
      await BackupHistory.findByIdAndUpdate(backupId, {
        status: 'completed',
        endTime: new Date(),
        fileSize: archive.pointer(),
        filePath: backup.filePath,
        documentsCount: {
          incomingDocuments: incomingDocs.length,
          outgoingDocuments: outgoingDocs.length
        }
      });

      // Update policy last backup date
      await BackupPolicy.findOneAndUpdate(
        {},
        { lastBackupDate: new Date() },
        { sort: { updatedAt: -1 } }
      );
    });

    output.on('error', async (err) => {
      await BackupHistory.findByIdAndUpdate(backupId, {
        status: 'failed',
        endTime: new Date(),
        errorMessage: err.message
      });
    });

    archive.pipe(output);

    if (year) {
      // Create year-based folder structure like courrier/2025/Incoming-Doc and courrier/2025/Outgoing-Doc
      const yearFolder = `courrier/${year}`;
      
      // Add JSON metadata for the year
      archive.append(JSON.stringify(incomingDocs, null, 2), { name: `${yearFolder}/incoming-documents-${year}.json` });
      archive.append(JSON.stringify(outgoingDocs, null, 2), { name: `${yearFolder}/outgoing-documents-${year}.json` });
      
      // Add PDF documents to appropriate folders
      for (const doc of incomingDocs) {
        let pdfPath = null;
        let pdfName = `${doc.serialNumber || doc._id}.pdf`;
        
        console.log(`Processing incoming document: ${doc._id}, scannedDocument: ${doc.scannedDocument}, serialNumber: ${doc.serialNumber}`);
        
        // Check for scannedDocument first (priority)
        if (doc.scannedDocument) {
          // Handle both relative and absolute paths
          if (doc.scannedDocument.startsWith('courrier/')) {
            // Relative path from project root
            pdfPath = path.join(__dirname, '../../', doc.scannedDocument);
            pdfName = path.basename(doc.scannedDocument);
          } else if (path.isAbsolute(doc.scannedDocument)) {
            // Absolute path
            pdfPath = doc.scannedDocument;
            pdfName = path.basename(doc.scannedDocument);
          } else {
            // Relative path from uploads
            pdfPath = path.join(__dirname, '../../uploads', doc.scannedDocument);
          }
        }
        // Fallback to attachment if no scannedDocument
        else if (doc.attachment && doc.attachment.filename) {
          pdfPath = path.join(__dirname, '../../uploads', doc.attachment.filename);
        }
        
        console.log(`Resolved PDF path: ${pdfPath}, PDF name: ${pdfName}`);
        
        if (pdfPath) {
          try {
            const stats = require('fs').statSync(pdfPath);
            if (stats.isFile()) {
              console.log(`Adding PDF to backup: ${pdfPath} -> ${yearFolder}/Incoming-Doc/${pdfName}`);
              archive.file(pdfPath, { name: `${yearFolder}/Incoming-Doc/${pdfName}` });
            } else {
              console.log(`Not a file: ${pdfPath}`);
            }
          } catch (error) {
            console.log(`File not found or error accessing: ${pdfPath} - Error: ${error.message}`);
          }
        } else {
          console.log(`No PDF path found for document: ${doc._id}`);
        }
      }
      
      for (const doc of outgoingDocs) {
        let pdfPath = null;
        let pdfName = `${doc.serialNumber || doc._id}.pdf`;
        
        console.log(`Processing outgoing document: ${doc._id}, scannedDocument: ${doc.scannedDocument}, serialNumber: ${doc.serialNumber}`);
        
        // Check for scannedDocument first (priority)
        if (doc.scannedDocument) {
          // Handle both relative and absolute paths
          if (doc.scannedDocument.startsWith('courrier/')) {
            // Relative path from project root
            pdfPath = path.join(__dirname, '../../', doc.scannedDocument);
            pdfName = path.basename(doc.scannedDocument);
          } else if (path.isAbsolute(doc.scannedDocument)) {
            // Absolute path
            pdfPath = doc.scannedDocument;
            pdfName = path.basename(doc.scannedDocument);
          } else {
            // Relative path from uploads
            pdfPath = path.join(__dirname, '../../uploads', doc.scannedDocument);
          }
        }
        // Fallback to attachment if no scannedDocument
        else if (doc.attachment && doc.attachment.filename) {
          pdfPath = path.join(__dirname, '../../uploads', doc.attachment.filename);
        }
        
        console.log(`Resolved PDF path: ${pdfPath}, PDF name: ${pdfName}`);
        
        if (pdfPath) {
          try {
            const stats = require('fs').statSync(pdfPath);
            if (stats.isFile()) {
              console.log(`Adding PDF to backup: ${pdfPath} -> ${yearFolder}/Outgoing-Doc/${pdfName}`);
              archive.file(pdfPath, { name: `${yearFolder}/Outgoing-Doc/${pdfName}` });
            } else {
              console.log(`Not a file: ${pdfPath}`);
            }
          } catch (error) {
            console.log(`File not found or error accessing: ${pdfPath} - Error: ${error.message}`);
          }
        } else {
          console.log(`No PDF path found for document: ${doc._id}`);
        }
      }
    } else {
      // Regular backup format
      archive.append(JSON.stringify(incomingDocs, null, 2), { name: 'incoming-documents.json' });
      archive.append(JSON.stringify(outgoingDocs, null, 2), { name: 'outgoing-documents.json' });
      
      // Add PDF documents (scanned documents and attachments)
      if (includeAttachments) {
        // Process incoming documents
        for (const doc of incomingDocs) {
          let pdfPath = null;
          let pdfName = `incoming-${doc.serialNumber || doc._id}.pdf`;
          
          console.log(`Processing incoming document (regular backup): ${doc._id}, scannedDocument: ${doc.scannedDocument}, serialNumber: ${doc.serialNumber}`);
          
          // Check for scannedDocument first (priority)
          if (doc.scannedDocument) {
            // Handle both relative and absolute paths
            if (doc.scannedDocument.startsWith('courrier/')) {
              // Relative path from project root
              pdfPath = path.join(__dirname, '../../', doc.scannedDocument);
              pdfName = path.basename(doc.scannedDocument);
            } else if (path.isAbsolute(doc.scannedDocument)) {
              // Absolute path
              pdfPath = doc.scannedDocument;
              pdfName = path.basename(doc.scannedDocument);
            } else {
              // Relative path from uploads
              pdfPath = path.join(__dirname, '../../uploads', doc.scannedDocument);
            }
          }
          // Fallback to attachment if no scannedDocument
          else if (doc.attachment && doc.attachment.filename) {
            pdfPath = path.join(__dirname, '../../uploads', doc.attachment.filename);
            pdfName = doc.attachment.filename;
          }
          
          console.log(`Resolved PDF path: ${pdfPath}, PDF name: ${pdfName}`);
          
          if (pdfPath) {
            try {
              const stats = require('fs').statSync(pdfPath);
              if (stats.isFile()) {
                // Extract year from document or use current year for folder structure
                const docYear = doc.year || new Date(doc.createdAt).getFullYear();
                const backupPath = `courrier/${docYear}/Incoming-Doc/${pdfName}`;
                console.log(`Adding PDF to backup: ${pdfPath} -> ${backupPath}`);
                archive.file(pdfPath, { name: backupPath });
              } else {
                console.log(`Not a file: ${pdfPath}`);
              }
            } catch (error) {
              console.log(`File not found or error accessing: ${pdfPath} - Error: ${error.message}`);
            }
          } else {
            console.log(`No PDF path found for document: ${doc._id}`);
          }
        }
        
        // Process outgoing documents
        for (const doc of outgoingDocs) {
          let pdfPath = null;
          let pdfName = `outgoing-${doc.serialNumber || doc._id}.pdf`;
          
          console.log(`Processing outgoing document (regular backup): ${doc._id}, scannedDocument: ${doc.scannedDocument}, serialNumber: ${doc.serialNumber}`);
          
          // Check for scannedDocument first (priority)
          if (doc.scannedDocument) {
            // Handle both relative and absolute paths
            if (doc.scannedDocument.startsWith('courrier/')) {
              // Relative path from project root
              pdfPath = path.join(__dirname, '../../', doc.scannedDocument);
              pdfName = path.basename(doc.scannedDocument);
            } else if (path.isAbsolute(doc.scannedDocument)) {
              // Absolute path
              pdfPath = doc.scannedDocument;
              pdfName = path.basename(doc.scannedDocument);
            } else {
              // Relative path from uploads
              pdfPath = path.join(__dirname, '../../uploads', doc.scannedDocument);
            }
          }
          // Fallback to attachment if no scannedDocument
          else if (doc.attachment && doc.attachment.filename) {
            pdfPath = path.join(__dirname, '../../uploads', doc.attachment.filename);
            pdfName = doc.attachment.filename;
          }
          
          console.log(`Resolved PDF path: ${pdfPath}, PDF name: ${pdfName}`);
          
          if (pdfPath) {
            try {
              const stats = require('fs').statSync(pdfPath);
              if (stats.isFile()) {
                // Extract year from document or use current year for folder structure
                const docYear = doc.year || new Date(doc.createdAt).getFullYear();
                const backupPath = `courrier/${docYear}/Outgoing-Doc/${pdfName}`;
                console.log(`Adding PDF to backup: ${pdfPath} -> ${backupPath}`);
                archive.file(pdfPath, { name: backupPath });
              } else {
                console.log(`Not a file: ${pdfPath}`);
              }
            } catch (error) {
              console.log(`File not found or error accessing: ${pdfPath} - Error: ${error.message}`);
            }
          } else {
            console.log(`No PDF path found for document: ${doc._id}`);
          }
        }
      }
    }

    archive.finalize();
  } catch (error) {
    await BackupHistory.findByIdAndUpdate(backupId, {
      status: 'failed',
      endTime: new Date(),
      errorMessage: error.message
    });
  }
}

// Helper functions
function getCompressionLevel(level) {
  switch (level) {
    case 'low': return 1;
    case 'medium': return 5;
    case 'high': return 9;
    default: return 5;
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}