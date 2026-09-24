const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/rh/rhReferenceController');

// ============================================================
// ÉCOLES
// ============================================================

// Lecture : tous les utilisateurs authentifiés
router.get('/ecoles', protect, ctrl.getEcoles);
router.get('/ecoles/:id', protect, ctrl.getEcoleById);

// Écriture : Admin, AdminDepartment
router.post('/ecoles', 
  protect, 
  authorize('Admin', 'AdminDepartment'), 
  ctrl.createEcole
);
router.put('/ecoles/:id', 
  protect, 
  authorize('Admin', 'AdminDepartment'), 
  ctrl.updateEcole
);
router.delete('/ecoles/:id', 
  protect, 
  authorize('Admin', 'AdminDepartment'), 
  ctrl.deleteEcole
);

// ============================================================
// TYPES DE FORMATION
// ============================================================

router.get('/types-formation', protect, ctrl.getTypesFormation);
router.get('/types-formation/:id', protect, ctrl.getTypeFormationById);
router.post('/types-formation', 
  protect, 
  authorize('Admin', 'AdminDepartment'), 
  ctrl.createTypeFormation
);
router.put('/types-formation/:id', 
  protect, 
  authorize('Admin', 'AdminDepartment'), 
  ctrl.updateTypeFormation
);
router.delete('/types-formation/:id', 
  protect, 
  authorize('Admin', 'AdminDepartment'), 
  ctrl.deleteTypeFormation
);

module.exports = router;
