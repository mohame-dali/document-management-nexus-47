const mongoose = require('mongoose');
const { execFile } = require('child_process');
const util = require('util');
const fsSync = require('fs');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');

const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const BackupPolicy = require('../models/BackupPolicy');
const BackupHistory = require('../models/BackupHistory');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const Personnel = require('../models/Personnel');
const Attendance = require('../models/Attendance');
const RHStage = require('../models/RHStage');
const RHPromotion = require('../models/rh/RHPromotion');
const RHPoste = require('../models/rh/RHPoste');
const RHDiplome = require('../models/rh/RHDiplome');
const RHSanction = require('../models/rh/RHSanction');
const AttendanceDeclaration = require('../models/AttendanceDeclaration');
const PersonnelDocument = require('../models/PersonnelDocument');
const LeaveReason = require('../models/LeaveReason');

const execFileAsync = util.promisify(execFile);

const BACKEND_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Définition symétrique sauvegarde <-> restauration des collections RH (ordre respectant les dépendances)
const HR_COLLECTIONS = [
  { key: 'LeaveReason', fileName: 'leave-reasons.json', model: LeaveReason },
  { key: 'Personnel', fileName: 'personnel.json', model: Personnel },
  { key: 'Attendance', fileName: 'attendance.json', model: Attendance },
  { key: 'AttendanceDeclaration', fileName: 'attendance-declarations.json', model: AttendanceDeclaration },
  { key: 'RHStage', fileName: 'rh-stages.json', model: RHStage },
  { key: 'RHPromotion', fileName: 'rh-promotions.json', model: RHPromotion },
  { key: 'RHPoste', fileName: 'rh-postes.json', model: RHPoste },
  { key: 'RHDiplome', fileName: 'rh-diplomes.json', model: RHDiplome },
  { key: 'RHSanction', fileName: 'rh-sanctions.json', model: RHSanction },
  { key: 'PersonnelDocument', fileName: 'personnel-documents.json', model: PersonnelDocument },
];

const HR_PHOTO_UPLOAD_SUBDIRS = ['personnelphoto', 'usersphoto'];

function getDefaultBackupDir() {
  return path.resolve(process.env.BACKUP_PATH || process.env.BACKUP_DIR || path.join(process.cwd(), 'backups'));
}

function getAllowedBackupDirs() {
  return Array.from(new Set([
    path.resolve(process.env.BACKUP_PATH || path.join(process.cwd(), 'backups')),
    path.resolve(process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')),
    path.resolve(process.cwd(), 'backups'),
    path.resolve(BACKEND_ROOT, 'backups'),
  ]));
}

function isPathWithinAllowedBackupDirs(targetPath, extraAllowedDir = null) {
  const resolved = path.resolve(targetPath);
  const dirs = getAllowedBackupDirs();
  if (extraAllowedDir) dirs.push(path.resolve(extraAllowedDir));
  return dirs.some(dir => resolved.startsWith(dir + path.sep) || resolved === dir);
}

/**
 * Mesure récursive réelle sur disque de la taille d'un répertoire (en octets).
 */
async function measureDirectorySize(dirPath) {
  let totalBytes = 0;
  try {
    const stat = await fs.lstat(dirPath);
    if (stat.isSymbolicLink()) return 0;
    if (stat.isFile()) return stat.size;
    if (!stat.isDirectory()) return 0;
  } catch (_err) {
    return 0;
  }

  let entries = [];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (_err) {
    return 0;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      totalBytes += await measureDirectorySize(fullPath);
    } else if (entry.isFile()) {
      try {
        const fileStat = await fs.stat(fullPath);
        totalBytes += fileStat.size;
      } catch (_err) {
        // Ignorer un fichier disparu en cours de parcours
      }
    }
  }
  return totalBytes;
}

/**
 * Mesure la taille réelle totale sur disque des fichiers documents/pièces jointes (courrier/ + uploads/).
 */
async function measureStoredDocumentsSize() {
  const candidateDirs = Array.from(new Set([
    path.join(BACKEND_ROOT, 'courrier'),
    path.join(BACKEND_ROOT, 'uploads'),
    path.join(PROJECT_ROOT, 'courrier'),
    path.join(PROJECT_ROOT, 'uploads'),
  ]));

  let totalBytes = 0;
  for (const dir of candidateDirs) {
    totalBytes += await measureDirectorySize(dir);
  }
  return totalBytes;
}

