
const express = require('express');
const { 
  login, 
  getMe, 
  logout,
  updatePassword,
  switchDepartment
} = require('../controllers/auth');
const { protect, checkDepartmentAccess } = require('../middleware/auth');
const { auditLoginActivity } = require('../middleware/auditMiddleware');

const router = express.Router();

// Routes with audit logging
router.post('/login', auditLoginActivity, login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/updatepassword', protect, updatePassword);

// No department check needed for switchDepartment as we're validating inside the controller
router.put('/switchdepartment/:departmentId', protect, switchDepartment);

module.exports = router;
