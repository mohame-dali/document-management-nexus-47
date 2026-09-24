const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rh/rhPersonnelHistoryController');
const { protect, checkRHAccess } = require('../middleware/auth');

// ============================================================
// 1. PROMOTIONS (الترقيات)
// ============================================================
router.get('/personnel/:personnelId/promotions', protect, ctrl.getPromotionsByPersonnel);
router.post('/personnel/:personnelId/promotions', protect, checkRHAccess, ctrl.createPromotion);
router.put('/promotions/:id', protect, checkRHAccess, ctrl.updatePromotion);
router.delete('/promotions/:id', protect, checkRHAccess, ctrl.deletePromotion);

// ============================================================
// 2. POSTES (الخطط)
// ============================================================
router.get('/personnel/:personnelId/postes', protect, ctrl.getPostesByPersonnel);
router.post('/personnel/:personnelId/postes', protect, checkRHAccess, ctrl.createPoste);
router.put('/postes/:id', protect, checkRHAccess, ctrl.updatePoste);
router.delete('/postes/:id', protect, checkRHAccess, ctrl.deletePoste);

// ============================================================
// 3. DIPLOMES (الشهادات)
// ============================================================
router.get('/personnel/:personnelId/diplomes', protect, ctrl.getDiplomesByPersonnel);
router.post('/personnel/:personnelId/diplomes', protect, checkRHAccess, ctrl.createDiplome);
router.put('/diplomes/:id', protect, checkRHAccess, ctrl.updateDiplome);
router.delete('/diplomes/:id', protect, checkRHAccess, ctrl.deleteDiplome);

// ============================================================
// 4. SANCTIONS (العقوبات)
// ============================================================
router.get('/personnel/:personnelId/sanctions', protect, ctrl.getSanctionsByPersonnel);
router.post('/personnel/:personnelId/sanctions', protect, checkRHAccess, ctrl.createSanction);
router.put('/sanctions/:id', protect, checkRHAccess, ctrl.updateSanction);
router.delete('/sanctions/:id', protect, checkRHAccess, ctrl.deleteSanction);

// ============================================================
// 5. AGRÉGATION (HISTORIQUE COMPLET)
// ============================================================
router.get('/personnel/:personnelId/full-history', protect, ctrl.getFullPersonnelHistory);

// ============================================================
// 6. HISTORIQUE DE L'UTILISATEUR CONNECTÉ (MON PROFIL)
// ============================================================
router.get('/my-profile/full-history', protect, ctrl.getMyFullHistory);

module.exports = router;