/**
 * Mesure la taille réelle totale sur disque des archives de sauvegarde terminées.
 */
async function measureCompletedBackupsSize() {
  const completedBackups = await BackupHistory.find({ status: 'completed' }).select('filePath').lean();
  const seenPaths = new Set();
  let totalBytes = 0;

  for (const b of completedBackups) {
    if (!b.filePath) continue;
    const resolved = path.resolve(b.filePath);
    if (seenPaths.has(resolved)) continue;
    seenPaths.add(resolved);
    try {
      const st = await fs.stat(resolved);
      if (st.isFile()) totalBytes += st.size;
    } catch (_err) {
      // Fichier absent sur disque
    }
  }
  return totalBytes;
}

function resolveDocumentPdfInfo(doc, fallbackPrefix) {
  let pdfPath = null;
  let pdfName = `${fallbackPrefix}-${doc.serialNumber || doc._id}.pdf`;

  const roots = Array.from(new Set([
    BACKEND_ROOT,
    PROJECT_ROOT,
    process.cwd(),
  ]));

  if (doc.scannedDocument) {
    if (path.isAbsolute(doc.scannedDocument)) {
      pdfPath = doc.scannedDocument;
      pdfName = path.basename(doc.scannedDocument);
    } else if (doc.scannedDocument.startsWith('courrier/') || doc.scannedDocument.startsWith('uploads/')) {
      pdfName = path.basename(doc.scannedDocument);
      for (const root of roots) {
        const candidate = path.join(root, doc.scannedDocument);
        if (fsSync.existsSync(candidate)) {
          pdfPath = candidate;
          break;
        }
      }
    } else {
      pdfName = path.basename(doc.scannedDocument);
      for (const root of roots) {
        const candidate = path.join(root, 'uploads', doc.scannedDocument);
        if (fsSync.existsSync(candidate)) {
          pdfPath = candidate;
          break;
        }
      }
    }
  } else if (doc.attachment && doc.attachment.filename) {
    pdfName = doc.attachment.filename;
    for (const root of roots) {
      const candidate = path.join(root, 'uploads', doc.attachment.filename);
      if (fsSync.existsSync(candidate)) {
        pdfPath = candidate;
        break;
      }
    }
  }

  return { pdfPath, pdfName };
}

/**
 * Exécute la création complète d'une archive ZIP de sauvegarde (MongoDB dump + JSON + PDFs)
 * et retourne le BackupHistory finalisé avec sa taille réelle mesurée sur disque.
 */
