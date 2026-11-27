
const express = require('express');
const { 
  getUsers, 
  getAssignableUsers,
  getUser, 
  createUser, 
  updateUser, 
  deleteUser,
  restoreUser,
  permanentDeleteUser,
  deactivateUser,
  resetPassword,
  uploadPhoto
} = require('../controllers/users');
const { getOnlineUsers, heartbeat } = require('../controllers/users/onlineControllers');
const { updateUserPassword } = require('../controllers/auth/passwordController');
const { protect, authorize, checkDepartmentAccess } = require('../middleware/auth');
const { uploadUserPhoto } = require('../middleware/upload');
const { auditDocumentActivity } = require('../middleware/auditMiddleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// Online presence routes
router.get('/online', getOnlineUsers);
router.post('/heartbeat', heartbeat);

// IMPORTANT: Place specific routes BEFORE parameterized routes
// Messaging route - accessible to ALL authenticated users for cross-role messaging
router.get('/messaging', getUsers);

// Assignable department users route - restricted to department managers, Admin, and Director
router.get('/assignable', authorize('Director', 'Admin', 'AdminDepartment'), getAssignableUsers);

// Main users routes - restricted to admin roles (and RH manager checked in controllers)
router.route('/')
  .get(authorize('Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk'), getUsers)
  .post(
    authorize('Admin', 'AdminDepartment'),
    auditDocumentActivity('user_create'), 
    createUser
  );

// User-specific routes (/:id must come after specific routes like /messaging)
router.route('/:id')
  .get(authorize('Director', 'Admin', 'AdminDepartment'), getUser)
  .put(
    authorize('Admin', 'AdminDepartment'),
    auditDocumentActivity('user_update'), 
    updateUser
  )
  .delete(
    authorize('Admin', 'AdminDepartment'),
    auditDocumentActivity('user_delete'), 
    deleteUser
  );

// Additional routes
router.route('/:id/restore')
  .patch(
    authorize('Admin', 'AdminDepartment'),
    auditDocumentActivity('user_update'),
    restoreUser
  )
  .put(
    authorize('Admin', 'AdminDepartment'),
    auditDocumentActivity('user_update'),
    restoreUser
  );

router.delete('/:id/permanent',
  authorize('Admin', 'AdminDepartment'),
  auditDocumentActivity('user_delete'),
  permanentDeleteUser
);

router.put('/:id/deactivate', 
  authorize('Admin', 'AdminDepartment'),
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
  authorize('Admin', 'AdminDepartment', 'AdminTuningDesk', 'User'), 
  uploadUserPhoto.single('photo'),
  auditDocumentActivity('user_update'), 
  uploadPhoto
);

module.exports = router;
