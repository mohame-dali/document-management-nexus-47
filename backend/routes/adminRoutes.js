const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { retryFailedIndexes } = require('../services/indexRetryScheduler');

/**
 * POST /api/admin/reindex-failed
 * Relance l'indexation des courriers entrants et sortants ayant échoué
 * @access Private/Admin/Director
 */
router.post('/reindex-failed', protect, authorize('Admin', 'Director'), async (req, res) => {
  try {
    const force = req.body?.force === true || req.query?.force === 'true';
    const maxAttempts = req.body?.maxAttempts ? Number(req.body.maxAttempts) : 3;
    const limit = req.body?.limit ? Number(req.body.limit) : 200;

    console.log(`[Admin] ⚡ Déclenchement manuel du rattrapage (force=${force}, maxAttempts=${maxAttempts}, limit=${limit})`);

    const result = await retryFailedIndexes({ force, maxAttempts, limit });

    if (result.status === 'service_down') {
      return res.status(503).json({
        success: false,
        message: 'Service IA local indisponible. Veuillez vérifier que le moteur est bien opérationnel.',
        data: result,
      });
    }

    if (result.status === 'already_running') {
      return res.status(409).json({
        success: false,
        message: 'Une tâche de rattrapage d\'indexation est déjà en cours.',
        data: result,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Rattrapage terminé : ${result.totalSucceeded} document(s) indexé(s), ${result.totalFailed} échec(s).`,
      data: result,
    });
  } catch (error) {
    console.error('[Admin] Erreur lors du rattrapage d\'indexation :', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du rattrapage d\'indexation.',
      error: error.message,
    });
  }
});

module.exports = router;
