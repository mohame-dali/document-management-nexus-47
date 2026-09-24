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
const { protect, checkRHAccess } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification
router.use(protect);

// Lecture : ouverte aux utilisateurs connectés (chefs de département, RH, admins)
// Création : restreinte à l'Admin RH (Admin / AdminDepartment RH)
router.route('/')
  .get(getLeaveReasons)
  .post(checkRHAccess, createLeaveReason);

// Bascule du statut actif/inactif (restreint à l'Admin RH)
router.put('/:id/toggle', checkRHAccess, toggleLeaveReasonStatus);

// Détail, modification et suppression
router.route('/:id')
  .get(getLeaveReasonById)
  .put(checkRHAccess, updateLeaveReason)
  .delete(checkRHAccess, deleteLeaveReason);

module.exports = router;
