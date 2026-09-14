const ActivityNotification = require('../models/ActivityNotification');
const ErrorResponse = require('../utils/errorResponse');
const { 
  getUserActivityNotifications, 
  markNotificationAsRead 
} = require('../utils/activityNotificationHelper');

// @desc    Get user's activity notifications
// @route   GET /api/activity-notifications
// @access  Private
exports.getActivityNotifications = async (req, res, next) => {
  try {
    const notifications = await getUserActivityNotifications(req.user._id);
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching activity notifications:', error);
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/activity-notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const result = await markNotificationAsRead(req.params.id, req.user._id);
    
    if (result.matchedCount === 0) {
      return next(new ErrorResponse('Notification not found', 404));
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    next(error);
  }
};

// @desc    Get notification counts
// @route   GET /api/activity-notifications/count
// @access  Private
exports.getNotificationCount = async (req, res, next) => {
  try {
    const count = await ActivityNotification.countDocuments({
      'recipients': {
        $elemMatch: {
          'userId': req.user._id,
          'read': false
        }
      },
      isActive: true
    });
    
    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error getting notification count:', error);
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/activity-notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const result = await ActivityNotification.findByIdAndDelete(req.params.id);
    
    if (!result) {
      return next(new ErrorResponse('Notification not found', 404));
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    next(error);
  }
};
