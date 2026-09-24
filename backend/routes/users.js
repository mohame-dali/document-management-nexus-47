
const express = require('express');
const { 
  getUsers, 
  getUser, 
  createUser, 
  updateUser, 
  deleteUser,
  restoreUser,
  deactivateUser,
  resetPassword,
  uploadPhoto
} = require('../controllers/users');
const { updateUserPassword } = require('../controllers/auth/passwordController');
const { protect, authorize, checkDepartmentAccess } = require('../middleware/auth');
const { uploadUserPhoto } = require('../middleware/upload');
const { auditDocumentActivity } = require('../middleware/auditMiddleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// IMPORTANT: Place specific routes BEFORE parameterized routes
// Messaging route - accessible to ALL authenticated users for cross-role messaging
router.get('/messaging', getUsers);

// Main users routes - restricted to admin roles
router.route('/')
  .get(authorize('Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk'), getUsers)
  .post(
    authorize('Admin'),
    auditDocumentActivity('user_create'), 
    createUser
  );

// User-specific routes (/:id must come after specific routes like /messaging)
router.route('/:id')
  .get(authorize('Director', 'Admin', 'AdminDepartment'), getUser)
  .put(
    authorize('Admin'),
    auditDocumentActivity('user_update'), 
    updateUser
  )
  .delete(
    authorize('Admin'),
    auditDocumentActivity('user_delete'), 
    deleteUser
  );

// Additional routes
router.put('/:id/restore',
  authorize('Admin'),
  auditDocumentActivity('user_update'),
  restoreUser
);

router.put('/:id/deactivate', 
  authorize('Admin'),
  auditDocumentActivity('user_update'), 
  deactivateUser
);

router.put('/:id/resetpassword', 
  authorize('Admin'),
  auditDocumentActivity('user_update'), 
  resetPassword
);

router.put('/:id/password', 
  authorize('Admin'),
  auditDocumentActivity('user_update'), 
  updateUserPassword
);

router.put('/:id/photo', 
  authorize('Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk', 'User'), 
  uploadUserPhoto.single('photo'),
  auditDocumentActivity('user_update'), 
  uploadPhoto
);

module.exports = router;
