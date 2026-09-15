const express = require('express');
const {
  getOrganizationSettings,
  updateOrganizationSettings,
  setRhDepartment,
  setBureauDepartments,
  getTypesAssociation
} = require('../controllers/organizationSettingsController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(protect);

// Routes spécifiques
router.get('/types-association', getTypesAssociation);
router.put('/rh-department', authorize('Admin', 'SuperAdmin'), setRhDepartment);
router.put('/bureau-departments', authorize('Admin', 'SuperAdmin'), setBureauDepartments);

// Route principale du singleton
router.route('/')
  .get(getOrganizationSettings)
  .put(authorize('Admin', 'SuperAdmin'), updateOrganizationSettings);

module.exports = router;
