const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const ctrl = require('../controllers/rh/rhPersonnelHistoryController');
const Personnel = require('../models/Personnel');
const { protect, authorize, checkRHAccess } = require('../middleware/auth');

/**
 * RBAC lecture historique RH :
 * - Role 'User' : autorisé uniquement sur son propre dossier Personnel lié.
 * - Autres rôles : authorize('Admin', 'Director', 'AdminDepartment') + checkRHAccess.
 */
const authorizePersonnelReadOrRH = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Non autorisé' });
    }

    if (req.user.role === 'User') {
      const { personnelId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(personnelId)) {
        return res.status(400).json({ success: false, message: 'Identifiant du personnel invalide' });
      }

      const directMatch =
        req.user.personnelId && req.user.personnelId.toString() === personnelId.toString();

      if (directMatch) {
        return next();
      }

      const ownPersonnel = await Personnel.exists({
        _id: personnelId,
        userId: req.user._id,
        isDeleted: { $ne: true }
      });

      if (ownPersonnel) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Accès refusé : vous ne pouvez consulter que votre propre dossier'
      });
    }

    return authorize('Admin', 'Director', 'AdminDepartment')(req, res, (err) => {
      if (err) return next(err);
      return checkRHAccess(req, res, next);
    });
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// 1. PROMOTIONS (الترقيات)
// ============================================================
router.get('/personnel/:personnelId/promotions', protect, authorizePersonnelReadOrRH, ctrl.getPromotionsByPersonnel);
router.post('/personnel/:personnelId/promotions', protect, authorize('Admin', 'AdminDepartment'), checkRHAccess, ctrl.createPromotion);
router.put('/promotions/:id', protect, authorize('Admin', 'AdminDepartment'), checkRHAccess, ctrl.updatePromotion);
router.delete('/promotions/:id', protect, authorize('Admin', 'AdminDepartment'), checkRHAccess, ctrl.deletePromotion);

// ============================================================
// 2. POSTES (الخطط)
// ============================================================
router.get('/personnel/:personnelId/postes', protect, authorizePersonnelReadOrRH, ctrl.getPostesByPersonnel);
router.post('/personnel/:personnelId/postes', protect, authorize('Admin', 'AdminDepartment'), checkRHAccess, ctrl.createPoste);
router.put('/postes/:id', protect, authorize('Admin', 'AdminDepartment'), checkRHAccess, ctrl.updatePoste);
router.delete('/postes/:id', protect, authorize('Admin', 'AdminDepartment'), checkRHAccess, ctrl.deletePoste);

// ============================================================
// 3. DIPLOMES (الشهادات)
// ============================================================
router.get('/personnel/:personnelId/diplomes', protect, authorizePersonnelReadOrRH, ctrl.getDiplomesByPersonnel);
router.post('/personnel/:personnelId/diplomes', protect, authorize('Admin', 'AdminDepartment'), checkRHAccess, ctrl.createDiplome);
router.put('/diplomes/:id', protect, authorize('Admin', 'AdminDepartment'), checkRHAccess, ctrl.updateDiplome);
router.delete('/diplomes/:id', protect, authorize('Admin', 'AdminDepartment'), checkRHAccess, ctrl.deleteDiplome);

// ============================================================
// 4. SANCTIONS (العقوبات)
// ============================================================
router.get('/personnel/:personnelId/sanctions', protect, authorizePersonnelReadOrRH, ctrl.getSanctionsByPersonnel);
router.post('/personnel/:personnelId/sanctions', protect, authorize('Admin', 'AdminDepartment'), checkRHAccess, ctrl.createSanction);
router.put('/sanctions/:id', protect, authorize('Admin', 'AdminDepartment'), checkRHAccess, ctrl.updateSanction);
router.delete('/sanctions/:id', protect, authorize('Admin', 'AdminDepartment'), checkRHAccess, ctrl.deleteSanction);

// ============================================================
// 5. AGRÉGATION (HISTORIQUE COMPLET)
// ============================================================
router.get('/personnel/:personnelId/full-history', protect, authorizePersonnelReadOrRH, ctrl.getFullPersonnelHistory);

// ============================================================
// 6. HISTORIQUE DE L'UTILISATEUR CONNECTÉ (MON PROFIL)
// ============================================================
router.get('/my-profile/full-history', protect, ctrl.getMyFullHistory);

module.exports = router;

