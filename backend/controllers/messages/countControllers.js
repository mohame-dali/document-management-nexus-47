
const Message = require('../../models/Message');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get unread message count for a user
// @route   GET /api/messages/unread/count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    console.log('Getting unread count for user:', req.user._id);
    
    // Count unread messages where user is a recipient
    // Available for all roles: Admin, AdminDepartment, AdminTuningDesk, User
    const unreadCount = await Message.countDocuments({
      'recipients': {
        $elemMatch: {
          'user': req.user._id,
          'read': false
        }
      }
    });
    
    console.log('Unread count:', unreadCount);
    
    res.status(200).json({
      success: true,
      data: unreadCount
    });
  } catch (err) {
    console.error('Error getting unread count:', err);
    next(err);
  }
};
