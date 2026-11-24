const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { protect, authorize, checkRHAccess } = require('../middleware/auth');
const ctrl = require('../controllers/rh/rhStageController');
const RHStage = require('../models/RHStage');
const Personnel = require('../models/Personnel');

/**
 * RBAC lecture d'un stage unitaire :
 * - Role 'User' : uniquement si le stage appartient à son propre dossier Personnel.
 * - Autres rôles : authorize('Admin', 'Director', 'AdminDepartment') + checkRHAccess.
 */
const authorizeStageReadOrRH = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Non autorisé' });
    }

    if (req.user.role === 'User') {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Identifiant de stage invalide' });
      }

      const stage = await RHStage.findOne({ _id: id, isDeleted: { $ne: true } })
        .select('personnelId')
        .lean();

      if (!stage) {
        return res.status(404).json({ success: false, message: 'Stage introuvable' });
      }

      const stagePersonnelId = stage.personnelId ? stage.personnelId.toString() : null;
      let ownPersonnelId = req.user.personnelId ? req.user.personnelId.toString() : null;

      if (!ownPersonnelId) {
        const ownPersonnel = await Personnel.findOne({
          userId: req.user._id,
          isDeleted: { $ne: true }
        })
          .select('_id')
          .lean();
        ownPersonnelId = ownPersonnel ? ownPersonnel._id.toString() : null;
      }

      if (ownPersonnelId && stagePersonnelId && ownPersonnelId === stagePersonnelId) {
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

// Statistiques (avant /:id pour éviter conflit de route)
router.get(
  '/stats',
  protect,
  authorize('Admin', 'Director', 'AdminDepartment'),
  checkRHAccess,
  ctrl.getStagesStats
);

// Liste + filtres & consultation unitaire
router.get(
  '/',
  protect,
  authorize('Admin', 'Director', 'AdminDepartment'),
  checkRHAccess,
  ctrl.getAllStages
);
router.get('/:id', protect, authorizeStageReadOrRH, ctrl.getStageById);

// Création / modification / suppression (réservé aux rôles RH / Admin)
router.post('/', 
  protect, 
  authorize('Admin', 'AdminDepartment'),
  checkRHAccess, 
  ctrl.createStage
);
router.put('/:id', 
  protect, 
  authorize('Admin', 'AdminDepartment'),
  checkRHAccess, 
  ctrl.updateStage
);
router.delete('/:id', 
  protect, 
  authorize('Admin', 'AdminDepartment'),
  checkRHAccess, 
  ctrl.deleteStage
);

module.exports = router;
