
const Message = require('../../models/Message');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get unread message count for a user
// @route   GET /api/messages/unread/count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Message.countDocuments({
      'recipients': {
        $elemMatch: {
          'user': req.user._id,
          'read': false
        }
      },
      deletedBy: { $ne: req.user._id }
    });
    
    res.status(200).json({
      success: true,
      count: unreadCount,
      data: unreadCount
    });
  } catch (err) {
    console.error('Error getting unread count:', err);
    next(err);
  }
};

