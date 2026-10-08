
const express = require('express');
const {
  getAuditLogs,
  exportAuditLogs,
  getDocumentTimeline,
  createAuditLog
} = require('../controllers/auditLogs');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Admin, Director and AdminTuningDesk routes for viewing and exporting
router.get('/', authorize('Admin', 'Director', 'AdminTuningDesk'), getAuditLogs);
router.get('/export', authorize('Admin', 'Director', 'AdminTuningDesk'), exportAuditLogs);
router.get('/document/:id/timeline', authorize('Admin', 'Director', 'AdminTuningDesk'), getDocumentTimeline);

// All authenticated users can create audit logs (internal logging)
router.post('/', createAuditLog);

module.exports = router;
