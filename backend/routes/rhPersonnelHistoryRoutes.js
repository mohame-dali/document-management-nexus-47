const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rh/rhPersonnelHistoryController');
const { protect, authorize } = require('../middleware/auth');

const adminRoles = ['Admin', 'SuperAdmin', 'AdminDepartment'];

// ============================================================
// 1. PROMOTIONS (الترقيات)
// ============================================================
router.get('/personnel/:personnelId/promotions', protect, ctrl.getPromotionsByPersonnel);
router.post('/personnel/:personnelId/promotions', protect, authorize(...adminRoles), ctrl.createPromotion);
router.put('/promotions/:id', protect, authorize(...adminRoles), ctrl.updatePromotion);
router.delete('/promotions/:id', protect, authorize(...adminRoles), ctrl.deletePromotion);

// ============================================================
// 2. POSTES (الخطط)
// ============================================================
router.get('/personnel/:personnelId/postes', protect, ctrl.getPostesByPersonnel);
router.post('/personnel/:personnelId/postes', protect, authorize(...adminRoles), ctrl.createPoste);
router.put('/postes/:id', protect, authorize(...adminRoles), ctrl.updatePoste);
router.delete('/postes/:id', protect, authorize(...adminRoles), ctrl.deletePoste);

// ============================================================
// 3. DIPLOMES (الشهادات)
// ============================================================
router.get('/personnel/:personnelId/diplomes', protect, ctrl.getDiplomesByPersonnel);
router.post('/personnel/:personnelId/diplomes', protect, authorize(...adminRoles), ctrl.createDiplome);
router.put('/diplomes/:id', protect, authorize(...adminRoles), ctrl.updateDiplome);
router.delete('/diplomes/:id', protect, authorize(...adminRoles), ctrl.deleteDiplome);

// ============================================================
// 4. SANCTIONS (العقوبات)
// ============================================================
router.get('/personnel/:personnelId/sanctions', protect, ctrl.getSanctionsByPersonnel);
router.post('/personnel/:personnelId/sanctions', protect, authorize(...adminRoles), ctrl.createSanction);
router.put('/sanctions/:id', protect, authorize(...adminRoles), ctrl.updateSanction);
router.delete('/sanctions/:id', protect, authorize(...adminRoles), ctrl.deleteSanction);

// ============================================================
// 5. AGRÉGATION (HISTORIQUE COMPLET)
// ============================================================
router.get('/personnel/:personnelId/full-history', protect, ctrl.getFullPersonnelHistory);

// ============================================================
// 6. HISTORIQUE DE L'UTILISATEUR CONNECTÉ (MON PROFIL)
// ============================================================
router.get('/my-profile/full-history', protect, ctrl.getMyFullHistory);

module.exports = router;