async function runBackupArchive(backupId, includeAttachments, compressionLevel, year = null) {
  let dumpDirToCleanup = null;

  try {
    const backup = await BackupHistory.findById(backupId);
    if (!backup) {
      throw new Error(`BackupHistory introuvable: ${backupId}`);
    }

    await fs.mkdir(path.dirname(backup.filePath), { recursive: true });

    // Trigger MongoDB dump (mongodump) if available
    let dumpResult = null;
    try {
      const { dumpMongoDB } = require('../services/backupScheduler');
      dumpResult = await dumpMongoDB();
      if (dumpResult && dumpResult.dir) {
        dumpDirToCleanup = dumpResult.dir;
      }
    } catch (dumpErr) {
      console.warn('[Backup] MongoDB dump notice in processBackup:', dumpErr.message);
    }

    // Filter documents by year if specified
    const incomingQuery = {};
    const outgoingQuery = {};

    if (year) {
      const parsedYear = parseInt(year, 10);
      const startDate = new Date(`${parsedYear}-01-01`);
      const endDate = new Date(`${parsedYear + 1}-01-01`);
      incomingQuery.createdAt = { $gte: startDate, $lt: endDate };
      outgoingQuery.createdAt = { $gte: startDate, $lt: endDate };
    }

    // Get documents
    const incomingDocs = await IncomingDocument.find(incomingQuery).populate('createdBy folder');
    const outgoingDocs = await OutgoingDocument.find(outgoingQuery).populate('createdBy');

    // Export JSON structuré de toutes les collections RH
    const hrSnapshots = await Promise.all(
      HR_COLLECTIONS.map(async ({ key, fileName, model }) => {
        const docs = await model.find({}).lean();
        return { key, fileName, docs };
      })
    );

    const hrManifest = {
      exportedAt: new Date().toISOString(),
      year: year || null,
      collections: hrSnapshots.reduce((acc, item) => {
        acc[item.key] = {
          fileName: `hr/${item.fileName}`,
          count: item.docs.length,
        };
        return acc;
      }, {}),
    };

    await new Promise((resolve, reject) => {
      const output = fsSync.createWriteStream(backup.filePath);
      const archive = archiver('zip', {
        zlib: { level: getCompressionLevel(compressionLevel) }
      });

      let settled = false;
      const fail = (err) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      output.on('close', () => {
        if (settled) return;
        settled = true;
        resolve();
      });

      output.on('error', fail);
      archive.on('error', fail);
      archive.on('warning', (err) => {
        if (err.code !== 'ENOENT') {
          fail(err);
        }
      });

      archive.pipe(output);

      // Inclure le dump MongoDB dans l'archive si mongodump a réussi
      if (dumpResult && dumpResult.success && dumpResult.dir && fsSync.existsSync(dumpResult.dir)) {
        archive.directory(dumpResult.dir, 'mongodb-dump');
      }

      // Inclure les exports JSON structurés de toutes les collections RH
      archive.append(JSON.stringify(hrManifest, null, 2), { name: 'hr/manifest.json' });
      for (const item of hrSnapshots) {
        archive.append(JSON.stringify(item.docs, null, 2), { name: `hr/${item.fileName}` });
      }

      // Inclure la copie physique des dossiers photos RH (/backend/uploads/personnelphoto et usersphoto)
      for (const subDir of HR_PHOTO_UPLOAD_SUBDIRS) {
        const absPhotoDir = path.join(BACKEND_ROOT, 'uploads', subDir);
        if (fsSync.existsSync(absPhotoDir) && fsSync.statSync(absPhotoDir).isDirectory()) {
          archive.directory(absPhotoDir, `uploads/${subDir}`);
        }
      }

      if (year) {
        const yearFolder = `courrier/${year}`;
        archive.append(JSON.stringify(incomingDocs, null, 2), { name: `${yearFolder}/incoming-documents-${year}.json` });
        archive.append(JSON.stringify(outgoingDocs, null, 2), { name: `${yearFolder}/outgoing-documents-${year}.json` });

        if (includeAttachments) {
          for (const doc of incomingDocs) {
            const { pdfPath, pdfName } = resolveDocumentPdfInfo(doc, 'incoming');
            if (pdfPath && fsSync.existsSync(pdfPath) && fsSync.statSync(pdfPath).isFile()) {
              archive.file(pdfPath, { name: `${yearFolder}/Incoming-Doc/${pdfName}` });
            }
          }

          for (const doc of outgoingDocs) {
            const { pdfPath, pdfName } = resolveDocumentPdfInfo(doc, 'outgoing');
            if (pdfPath && fsSync.existsSync(pdfPath) && fsSync.statSync(pdfPath).isFile()) {
              archive.file(pdfPath, { name: `${yearFolder}/Outgoing-Doc/${pdfName}` });
            }
          }
        }
      } else {
        archive.append(JSON.stringify(incomingDocs, null, 2), { name: 'incoming-documents.json' });
        archive.append(JSON.stringify(outgoingDocs, null, 2), { name: 'outgoing-documents.json' });

        if (includeAttachments) {
          for (const doc of incomingDocs) {
            const { pdfPath, pdfName } = resolveDocumentPdfInfo(doc, 'incoming');
            if (pdfPath && fsSync.existsSync(pdfPath) && fsSync.statSync(pdfPath).isFile()) {
              const docYear = doc.year || new Date(doc.createdAt).getFullYear();
              archive.file(pdfPath, { name: `courrier/${docYear}/Incoming-Doc/${pdfName}` });
            }
          }

          for (const doc of outgoingDocs) {
            const { pdfPath, pdfName } = resolveDocumentPdfInfo(doc, 'outgoing');
            if (pdfPath && fsSync.existsSync(pdfPath) && fsSync.statSync(pdfPath).isFile()) {
              const docYear = doc.year || new Date(doc.createdAt).getFullYear();
              archive.file(pdfPath, { name: `courrier/${docYear}/Outgoing-Doc/${pdfName}` });
            }
          }
        }
      }

      archive.finalize();
    });

    // Mesurer la taille réelle du fichier ZIP écrit sur disque
    const finalStats = await fs.stat(backup.filePath);
    const updatedBackup = await BackupHistory.findByIdAndUpdate(
      backupId,
      {
        status: 'completed',
        endTime: new Date(),
        fileSize: finalStats.size,
        filePath: backup.filePath,
        documentsCount: {
          incomingDocuments: incomingDocs.length,
          outgoingDocuments: outgoingDocs.length
        }
      },
      { new: true }
    );

    await BackupPolicy.findOneAndUpdate(
      {},
      { lastBackupDate: new Date() },
      { sort: { updatedAt: -1 } }
    );

    return updatedBackup;
  } catch (error) {
    await BackupHistory.findByIdAndUpdate(backupId, {
      status: 'failed',
      endTime: new Date(),
      errorMessage: error.message
    }).catch(() => {});
    throw error;
  } finally {
    if (dumpDirToCleanup) {
      await fs.rm(dumpDirToCleanup, { recursive: true, force: true }).catch(() => {});
    }
  }
}

