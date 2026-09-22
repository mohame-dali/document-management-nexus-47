const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/rh/rhStageController');

// Route imbriquée pour lister les stages d'un personnel (groupés par Tunisie / Étranger)
router.get('/personnel/:personnelId/stages', 
  protect, 
  ctrl.getStagesByPersonnel
);

// Route pour lister les stages liés à une session de formation
router.get('/sessions/:sessionId/stages',
  protect,
  ctrl.getStagesBySession
);

module.exports = router;
