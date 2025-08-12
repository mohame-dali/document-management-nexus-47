
const express = require('express');
const {
  getActivityNotifications,
  markAsRead,
  getNotificationCount,
  deleteNotification
} = require('../controllers/activityNotifications');

const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

router.route('/').get(getActivityNotifications);
router.route('/count').get(getNotificationCount);
router.route('/:id/read').put(markAsRead);
router.route('/:id').delete(deleteNotification);

module.exports = router;
