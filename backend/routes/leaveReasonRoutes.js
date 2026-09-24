const express = require('express');
const router = express.Router();
const {
  getLeaveReasons,
  getLeaveReasonById,
  createLeaveReason,
  updateLeaveReason,
  toggleLeaveReasonStatus,
  deleteLeaveReason
} = require('../controllers/leaveReasonController');
const { protect, authorize, checkRHAccess } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification
router.use(protect);

// Lecture : ouverte aux utilisateurs connectés (chefs de département, RH, admins)
// Création : restreinte à l'Admin RH (Admin / AdminDepartment RH)
router.route('/')
  .get(getLeaveReasons)
  .post(authorize('Admin', 'AdminDepartment'), checkRHAccess, createLeaveReason);

// Bascule du statut actif/inactif (restreint à l'Admin RH)
router.put('/:id/toggle', authorize('Admin', 'AdminDepartment'), checkRHAccess, toggleLeaveReasonStatus);

// Détail, modification et suppression
router.route('/:id')
  .get(getLeaveReasonById)
  .put(authorize('Admin', 'AdminDepartment'), checkRHAccess, updateLeaveReason)
  .delete(authorize('Admin', 'AdminDepartment'), checkRHAccess, deleteLeaveReason);

module.exports = router;
