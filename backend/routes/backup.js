const express = require('express');
const {
  getBackupStats,
  getBackupPolicy,
  updateBackupPolicy,
  createBackup,
  getBackupStatus,
  getBackupHistory,
  restoreBackup,
  downloadBackup,
  deleteBackup
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

router.post('/reload-scheduler', async (req, res) => {
  try {
    const { reloadBackupScheduler } = require('../services/backupScheduler');
    await reloadBackupScheduler();
    res.json({ success: true, message: 'Scheduler rechargé' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/restore', restoreBackup);

// Télécharger un backup
router.get('/download/:id', downloadBackup);

// Supprimer un backup
router.delete('/:id', deleteBackup);

module.exports = router;