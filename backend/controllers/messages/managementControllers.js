
const Message = require('../../models/Message');
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');
const fs = require('fs');
const path = require('path');

// @desc    Send message (supports one-to-one and one-to-many, priority, attachments)
// @route   POST /api/messages
// @access  Private - All authenticated users
exports.sendMessage = async (req, res, next) => {
  try {
    const { recipientIds, subject, content, priority = 'normal' } = req.body;
    
    // Validate required fields
    if (!recipientIds || !subject || !content) {
      return next(
        new ErrorResponse('يرجى تحديد المستلمين والموضوع ونص الرسالة', 400)
      );
    }
    
    // Parse and validate recipient IDs
    let ids = [];
    if (Array.isArray(recipientIds)) {
      ids = recipientIds;
    } else if (typeof recipientIds === 'string') {
      try {
        const parsed = JSON.parse(recipientIds);
        ids = Array.isArray(parsed) ? parsed : [recipientIds];
      } catch {
        ids = recipientIds.includes(',') ? recipientIds.split(',').map(id => id.trim()) : [recipientIds];
      }
    }
    
    ids = ids.filter(Boolean);
    
    if (ids.length === 0) {
      return next(
        new ErrorResponse('يجب تحديد مستلم واحد على الأقل', 400)
      );
    }
    
    // Fetch all active recipients
    const recipients = await User.find({ 
      _id: { $in: ids },
      isActive: true
    }).populate('activeDepartment', 'name');
    
    if (recipients.length === 0) {
      return next(
        new ErrorResponse('لم يتم العثور على مستلمين صالحين', 400)
      );
    }
    
    // Prepare recipients data
    const recipientsData = recipients.map(recipient => ({
      user: recipient._id,
      read: false
    }));
    
    // Handle file attachments
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path.replace(/\\/g, '/'),
        size: file.size,
        mimetype: file.mimetype
      }));
    }
    
    // Check if cross-department
    const senderDeptId = req.user.activeDepartment?._id ? req.user.activeDepartment._id.toString() : null;
    const isCrossDepartment = recipients.some(r => {
      const rDeptId = r.activeDepartment?._id ? r.activeDepartment._id.toString() : null;
      return rDeptId !== senderDeptId;
    });
    
    // Valid priority values
    const validPriority = ['normal', 'high', 'urgent'].includes(priority) ? priority : 'normal';
    
    // Create message
    const message = await Message.create({
      sender: req.user._id,
      recipients: recipientsData,
      subject: subject.trim(),
      content: content.trim(),
      priority: validPriority,
      attachments,
      messageType: recipientsData.length === 1 ? 'one-to-one' : 'one-to-many',
      crossDepartment: isCrossDepartment,
      deletedBy: []
    });
    
    // Populate message for response
    const populatedMessage = await Message.findById(message._id)
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
      });
      
    const messageObj = populatedMessage.toObject ? populatedMessage.toObject() : populatedMessage;
    messageObj.isRead = true;
    messageObj.isSender = true;
    messageObj.recipientCount = recipientsData.length;
    
    res.status(201).json({
      success: true,
      data: messageObj
    });
  } catch (err) {
    console.error('Error sending message:', err);
    next(err);
  }
};

// @desc    Delete message (soft delete for user, or permanent if admin/all deleted)
// @route   DELETE /api/messages/:id
// @access  Private
exports.deleteMessage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return next(
        new ErrorResponse(`Message not found with id of ${req.params.id}`, 404)
      );
    }
    
    const isSender = message.sender.toString() === userId.toString();
    const isRecipient = message.recipients.some(
      r => r.user && r.user.toString() === userId.toString()
    );
    const hasAdminAccess = ['Admin', 'AdminTuningDesk', 'SuperAdmin'].includes(req.user.role);
    
    if (!isSender && !isRecipient && !hasAdminAccess) {
      return next(
        new ErrorResponse('غير مصرح لك بحذف هذه الرسالة', 403)
      );
    }
    
    // If admin explicitly requests hard delete or if already deleted by all others
    message.deletedBy = message.deletedBy || [];
    if (!message.deletedBy.some(id => id.toString() === userId.toString())) {
      message.deletedBy.push(userId);
    }
    
    // Check all relevant parties
    const allPartyIds = [message.sender.toString(), ...message.recipients.map(r => r.user.toString())];
    const deletedByAll = allPartyIds.every(id => 
      message.deletedBy.some(dId => dId.toString() === id)
    );
    
    if (deletedByAll || hasAdminAccess) {
      // Remove physical attachments if needed
      if (message.attachments && message.attachments.length > 0) {
        message.attachments.forEach(attachment => {
          if (attachment.path) {
            const filePath = path.join(__dirname, '../..', attachment.path);
            if (fs.existsSync(filePath)) {
              try { fs.unlinkSync(filePath); } catch (e) { console.error(e); }
            }
          }
        });
      }
      await message.deleteOne();
    } else {
      await message.save();
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark single message as read
// @route   PUT /api/messages/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let message = await Message.findById(req.params.id);
    
    if (!message) {
      return next(
        new ErrorResponse(`Message not found with id of ${req.params.id}`, 404)
      );
    }
    
    const recipient = message.recipients.find(
      r => r.user && r.user.toString() === userId.toString()
    );
    
    const hasAdminAccess = ['Admin', 'AdminTuningDesk', 'SuperAdmin'].includes(req.user.role);
    
    if (recipient) {
      recipient.read = true;
      recipient.readAt = new Date();
      await message.save();
    } else if (hasAdminAccess) {
      // Admin preview
      await message.save();
    } else {
      return next(
        new ErrorResponse('غير مصرح لك بتعديل حالة هذه الرسالة', 403)
      );
    }
    
    const populated = await Message.findById(req.params.id)
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
      });
      
    const messageObj = populated.toObject ? populated.toObject() : populated;
    messageObj.isRead = true;
    messageObj.isSender = messageObj.sender && (messageObj.sender._id ? messageObj.sender._id.toString() : messageObj.sender.toString()) === userId.toString();
    
    res.status(200).json({
      success: true,
      data: messageObj
    });
  } catch (err) {
    console.error('Error marking message as read:', err);
    next(err);
  }
};

// @desc    Mark all unread messages as read for current user
// @route   PUT /api/messages/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const result = await Message.updateMany(
      {
        'recipients': {
          $elemMatch: {
            'user': userId,
            'read': false
          }
        },
        deletedBy: { $ne: userId }
      },
      {
        $set: {
          'recipients.$[elem].read': true,
          'recipients.$[elem].readAt': new Date()
        }
      },
      {
        arrayFilters: [{ 'elem.user': userId, 'elem.read': false }]
      }
    );
    
    res.status(200).json({
      success: true,
      updated: result.modifiedCount || 0
    });
  } catch (err) {
    console.error('Error marking all as read:', err);
    next(err);
  }
};

