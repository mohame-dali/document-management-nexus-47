
const express = require('express');
const {
  getUnreadNotifications,
  markAsRead,
  dismissNotification,
  createNotification
} = require('../controllers/responsibleNotifications');

const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Routes
router.get('/unread', getUnreadNotifications);
router.put('/:id/read', markAsRead);
router.put('/:id/dismiss', dismissNotification);
router.post('/', createNotification);

module.exports = router;
