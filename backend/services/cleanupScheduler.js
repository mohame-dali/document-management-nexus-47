/**
 * backend/services/cleanupScheduler.js
 * Service de purge automatique des fichiers temporaires (upload scans, OCR, etc.)
 * Supprime les fichiers temporaires datant de plus de 24h tous les jours à 02:00
 */

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 heures

/**
 * Nettoie les fichiers temporaires dans les répertoires spécifiés
 */
async function cleanupTempFiles() {
  const candidateDirs = [
    path.join(__dirname, '..', 'uploads', 'temp'),
    path.join(process.cwd(), 'uploads', 'temp'),
    path.join(process.cwd(), 'backend', 'uploads', 'temp'),
    path.join(require('os').tmpdir(), 'ocr-uploads')
  ];

  // Dédupliquer les répertoires
  const targetDirs = Array.from(new Set(candidateDirs));
  let totalDeleted = 0;
  let totalErrors = 0;
  const now = Date.now();

  for (const dir of targetDirs) {
    try {
      if (!fs.existsSync(dir)) continue;

      const files = await fs.promises.readdir(dir);
      for (const file of files) {
        // Ignorer .gitkeep ou fichiers cachés
        if (file.startsWith('.')) continue;

        const filePath = path.join(dir, file);
        try {
          const stat = await fs.promises.stat(filePath);
          if (stat.isFile()) {
            const ageMs = now - stat.mtimeMs;
            if (ageMs > MAX_AGE_MS) {
              await fs.promises.unlink(filePath);
              totalDeleted++;
            }
          }
        } catch (fileErr) {
          totalErrors++;
          // Continuer sur les autres fichiers
        }
      }
    } catch (dirErr) {
      console.warn(`[Cleanup] Erreur lors de l'accès au répertoire ${dir}:`, dirErr.message);
    }
  }

  if (totalDeleted > 0) {
    console.log(`[Cleanup] ✅ Nettoyage terminé : ${totalDeleted} fichier(s) temporaire(s) de plus de 24h purgé(s).`);
  } else {
    console.log('[Cleanup] Aucun fichier temporaire expiré à purger.');
  }

  return { totalDeleted, totalErrors };
}

let cleanupTask = null;

/**
 * Démarre la tâche cron de nettoyage quotidien à 02:00
 */
function startCleanupScheduler() {
  if (cleanupTask) {
    cleanupTask.stop();
    cleanupTask = null;
  }

  // Tous les jours à 02:00 du matin
  cleanupTask = cron.schedule('0 2 * * *', async () => {
    console.log('[Cleanup Scheduler] Exécution programmée du nettoyage des fichiers temporaires...');
    try {
      await cleanupTempFiles();
    } catch (err) {
      console.error('[Cleanup Scheduler] Erreur lors de la purge:', err.message);
    }
  });

  console.log('[Cleanup Scheduler] ✅ Cron de nettoyage des fichiers temporaires actif (0 2 * * *)');
}

module.exports = {
  cleanupTempFiles,
  startCleanupScheduler
};
