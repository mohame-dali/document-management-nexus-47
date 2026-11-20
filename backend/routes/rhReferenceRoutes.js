const express = require('express');
const router = express.Router();
const { protect, authorize, checkRHAccess } = require('../middleware/auth');
const ctrl = require('../controllers/rh/rhReferenceController');

// ============================================================
// ÉCOLES
// ============================================================

// Lecture : tous les utilisateurs authentifiés
router.get('/ecoles', protect, ctrl.getEcoles);
router.get('/ecoles/:id', protect, ctrl.getEcoleById);

// Écriture : Admin, AdminDepartment RH uniquement
router.post('/ecoles', 
  protect, 
  authorize('Admin', 'AdminDepartment'), 
  checkRHAccess,
  ctrl.createEcole
);
router.put('/ecoles/:id', 
  protect, 
  authorize('Admin', 'AdminDepartment'), 
  checkRHAccess,
  ctrl.updateEcole
);
router.delete('/ecoles/:id', 
  protect, 
  authorize('Admin', 'AdminDepartment'), 
  checkRHAccess,
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
  checkRHAccess,
  ctrl.createTypeFormation
);
router.put('/types-formation/:id', 
  protect, 
  authorize('Admin', 'AdminDepartment'), 
  checkRHAccess,
  ctrl.updateTypeFormation
);
router.delete('/types-formation/:id', 
  protect, 
  authorize('Admin', 'AdminDepartment'), 
  checkRHAccess,
  ctrl.deleteTypeFormation
);

module.exports = router;
