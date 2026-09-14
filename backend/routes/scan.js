
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

module.exports = router;
