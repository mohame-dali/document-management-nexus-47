const cron = require('node-cron');
const BackupPolicy = require('../models/BackupPolicy');
const BackupHistory = require('../models/BackupHistory');
const fs = require('fs');

let scheduledTask = null;

async function startBackupScheduler() {
  try {
    const policy = await BackupPolicy.findOne().sort({ updatedAt: -1 });
    if (!policy || !policy.enabled) {
      console.log('[Backup Scheduler] Désactivé');
      return;
    }
    if (scheduledTask) {
      scheduledTask.stop();
      scheduledTask = null;
    }

    let cronExpression = '0 2 * * *';
    if (policy.frequency === 'daily') {
      cronExpression = (policy.minute || 0) + ' ' + (policy.hour || 2) + ' * * *';
    } else if (policy.frequency === 'weekly') {
      cronExpression = (policy.minute || 0) + ' ' + (policy.hour || 2) + ' * * ' + (policy.dayOfWeek || 0);
    } else if (policy.frequency === 'monthly') {
      cronExpression = (policy.minute || 0) + ' ' + (policy.hour || 2) + ' ' + (policy.dayOfMonth || 1) + ' * *';
    }

    console.log('[Backup Scheduler] Démarrage : ' + cronExpression);

    scheduledTask = cron.schedule(cronExpression, async () => {
      console.log('[Backup Scheduler] Exécution automatique...');
      try {
        const backupController = require('../controllers/backup');
        await backupController.createBackup({
          user: { _id: policy.createdBy, id: policy.createdBy, role: 'Admin' },
          isAutomatic: true,
          body: {}
        });
        await applyRetentionPolicy(policy);
        console.log('[Backup Scheduler] Backup réussi');
      } catch (error) {
        console.error('[Backup Scheduler] Erreur:', error.message);
        try {
          await BackupHistory.create({
            status: 'failed',
            errorMessage: error.message,
            type: 'automatic',
            fileName: 'auto-backup-failed-' + Date.now() + '.zip',
            filePath: 'none',
            createdAt: new Date(),
          });
        } catch (err) {
          console.error('[Backup Scheduler] Erreur enregistrement:', err.message);
        }
      }
    });

    console.log('[Backup Scheduler] Cron actif');
  } catch (error) {
    console.error('[Backup Scheduler] Erreur démarrage:', error.message);
  }
}

async function applyRetentionPolicy(policy) {
  const retentionCount = policy.retentionCount || 10;

  // Utiliser 'completed' selon l'audit
  const allBackups = await BackupHistory.find({ status: 'completed' }).sort({ createdAt: -1 });

  if (allBackups.length <= retentionCount) return;

  const toDelete = allBackups.slice(retentionCount);
  for (const backup of toDelete) {
    try {
      if (backup.filePath && fs.existsSync(backup.filePath)) {
        fs.unlinkSync(backup.filePath);
      }
      await BackupHistory.findByIdAndDelete(backup._id);
      console.log('[Backup Scheduler] Ancien backup supprimé: ' + backup._id);
    } catch (err) {
      console.error('[Backup Scheduler] Erreur suppression:', err.message);
    }
  }
}

async function reloadBackupScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
  await startBackupScheduler();
}

module.exports = {
  startBackupScheduler,
  reloadBackupScheduler,
  applyRetentionPolicy,
};
