const express = require('express');
const {
  getTrash,
  restoreItem,
  permanentDelete,
  emptyTrash
} = require('../controllers/trashController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All trash routes require authentication and admin roles (Director and User excluded)
router.use(protect);
router.use(authorize('Admin', 'AdminTuningDesk', 'AdminDepartment'));

// Get trash items
router.get('/', getTrash);

// Empty trash
router.delete(
  '/empty',
  emptyTrash
);

// Restore item (supports both /:type/:id/restore and /restore/:type/:id)
router.put(
  '/:type/:id/restore',
  restoreItem
);
router.put(
  '/restore/:type/:id',
  restoreItem
);

// Permanent delete (supports /:type/:id/permanent, /permanent/:type/:id, and /:type/:id)
router.delete(
  '/:type/:id/permanent',
  permanentDelete
);
router.delete(
  '/permanent/:type/:id',
  permanentDelete
);
router.delete(
  '/:type/:id',
  permanentDelete
);

module.exports = router;
