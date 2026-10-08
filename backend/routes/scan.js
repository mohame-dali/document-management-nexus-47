
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  startScan,
  getScannerStatus,
  listScanners,
  getRecentScans,
  scanForDocument,
  scanTemporaryDocument,
  selectScanner,
  getDocumentScan
} = require('../controllers/scan');

// Protect all routes
router.use(protect);

// Routes for AdminTuningDesk and Admin
router.get('/status', authorize('Admin', 'AdminTuningDesk'), getScannerStatus);
router.get('/devices', authorize('Admin', 'AdminTuningDesk'), listScanners);
router.get('/recent', authorize('Admin', 'AdminTuningDesk'), getRecentScans);
router.post('/start', authorize('Admin', 'AdminTuningDesk'), startScan);
router.post('/select-device', authorize('Admin', 'AdminTuningDesk'), selectScanner);

// Document scanning routes (restricted to AdminTuningDesk and Admin)
router.post('/document', authorize('Admin', 'AdminTuningDesk'), scanForDocument);
router.post('/temp', authorize('Admin', 'AdminTuningDesk'), scanTemporaryDocument);

// Document scan retrieval (accessible to all authenticated users)
router.get('/document/:id/:type', getDocumentScan);

// Import Multer & OCR utils
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { extractTextFromPDF, cleanArabicOcrText } = require('../utils/ocrProcessor');

// Config Multer pour OCR temporaire
const ocrStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../tmp/ocr-uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `ocr-${unique}${ext}`);
  },
});

const ocrUpload = multer({
  storage: ocrStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Type de fichier non supporté (PDF uniquement)'));
  },
});

/**
 * POST /api/scan/ocr-upload
 * Reçoit un fichier PDF, retourne le texte OCR
 * SANS créer de document en base.
 */
router.post(
  '/ocr-upload',
  ocrUpload.single('file'),
  async (req, res) => {
    let filePath = null;
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni',
        });
      }

      filePath = req.file.path;

      // Utiliser la fonction existante (avec normalisation arabe)
      let ocrText = await extractTextFromPDF(filePath, 'ara+fra+eng');

      // Nettoyage du texte (fonctions existantes dans ocrProcessor)
      if (cleanArabicOcrText) {
        ocrText = cleanArabicOcrText(ocrText);
      }

      console.log(`[OCR Upload] ${req.file.originalname} → ${ocrText.length} chars`);

      return res.json({
        success: true,
        data: {
          ocrText,
          length: ocrText.length,
          filename: req.file.originalname,
        },
      });
    } catch (error) {
      console.error('[OCR Upload] Erreur:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'extraction OCR',
      });
    } finally {
      // Nettoyer le fichier temporaire
      if (filePath && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }
  }
);

module.exports = router;
