const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const aiRateLimiter = require('../middleware/aiRateLimiter');
const { health, extractFromOcr } = require('../controllers/ai/extractionController');
const { chatSearch } = require('../controllers/ai/chatController');
const { summarize } = require('../controllers/ai/summaryController');
const { translate } = require('../controllers/ai/translationController');

// GET /api/ai/health — Vérification du service IA
router.get('/health', protect, health);

// POST /api/ai/extract-from-ocr — Extraction intelligente
router.post(
  '/extract-from-ocr',
  protect,
  authorize('Admin', 'AdminTuningDesk', 'AdminDepartment'),
  aiRateLimiter,
  extractFromOcr
);

// POST /api/ai/summarize — Résumé automatique d'un document
router.post(
  '/summarize',
  protect,
  authorize('Admin', 'Director', 'AdminTuningDesk', 'AdminDepartment'),
  aiRateLimiter,
  summarize
);

// POST /api/ai/translate — Traduction bilingue AR ↔ FR
router.post(
  '/translate',
  protect,
  authorize('Admin', 'Director', 'AdminTuningDesk', 'AdminDepartment'),
  aiRateLimiter,
  translate
);

// POST /api/ai/chat — Recherche sémantique + résumé IA
router.post(
  '/chat',
  protect,
  authorize('Admin', 'Director', 'AdminTuningDesk', 'AdminDepartment'),
  aiRateLimiter,
  chatSearch
);

// POST /api/ai/reindex-failed — Relance du rattrapage d'indexation vectorielle
router.post(
  '/reindex-failed',
  protect,
  authorize('Admin', 'Director'),
  async (req, res) => {
    try {
      const { retryFailedIndexes } = require('../services/indexRetryScheduler');
      const force = req.body?.force === true || req.query?.force === 'true';
      const maxAttempts = req.body?.maxAttempts ? Number(req.body.maxAttempts) : 3;
      const limit = req.body?.limit ? Number(req.body.limit) : 200;

      const result = await retryFailedIndexes({ force, maxAttempts, limit });
      return res.status(result.status === 'service_down' ? 503 : 200).json({
        success: result.status === 'completed',
        data: result,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
