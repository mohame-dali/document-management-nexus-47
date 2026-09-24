
const Message = require('../../models/Message');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get single message
// @route   GET /api/messages/:id
// @access  Private
exports.getMessage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const message = await Message.findById(req.params.id)
      .populate('sender', 'username photo role activeDepartment')
      .populate('recipients.user', 'username photo role activeDepartment');
    
    if (!message) {
      return next(
        new ErrorResponse(`Message not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Check if user has deleted this message for themselves
    if (message.deletedBy && message.deletedBy.some(id => id.toString() === userId.toString())) {
      return next(
        new ErrorResponse(`Message not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Check if user has access to this message
    const isSender = message.sender && message.sender._id.toString() === userId.toString();
    const isRecipient = message.recipients && message.recipients.some(
      r => r.user && r.user._id.toString() === userId.toString()
    );
    
    const hasAdminAccess = ['Admin', 'AdminTuningDesk', 'Director'].includes(req.user.role);
    const hasAccess = isSender || isRecipient || hasAdminAccess;
    
    if (!hasAccess) {
      return next(
        new ErrorResponse(`Not authorized to access this message`, 403)
      );
    }
    
    // Mark as read if user is a recipient and unread
    if (isRecipient) {
      let messageUpdated = false;
      message.recipients.forEach(recipient => {
        if (recipient.user && recipient.user._id.toString() === userId.toString() && !recipient.read) {
          recipient.read = true;
          recipient.readAt = new Date();
          messageUpdated = true;
        }
      });
      
      if (messageUpdated) {
        await message.save();
      }
    }
    
    const messageObj = message.toObject ? message.toObject() : { ...message };
    const recipient = messageObj.recipients?.find(
      r => r.user && (r.user._id ? r.user._id.toString() : r.user.toString()) === userId.toString()
    );
    messageObj.isRead = recipient ? recipient.read : true;
    messageObj.isSender = isSender;
    
    res.status(200).json({
      success: true,
      data: messageObj
    });
  } catch (err) {
    console.error('Error in getMessage:', err);
    next(err);
  }
};

