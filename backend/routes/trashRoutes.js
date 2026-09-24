const express = require('express');
const {
  getTrash,
  restoreItem,
  permanentDelete,
  emptyTrash
} = require('../controllers/trashController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All trash routes require authentication
router.use(protect);

// Get trash items
router.get('/', getTrash);

// Empty trash
router.delete(
  '/empty',
  authorize('Admin', 'AdminTuningDesk', 'AdminDepartment'),
  emptyTrash
);

// Restore item (supports both /:type/:id/restore and /restore/:type/:id)
router.put(
  '/:type/:id/restore',
  authorize('Admin', 'AdminTuningDesk', 'AdminDepartment'),
  restoreItem
);
router.put(
  '/restore/:type/:id',
  authorize('Admin', 'AdminTuningDesk', 'AdminDepartment'),
  restoreItem
);

// Permanent delete (supports /:type/:id/permanent, /permanent/:type/:id, and /:type/:id)
router.delete(
  '/:type/:id/permanent',
  authorize('Admin', 'AdminTuningDesk', 'AdminDepartment'),
  permanentDelete
);
router.delete(
  '/permanent/:type/:id',
  authorize('Admin', 'AdminTuningDesk', 'AdminDepartment'),
  permanentDelete
);
router.delete(
  '/:type/:id',
  authorize('Admin', 'AdminTuningDesk', 'AdminDepartment'),
  permanentDelete
);

module.exports = router;
