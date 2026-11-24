const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { protect, authorize, checkRHAccess } = require('../middleware/auth');
const ctrl = require('../controllers/rh/rhStageController');
const Personnel = require('../models/Personnel');

/**
 * RBAC lecture stages par personnel :
 * - Role 'User' : uniquement son propre dossier Personnel lié.
 * - Autres rôles : authorize('Admin', 'Director', 'AdminDepartment') + checkRHAccess.
 */
const authorizePersonnelStagesOrRH = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Non autorisé' });
    }

    if (req.user.role === 'User') {
      const { personnelId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(personnelId)) {
        return res.status(400).json({ success: false, message: 'Identifiant de personnel invalide' });
      }

      if (req.user.personnelId && req.user.personnelId.toString() === personnelId.toString()) {
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

// Route imbriquée pour lister les stages d'un personnel (groupés par Tunisie / Étranger)
router.get('/personnel/:personnelId/stages',
  protect,
  authorizePersonnelStagesOrRH,
  ctrl.getStagesByPersonnel
);

// Route pour lister les stages liés à une session de formation
router.get('/sessions/:sessionId/stages',
  protect,
  authorize('Admin', 'Director', 'AdminDepartment'),
  checkRHAccess,
  ctrl.getStagesBySession
);

module.exports = router;
