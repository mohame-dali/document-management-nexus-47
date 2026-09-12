
const Message = require('../../models/Message');
const ErrorResponse = require('../../utils/errorResponse');

// Helper to format messages with read status and recipient info
const formatMessages = (messages, userId) => {
  return messages.map(message => {
    const messageObj = message.toObject ? message.toObject() : { ...message };
    
    // Check if user is recipient and extract read status
    const recipient = messageObj.recipients?.find(
      r => r.user && (r.user._id ? r.user._id.toString() : r.user.toString()) === userId.toString()
    );
    
    // Is user the sender?
    const senderId = messageObj.sender && (messageObj.sender._id ? messageObj.sender._id.toString() : messageObj.sender.toString());
    const isSender = senderId === userId.toString();
    
    // Set read status: if recipient, use their read status; if sender, true
    messageObj.isRead = recipient ? recipient.read : true;
    messageObj.isSender = isSender;
    
    // Fallback role
    if (messageObj.sender && typeof messageObj.sender === 'object' && !messageObj.sender.role) {
      messageObj.sender.role = 'User';
    }
    
    // Fallback priority
    if (!messageObj.priority) {
      messageObj.priority = 'normal';
    }
    
    // Fallback message type
    if (!messageObj.messageType) {
      messageObj.messageType = (messageObj.recipients && messageObj.recipients.length > 1) ? 'one-to-many' : 'one-to-one';
    }
    
    messageObj.recipientCount = messageObj.recipients ? messageObj.recipients.length : 0;
    
    return messageObj;
  });
};

// @desc    Get messages for a user (supports ?type=inbox|sent|all & ?search=)
// @route   GET /api/messages
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    const { type, search } = req.query;
    const userId = req.user._id;
    
    // Build query filter
    const query = {
      deletedBy: { $ne: userId }
    };
    
    if (type === 'sent') {
      query.sender = userId;
    } else if (type === 'inbox' || type === 'received') {
      query['recipients.user'] = userId;
    } else {
      query.$or = [
        { sender: userId },
        { 'recipients.user': userId }
      ];
    }
    
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { subject: searchRegex },
          { content: searchRegex }
        ]
      });
    }
    
    const messages = await Message.find(query)
      .populate({
        path: 'sender',
        select: 'username photo role activeDepartment',
        populate: {
          path: 'activeDepartment',
          select: 'name'
        }
      })
      .populate({
        path: 'recipients.user',
        select: 'username photo role activeDepartment',
        populate: {
          path: 'activeDepartment',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 });
      
    const formattedMessages = formatMessages(messages, userId);
    
    // Calculate global stats for the user
    const [unreadCount, inboxCount, sentCount] = await Promise.all([
      Message.countDocuments({
        'recipients': {
          $elemMatch: {
            'user': userId,
            'read': false
          }
        },
        deletedBy: { $ne: userId }
      }),
      Message.countDocuments({
        'recipients.user': userId,
        deletedBy: { $ne: userId }
      }),
      Message.countDocuments({
        sender: userId,
        deletedBy: { $ne: userId }
      })
    ]);
    
    const oneToOneCount = formattedMessages.filter(msg => msg.messageType === 'one-to-one').length;
    const groupCount = formattedMessages.filter(msg => msg.messageType === 'one-to-many').length;
    
    res.status(200).json({
      success: true,
      count: formattedMessages.length,
      unreadCount,
      inboxCount,
      sentCount,
      oneToOneCount,
      groupCount,
      data: formattedMessages
    });
  } catch (err) {
    console.error('Error getting messages:', err);
    next(err);
  }
};

// @desc    Get inbox messages (convenience endpoint)
// @route   GET /api/messages/inbox
// @access  Private
exports.getInboxMessages = async (req, res, next) => {
  req.query.type = 'inbox';
  return exports.getMessages(req, res, next);
};

// @desc    Get sent messages (convenience endpoint)
// @route   GET /api/messages/sent
// @access  Private
exports.getSentMessages = async (req, res, next) => {
  req.query.type = 'sent';
  return exports.getMessages(req, res, next);
};

