
const Message = require('../../models/Message');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get all messages for a user
// @route   GET /api/messages
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    console.log('Getting messages for user:', req.user._id, 'Role:', req.user.role);
    
    // Enhanced query for all roles including User - get messages where user is either sender or recipient
    const messages = await Message.find({
      $or: [
        { sender: req.user._id },
        { 'recipients.user': req.user._id }
      ]
    }).populate({
      path: 'sender',
      select: 'username photo role activeDepartment',
      populate: {
        path: 'activeDepartment',
        select: 'name'
      }
    }).populate({
      path: 'recipients.user',
      select: 'username photo role activeDepartment',
      populate: {
        path: 'activeDepartment',
        select: 'name'
      }
    }).sort({ createdAt: -1 });
    
    console.log('Found messages:', messages.length);
    
    // Enhanced message processing for all user roles including User
    const messagesWithReadStatus = messages.map(message => {
      const messageObj = message.toObject();
      
      // Determine if current user is a recipient and get read status
      const recipient = messageObj.recipients.find(
        r => r.user && r.user._id && r.user._id.toString() === req.user._id.toString()
      );
      
      // Set read status: if user is recipient, use their read status; if sender, mark as read
      messageObj.isRead = recipient ? recipient.read : true;
      
      // Ensure role information is properly available for cross-role messaging
      if (messageObj.sender && !messageObj.sender.role) {
        messageObj.sender.role = 'User'; // Default fallback
      }
      
      // Ensure messageType and crossDepartment are set if not already present
      if (!messageObj.messageType) {
        messageObj.messageType = messageObj.recipients.length === 1 ? 'one-to-one' : 'one-to-many';
      }
      
      if (messageObj.crossDepartment === undefined) {
        messageObj.crossDepartment = false;
      }
      
      // Add recipient count for better UI display
      messageObj.recipientCount = messageObj.recipients.length;
      
      return messageObj;
    });
    
    // Calculate comprehensive statistics
    const unreadCount = messagesWithReadStatus.filter(msg => !msg.isRead).length;
    const oneToOneCount = messagesWithReadStatus.filter(msg => msg.messageType === 'one-to-one').length;
    const groupCount = messagesWithReadStatus.filter(msg => msg.messageType === 'one-to-many').length;
    
    console.log(`Messages for ${req.user.role}: Total: ${messagesWithReadStatus.length}, Unread: ${unreadCount}`);
    
    res.status(200).json({
      success: true,
      count: messagesWithReadStatus.length,
      unreadCount: unreadCount,
      oneToOneCount: oneToOneCount,
      groupCount: groupCount,
      data: messagesWithReadStatus
    });
  } catch (err) {
    console.error('Error getting messages:', err);
    next(err);
  }
};