async function validateExtractedTree(rootDir, currentDir = rootDir) {
  const resolvedRoot = path.resolve(rootDir);
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  let fileCount = 0;

  for (const entry of entries) {
    const fullPath = path.resolve(currentDir, entry.name);
    if (!fullPath.startsWith(resolvedRoot + path.sep)) {
      throw new Error(`Chemin dangereux détecté dans l'archive: ${entry.name}`);
    }
    if (entry.isSymbolicLink()) {
      throw new Error(`Lien symbolique interdit détecté dans l'archive: ${entry.name}`);
    }
    if (entry.isDirectory()) {
      fileCount += await validateExtractedTree(resolvedRoot, fullPath);
    } else if (entry.isFile()) {
      fileCount++;
    }
  }

  return fileCount;
}

async function findBsonDumpRoot(tempRestoreDir) {
  const candidates = [
    path.join(tempRestoreDir, 'mongodb-dump'),
    path.join(tempRestoreDir, 'dump'),
    tempRestoreDir,
  ];

  async function containsBson(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.bson')) {
          return true;
        }
        if (entry.isDirectory()) {
          if (await containsBson(path.join(dir, entry.name))) {
            return true;
          }
        }
      }
    } catch (_err) {
      return false;
    }
    return false;
  }

  for (const dir of candidates) {
    if (fsSync.existsSync(dir) && (await containsBson(dir))) {
      return dir;
    }
  }

  return null;
}

async function copyDirectorySafe(sourceDir, targetDir) {
  if (!fsSync.existsSync(sourceDir)) return 0;
  await fs.mkdir(targetDir, { recursive: true, mode: 0o755 });
  await fs.chmod(targetDir, 0o755).catch(() => {});
  const resolvedTarget = path.resolve(targetDir);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  let copiedFiles = 0;

  for (const entry of entries) {
    const srcPath = path.join(sourceDir, entry.name);
    const dstPath = path.resolve(targetDir, entry.name);
    if (!dstPath.startsWith(resolvedTarget + path.sep)) {
      throw new Error(`Chemin de destination invalide lors de la restauration: ${entry.name}`);
    }
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      copiedFiles += await copyDirectorySafe(srcPath, dstPath);
    } else if (entry.isFile()) {
      await fs.mkdir(path.dirname(dstPath), { recursive: true, mode: 0o755 });
      await fs.chmod(path.dirname(dstPath), 0o755).catch(() => {});
      await fs.copyFile(srcPath, dstPath);
      await fs.chmod(dstPath, 0o644).catch(() => {});
      copiedFiles++;
    }
  }

  return copiedFiles;
}

function findHrJsonFilePath(tempRestoreDir, fileName) {
  const hrNestedPath = path.join(tempRestoreDir, 'hr', fileName);
  if (fsSync.existsSync(hrNestedPath)) return hrNestedPath;
  const rootPath = path.join(tempRestoreDir, fileName);
  if (fsSync.existsSync(rootPath)) return rootPath;
  return null;
}

