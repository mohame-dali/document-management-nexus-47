const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, authorize } = require('../middleware/auth');
const { extractTextFromPDF, cleanArabicOcrText } = require('../utils/ocrProcessor');
const {
  startScan,
  getScannerStatus,
  listScanners,
  getRecentScans,
  selectScanner,
  scanForDocument,
  scanTemporaryDocument,
  getDocumentScan,
  getScanJobStatus,
  cancelScanJob,
  getScanFile,
  deleteScanFile,
  getScanMetadata,
} = require('../controllers/scan');

// Enforce authentication and Admin / AdminTuningDesk role on ALL scan routes
router.use(protect);
router.use(authorize('Admin', 'AdminTuningDesk'));

// Scanner status & device management
router.get('/status', getScannerStatus);
router.get('/status/:scanId', getScanJobStatus);
router.get('/devices', listScanners);
router.get('/recent', getRecentScans);
router.post('/start', startScan);
router.post('/select-device', selectScanner);
router.post('/cancel/:scanId', cancelScanJob);

// Document scanning & secure blob retrieval/cleanup
router.post('/document', scanForDocument);
router.post('/temp', scanTemporaryDocument);
router.get('/file/:scanId', getScanFile);
router.delete('/file/:scanId', deleteScanFile);
router.get('/download/:scanId', getScanFile);
router.get('/metadata/:scanId', getScanMetadata);
router.get('/document/:id/:type', getDocumentScan);

const scannerService = require('../utils/scanner');

// Config Multer pour OCR temporaire (même dossier temporaire que le reste de l'application)
const ocrStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(scannerService.getConfig().tempDir, 'ocr-uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `ocr-${unique}${ext === '.pdf' ? '.pdf' : ''}`);
  },
});

const ocrUpload = multer({
  storage: ocrStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Type de fichier non supporté (PDF uniquement)'));
  },
});

/**
 * POST /api/scan/ocr-upload
 * Reçoit un fichier PDF, retourne le texte OCR SANS créer de document en base.
 */
router.post(
  '/ocr-upload',
  (req, res, next) => {
    ocrUpload.single('file')(req, res, (err) => {
      if (err) {
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({
          success: false,
          code: 'INVALID_SCAN_PARAMS',
          message: err.message || 'Fichier OCR invalide.',
        });
      }
      return next();
    });
  },
  async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SCAN_PARAMS',
        message: 'Aucun fichier fourni.',
      });
    }

    filePath = req.file.path;
    let ocrText = (await extractTextFromPDF(filePath, 'ara+fra+eng')) || '';
    if (cleanArabicOcrText) {
      ocrText = cleanArabicOcrText(ocrText);
    }

    console.log(`[OCR Upload] ${req.file.originalname} -> ${ocrText.length} chars`);

    return res.json({
      success: true,
      data: {
        ocrText,
        length: ocrText.length,
        filename: req.file.originalname,
      },
    });
  } catch (error) {
    console.error('[OCR Upload] Error:', error.message);
    return res.status(500).json({
      success: false,
      code: 'SCAN_FAILED',
      message: 'Erreur lors de l’extraction OCR.',
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (_) {}
    }
  }
});

// Keep generic DELETE /:scanId at the end after named routes
router.delete('/:scanId', deleteScanFile);

module.exports = router;
