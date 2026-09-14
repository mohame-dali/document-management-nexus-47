
const express = require('express');
const { 
  login, 
  getMe, 
  logout,
  updatePassword,
  switchDepartment,
  testAdminCredentials,
  resetAdminPassword
} = require('../controllers/auth');
const { protect, checkDepartmentAccess } = require('../middleware/auth');
const { auditLoginActivity } = require('../middleware/auditMiddleware');

const router = express.Router();

// Simple test route to verify API is accessible
router.get('/test', (req, res) => {
  res.status(200).json({ success: true, message: 'API is working' });
});

// Routes with audit logging
router.post('/login', auditLoginActivity, login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/updatepassword', protect, updatePassword);

// No department check needed for switchDepartment as we're validating inside the controller
router.put('/switchdepartment/:departmentId', protect, switchDepartment);

router.get('/test-admin', testAdminCredentials);
router.post('/reset-admin', resetAdminPassword);

module.exports = router;