function hasAnyHrJsonFile(tempRestoreDir) {
  return HR_COLLECTIONS.some(({ fileName }) => Boolean(findHrJsonFilePath(tempRestoreDir, fileName)));
}

/**
 * Réinsère dans MongoDB les collections RH exportées au format JSON dans l'archive.
 * Garantit une restauration symétrique à runBackupArchive.
 */
async function restoreHrCollectionsFromJson(tempRestoreDir) {
  const restoredCounts = {};

  for (const { key, fileName, model } of HR_COLLECTIONS) {
    const jsonPath = findHrJsonFilePath(tempRestoreDir, fileName);
    if (!jsonPath) continue;

    const rawContent = await fs.readFile(jsonPath, 'utf8');
    const parsed = JSON.parse(rawContent);
    if (!Array.isArray(parsed)) {
      throw new Error(`Format JSON invalide pour la collection RH ${key} (${fileName})`);
    }

    await model.deleteMany({});
    if (parsed.length > 0) {
      await model.insertMany(parsed, { ordered: true });
    }
    restoredCounts[key] = parsed.length;
  }

  return restoredCounts;
}

// @desc    Get backup statistics (avec taille réelle mesurée sur disque)
// @route   GET /api/backup/stats
// @access  Private (Admin roles only)
exports.getBackupStats = asyncHandler(async (req, res, next) => {
  const [totalIncomingDocuments, totalOutgoingDocuments] = await Promise.all([
    IncomingDocument.countDocuments(),
    OutgoingDocument.countDocuments()
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const [
    documentsCreatedToday,
    documentsCreatedThisWeek,
    documentsCreatedThisMonth,
    lastBackup,
    actualDataBytes,
    actualBackupsBytes
  ] = await Promise.all([
    Promise.all([
      IncomingDocument.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      OutgoingDocument.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } })
    ]).then(([a, b]) => a + b),
    Promise.all([
      IncomingDocument.countDocuments({ createdAt: { $gte: startOfWeek, $lt: endOfWeek } }),
      OutgoingDocument.countDocuments({ createdAt: { $gte: startOfWeek, $lt: endOfWeek } })
    ]).then(([a, b]) => a + b),
    Promise.all([
      IncomingDocument.countDocuments({ createdAt: { $gte: startOfMonth, $lt: endOfMonth } }),
      OutgoingDocument.countDocuments({ createdAt: { $gte: startOfMonth, $lt: endOfMonth } })
    ]).then(([a, b]) => a + b),
    BackupHistory.findOne({ status: 'completed' }).sort({ endTime: -1 }),
    measureStoredDocumentsSize(),
    measureCompletedBackupsSize()
  ]);

  const totalFileSize = formatFileSize(actualDataBytes);
  const totalBackupsSize = formatFileSize(actualBackupsBytes);

  res.status(200).json({
    success: true,
    data: {
      totalIncomingDocuments,
      totalOutgoingDocuments,
      totalFileSize,
      totalFileSizeBytes: actualDataBytes,
      totalBackupsSize,
      totalBackupsSizeBytes: actualBackupsBytes,
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
  const {
    enabled,
    frequency,
    includeAttachments,
    compressionLevel,
    retentionDays,
    hour,
    minute,
    dayOfWeek,
    dayOfMonth,
    retentionCount
  } = req.body;

  let policy = await BackupPolicy.findOne().sort({ updatedAt: -1 });

  if (!policy) {
    policy = await BackupPolicy.create({
      enabled,
      frequency,
      includeAttachments,
      compressionLevel,
      retentionDays,
      hour: hour !== undefined ? hour : 2,
      minute: minute !== undefined ? minute : 0,
      dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : 0,
      dayOfMonth: dayOfMonth !== undefined ? dayOfMonth : 1,
      retentionCount: retentionCount !== undefined ? retentionCount : 10,
      createdBy: req.user?.id || req.user?._id,
      updatedBy: req.user?.id || req.user?._id
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
        hour: hour !== undefined ? hour : (policy.hour || 2),
        minute: minute !== undefined ? minute : (policy.minute || 0),
        dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : (policy.dayOfWeek || 0),
        dayOfMonth: dayOfMonth !== undefined ? dayOfMonth : (policy.dayOfMonth || 1),
        retentionCount: retentionCount !== undefined ? retentionCount : (policy.retentionCount || 10),
        updatedBy: req.user?.id || req.user?._id
      },
      { new: true, runValidators: true }
    );
  }

  res.status(200).json({
    success: true,
    data: policy
  });
});

// @desc    Create manual or automatic backup
// @route   POST /api/backup/create
// @access  Private (Admin roles only)
exports.createBackup = asyncHandler(async (req, res, next) => {
  const isAutomatic = req.isAutomatic || req.body?.isAutomatic || false;
  const year = req.body?.year || req.year;
  const exportPath = req.body?.exportPath || req.exportPath;

  const policy = await BackupPolicy.findOne().sort({ updatedAt: -1 });
  const includeAttachments = policy ? policy.includeAttachments : true;
  const compressionLevel = policy ? policy.compressionLevel : 'medium';

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = year ? `backup-${year}-${timestamp}.zip` : `backup-${timestamp}.zip`;
  const backupDir = exportPath ? path.resolve(exportPath) : getDefaultBackupDir();
  const filePath = path.join(backupDir, fileName);

  await fs.mkdir(backupDir, { recursive: true });

  const userId = req.user?._id || req.user?.id || policy?.createdBy || null;

  const backupRecord = await BackupHistory.create({
    type: isAutomatic ? 'automatic' : 'manual',
    fileName,
    filePath,
    includeAttachments,
    compressionLevel,
    createdBy: userId,
    backupYear: year || null,
    exportPath: exportPath || null
  });

  // Start backup process in background
  runBackupArchive(backupRecord._id, includeAttachments, compressionLevel, year).catch((err) => {
    console.error('[Backup] Erreur en arrière-plan:', err.message);
  });

  if (!res || typeof res.status !== 'function') {
    return backupRecord;
  }

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
  if (!bytes || bytes <= 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// @desc    Restore backup with strong confirmation, real pre-restore safetyBackup, verified unzip & mongorestore
// @route   POST /api/backup/restore
// @access  Private (Admin roles only)
exports.restoreBackup = async (req, res) => {
  let tempRestoreDir = null;
  let safetyBackupRecord = null;

  try {
    const { backupId, confirmation } = req.body;

    if (confirmation !== 'CONFIRM_RESTORE') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation requise : envoyez confirmation="CONFIRM_RESTORE"',
      });
    }

    if (!backupId || !mongoose.Types.ObjectId.isValid(String(backupId))) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de sauvegarde invalide',
      });
    }

    const backup = await BackupHistory.findById(backupId);
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup introuvable' });
    }

    if (backup.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de restaurer un backup non terminé ou en échec',
      });
    }

    if (!backup.filePath) {
      return res.status(404).json({ success: false, message: 'Chemin du fichier de backup manquant' });
    }

    const resolvedBackupPath = path.resolve(backup.filePath);
    if (!isPathWithinAllowedBackupDirs(resolvedBackupPath, backup.exportPath)) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé au fichier de sauvegarde',
      });
    }

    if (!fsSync.existsSync(resolvedBackupPath)) {
      return res.status(404).json({ success: false, message: 'Fichier introuvable sur le disque' });
    }

    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'PERMANENT_DELETE',
        entityType: 'trash',
        entityId: backupId.toString(),
        userId: req.user?._id || req.user?.id,
        details: { action: 'RESTORE_BACKUP', backupDate: backup.createdAt, size: backup.fileSize },
        ipAddress: req.ip || 'unknown',
      });
    } catch (auditError) {
      console.warn('[Restore] Audit échoué:', auditError.message);
    }

    // 1. VRAI safetyBackup exécuté et vérifié AVANT toute restauration
    const safetyDir = getDefaultBackupDir();
    await fs.mkdir(safetyDir, { recursive: true });
    const safetyFileName = `safety-backup-before-restore-${Date.now()}.zip`;
    const safetyFilePath = path.join(safetyDir, safetyFileName);

    safetyBackupRecord = await BackupHistory.create({
      type: 'manual',
      status: 'in_progress',
      createdBy: req.user?._id || req.user?.id || null,
      fileName: safetyFileName,
      filePath: safetyFilePath,
      includeAttachments: true,
      compressionLevel: 'medium',
    });

    const completedSafetyBackup = await runBackupArchive(
      safetyBackupRecord._id,
      true,
      'medium',
      null
    );

    if (
      !completedSafetyBackup ||
      completedSafetyBackup.status !== 'completed' ||
      !fsSync.existsSync(safetyFilePath) ||
      completedSafetyBackup.fileSize <= 0
    ) {
      throw new Error('Échec de la création du safetyBackup préalable à la restauration');
    }

    // 2. Extraction vérifiée (unzip dans un dossier temporaire isolé + contrôle Zip-Slip)
    tempRestoreDir = path.join(safetyDir, `.restore-tmp-${Date.now()}-${process.pid}`);
    await fs.mkdir(tempRestoreDir, { recursive: true });

    await execFileAsync('unzip', ['-o', '-q', resolvedBackupPath, '-d', tempRestoreDir], {
      timeout: 300000,
    });

    const extractedFilesCount = await validateExtractedTree(tempRestoreDir);
    if (extractedFilesCount === 0) {
      throw new Error('L\'archive extraite est vide');
    }

    // 3. Restauration MongoDB vérifiée (mongorestore si BSON présent + réinsertion des collections RH JSON)
    const dumpRoot = await findBsonDumpRoot(tempRestoreDir);
    const archiveHasHrJson = hasAnyHrJsonFile(tempRestoreDir);

    if (!dumpRoot && !archiveHasHrJson) {
      throw new Error('Archive incomplète : aucun dump BSON (mongodb-dump) ni export JSON RH trouvé pour la restauration');
    }

    if (dumpRoot) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/document-management';
      let restoreTargetDir = dumpRoot;
      const dumpEntries = await fs.readdir(dumpRoot, { withFileTypes: true });
      const hasTopLevelBson = dumpEntries.some(e => e.isFile() && e.name.endsWith('.bson'));
      const dbSubdirs = dumpEntries.filter(e => e.isDirectory());

      // Si mongodump a produit <outDir>/<dbName>/*.bson et qu'une seule base est ciblée par l'URI,
      // passer directement ce sous-répertoire à mongorestore pour éviter toute ambiguïté de namespace.
      if (!hasTopLevelBson && dbSubdirs.length === 1) {
        const dbNameMatch = mongoUri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/);
        if (dbNameMatch && dbNameMatch[1]) {
          restoreTargetDir = path.join(dumpRoot, dbSubdirs[0].name);
        }
      }

      await execFileAsync('mongorestore', [`--uri=${mongoUri}`, '--drop', restoreTargetDir], {
        timeout: 300000,
      });
    }

    // Réinsertion explicite des collections RH depuis leurs exports JSON structurés
    const hrRestoredCounts = archiveHasHrJson
      ? await restoreHrCollectionsFromJson(tempRestoreDir)
      : {};

    // 4. Restauration des fichiers physiques (courrier & uploads dont personnelphoto / usersphoto) vers backend/
    const extractedCourrierDir = path.join(tempRestoreDir, 'courrier');
    if (fsSync.existsSync(extractedCourrierDir)) {
      await copyDirectorySafe(extractedCourrierDir, path.join(BACKEND_ROOT, 'courrier'));
    }

    const backendUploadsDir = path.join(BACKEND_ROOT, 'uploads');
    const extractedUploadsDir = path.join(tempRestoreDir, 'uploads');
    if (fsSync.existsSync(extractedUploadsDir)) {
      await copyDirectorySafe(extractedUploadsDir, backendUploadsDir);
    }

    // S'assurer explicitement que personnelphoto et usersphoto existent et ont les bonnes permissions (0755 dossiers, 0644 fichiers)
    let restoredPhotoFilesCount = 0;
    for (const subDir of HR_PHOTO_UPLOAD_SUBDIRS) {
      const targetPhotoDir = path.join(backendUploadsDir, subDir);
      await fs.mkdir(targetPhotoDir, { recursive: true, mode: 0o755 });
      await fs.chmod(targetPhotoDir, 0o755).catch(() => {});

      const nestedSourceDir = path.join(tempRestoreDir, 'uploads', subDir);
      const rootSourceDir = path.join(tempRestoreDir, subDir);

      if (fsSync.existsSync(nestedSourceDir)) {
        restoredPhotoFilesCount += await copyDirectorySafe(nestedSourceDir, targetPhotoDir);
      } else if (fsSync.existsSync(rootSourceDir)) {
        restoredPhotoFilesCount += await copyDirectorySafe(rootSourceDir, targetPhotoDir);
      }
    }

    backup.restoredAt = new Date();
    backup.restoredBy = req.user?._id || req.user?.id;
    await backup.save();

    return res.status(200).json({
      success: true,
      message: 'Restauration effectuée et vérifiée avec succès',
      data: {
        backupId,
        safetyBackupId: safetyBackupRecord._id,
        restoredAt: backup.restoredAt,
        hrRestoredCounts,
        restoredPhotoFilesCount,
      },
    });
  } catch (error) {
    console.error('[Restore] Erreur:', error);
    return res.status(500).json({
      success: false,
      message: `Échec de la restauration: ${error.message}`,
      safetyBackupId: safetyBackupRecord ? safetyBackupRecord._id : null,
    });
  } finally {
    if (tempRestoreDir) {
      await fs.rm(tempRestoreDir, { recursive: true, force: true }).catch(() => {});
    }
  }
};

