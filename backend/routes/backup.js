const express = require('express');
const {
  getBackupStats,
  getBackupPolicy,
  updateBackupPolicy,
  createBackup,
  getBackupStatus,
  getBackupHistory
} = require('../controllers/backup');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { auditDocumentActivity } = require('../middleware/auditMiddleware');

// All routes require authentication and admin roles
router.use(protect);
router.use(authorize('Admin'));

router.route('/stats').get(getBackupStats);
router.route('/policy')
  .get(getBackupPolicy)
  .put(auditDocumentActivity('backup_policy_update'), updateBackupPolicy);
router.route('/create').post(auditDocumentActivity('backup_create'), createBackup);
router.route('/status/:id').get(getBackupStatus);
router.route('/history').get(getBackupHistory);

module.exports = router;