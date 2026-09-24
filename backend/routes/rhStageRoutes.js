const express = require('express');
const router = express.Router();
const { protect, authorize, checkRHAccess } = require('../middleware/auth');
const ctrl = require('../controllers/rh/rhStageController');

// Statistiques (avant /:id pour éviter conflit de route)
router.get('/stats', protect, ctrl.getStagesStats);

// Liste + filtres & consultation unitaire
router.get('/', protect, ctrl.getAllStages);
router.get('/:id', protect, ctrl.getStageById);

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
