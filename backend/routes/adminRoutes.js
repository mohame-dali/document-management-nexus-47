const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { retryFailedIndexes } = require('../services/indexRetryScheduler');

// Middleware d'authentification admin avec flexibilité dev pour tests curl
const adminAuth = (req, res, next) => {
  const hasToken =
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) ||
    (req.cookies && req.cookies.token);

  if (hasToken) {
    return protect(req, res, () => {
      authorize('Admin', 'Director')(req, res, next);
    });
  }

  // En dev local, autoriser les tests CLI directs si aucun token n'est fourni
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  return protect(req, res, next);
};

/**
 * POST /api/admin/reindex-failed
 * Relance l'indexation des courriers entrants et sortants ayant échoué
 */
router.post('/reindex-failed', adminAuth, async (req, res) => {
  try {
    const force = req.body?.force === true || req.query?.force === 'true';
    const maxAttempts = req.body?.maxAttempts ? Number(req.body.maxAttempts) : 3;
    const limit = req.body?.limit ? Number(req.body.limit) : 200;

    console.log(`[Admin] ⚡ Déclenchement manuel du rattrapage (force=${force}, maxAttempts=${maxAttempts}, limit=${limit})`);

    const result = await retryFailedIndexes({ force, maxAttempts, limit });

    if (result.status === 'service_down') {
      return res.status(503).json({
        success: false,
        message: 'Service Ollama indisponible. Veuillez vérifier qu\'Ollama est bien démarré.',
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
