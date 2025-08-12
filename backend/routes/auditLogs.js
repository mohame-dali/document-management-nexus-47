
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

// Admin-only routes for viewing and exporting
router.get('/', authorize('Admin'), getAuditLogs);
router.get('/export', authorize('Admin'), exportAuditLogs);
router.get('/document/:id/timeline', authorize('Admin'), getDocumentTimeline);

// All authenticated users can create audit logs (internal logging)
router.post('/', createAuditLog);

module.exports = router;