// @desc    Télécharger un fichier de backup
// @route   GET /api/backup/download/:id
// @access  Private (Admin)
exports.downloadBackup = async (req, res) => {
  try {
    const backup = await BackupHistory.findById(req.params.id);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup introuvable',
      });
    }

    if (backup.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Ce backup n\'est pas terminé',
      });
    }

    // Path Traversal Protection
    const resolvedPath = path.resolve(backup.filePath);

    if (!isPathWithinAllowedBackupDirs(resolvedPath, backup.exportPath)) {
      console.warn(`[Security] Tentative de Path Traversal bloquée sur downloadBackup: ${backup.filePath}`);
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé au fichier de sauvegarde',
      });
    }

    if (!fsSync.existsSync(resolvedPath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier de backup introuvable sur le disque',
      });
    }

    const fileName = backup.fileName || path.basename(resolvedPath);
    res.download(resolvedPath, fileName);
  } catch (error) {
    console.error('[Backup Download] Erreur:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Supprimer un backup
// @route   DELETE /api/backup/:id
// @access  Private (Admin)
exports.deleteBackup = async (req, res) => {
  try {
    const backup = await BackupHistory.findById(req.params.id);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup introuvable',
      });
    }

    if (backup.status === 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un backup en cours',
      });
    }

    // Supprimer le fichier physique avec protection Path Traversal
    if (backup.filePath) {
      const resolvedPath = path.resolve(backup.filePath);

      if (!isPathWithinAllowedBackupDirs(resolvedPath, backup.exportPath)) {
        console.warn(`[Security] Tentative de Path Traversal bloquée sur deleteBackup: ${backup.filePath}`);
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé au fichier de sauvegarde',
        });
      }

      if (fsSync.existsSync(resolvedPath)) {
        try {
          fsSync.unlinkSync(resolvedPath);
          console.log(`[Backup Delete] Fichier supprimé: ${resolvedPath}`);
        } catch (fileErr) {
          console.warn('[Backup Delete] Erreur fichier:', fileErr.message);
        }
      }
    }

    // Supprimer l'entrée DB
    await BackupHistory.findByIdAndDelete(req.params.id);

    // Audit log (non bloquant)
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'PERMANENT_DELETE',
        entityType: 'trash',
        entityId: req.params.id,
        userId: req.user._id,
        details: {
          action: 'DELETE_BACKUP',
          fileName: backup.fileName,
          fileSize: backup.fileSize,
        },
        ipAddress: req.ip,
      });
    } catch (auditErr) {
      console.warn('[Backup Delete] Audit échoué:', auditErr.message);
    }

    res.json({
      success: true,
      message: 'Backup supprimé définitivement',
    });
  } catch (error) {
    console.error('[Backup Delete] Erreur:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.runBackupArchive = runBackupArchive;
exports.HR_COLLECTIONS = HR_COLLECTIONS;