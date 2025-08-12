
const Message = require('../../models/Message');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get single message
// @route   GET /api/messages/:id
// @access  Private
exports.getMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'username photo role activeDepartment')
      .populate('recipients.user', 'username photo role activeDepartment');
    
    if (!message) {
      return next(
        new ErrorResponse(`Message not found with id of ${req.params.id}`, 404)
      );
    }
    
    console.log('Checking message access for user:', req.user._id.toString());
    console.log('Message sender:', message.sender._id.toString());
    console.log('Message recipients:', message.recipients.map(r => ({
      userId: r.user._id.toString(),
      read: r.read
    })));
    
    // Check if user has access to this message
    const isSender = message.sender._id.toString() === req.user._id.toString();
    const isRecipient = message.recipients.some(
      r => r.user._id.toString() === req.user._id.toString()
    );
    
    console.log('Access check - isSender:', isSender, 'isRecipient:', isRecipient);
    
    // Enhanced authorization: Allow access if user is sender, recipient, or Admin/AdminTuningDesk
    const hasAdminAccess = ['Admin', 'AdminTuningDesk'].includes(req.user.role);
    const hasAccess = isSender || isRecipient || hasAdminAccess;
    
    if (!hasAccess) {
      console.log(`User ${req.user.username} (${req.user.role}) denied access to message ${req.params.id}`);
      return next(
        new ErrorResponse(`Not authorized to access this message`, 403)
      );
    }
    
    console.log(`User ${req.user.username} (${req.user.role}) granted access to message ${req.params.id}`);
    
    // Mark as read if user is a recipient
    if (isRecipient) {
      let messageUpdated = false;
      message.recipients.forEach(recipient => {
        if (recipient.user._id.toString() === req.user._id.toString() && !recipient.read) {
          recipient.read = true;
          messageUpdated = true;
        }
      });
      
      if (messageUpdated) {
        await message.save();
        console.log(`Message ${req.params.id} marked as read by user ${req.user.username}`);
      }
    }
    
    res.status(200).json({
      success: true,
      data: message
    });
  } catch (err) {
    console.error('Error in getMessage:', err);
    next(err);
  }
};
