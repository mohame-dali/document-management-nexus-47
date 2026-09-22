const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/rh/rhStageController');

// Statistiques (avant /:id pour éviter conflit de route)
router.get('/stats', protect, ctrl.getStagesStats);

// Liste + filtres & consultation unitaire
router.get('/', protect, ctrl.getAllStages);
router.get('/:id', protect, ctrl.getStageById);

// Création / modification / suppression (réservé aux rôles RH / Admin)
router.post('/', 
  protect, 
  authorize('Admin', 'SuperAdmin', 'AdminDepartment'), 
  ctrl.createStage
);
router.put('/:id', 
  protect, 
  authorize('Admin', 'SuperAdmin', 'AdminDepartment'), 
  ctrl.updateStage
);
router.delete('/:id', 
  protect, 
  authorize('Admin', 'SuperAdmin', 'AdminDepartment'), 
  ctrl.deleteStage
);

module.exports = router;
