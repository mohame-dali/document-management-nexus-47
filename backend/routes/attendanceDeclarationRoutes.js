const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/attendanceDeclarationController');

const readAdminRoles = ['Director', 'Admin', 'AdminDepartment'];
const writeAdminRoles = ['Admin', 'AdminDepartment'];

router.post('/declarations', protect, ctrl.declareAttendance);
router.get('/declarations/me', protect, ctrl.getMyDeclarations);
router.get('/declarations', protect, authorize(...readAdminRoles), ctrl.getAllDeclarations);
router.put('/declarations/:id/approve', protect, authorize(...writeAdminRoles), ctrl.approveDeclaration);
router.put('/declarations/:id/reject', protect, authorize(...writeAdminRoles), ctrl.rejectDeclaration);
router.put('/declarations/:id', protect, authorize(...writeAdminRoles), ctrl.updateDeclaration);
router.delete('/declarations/:id', protect, ctrl.deleteDeclaration);

module.exports = router;
