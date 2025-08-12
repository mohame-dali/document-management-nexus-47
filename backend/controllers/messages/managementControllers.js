
const Message = require('../../models/Message');
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');
const fs = require('fs');
const path = require('path');

// @desc    Send message (supports both one-to-one and one-to-many, cross-department)
// @route   POST /api/messages
// @access  Private - All authenticated users
exports.sendMessage = async (req, res, next) => {
  try {
    const { recipientIds, subject, content } = req.body;
    
    console.log(`Send message request from ${req.user.username} (${req.user.role}) - Department: ${req.user.activeDepartment?.name || 'No Department'}`);
    console.log('Recipients:', recipientIds);
    
    // Validate required fields
    if (!recipientIds || !subject || !content) {
      return next(
        new ErrorResponse('Please provide recipients, subject and content', 400)
      );
    }
    
    // Parse and validate recipient IDs (support both single and multiple recipients)
    const ids = Array.isArray(recipientIds) ? recipientIds : 
               recipientIds.includes(',') ? recipientIds.split(',') : [recipientIds];
    
    if (ids.length === 0) {
      return next(
        new ErrorResponse('At least one recipient is required', 400)
      );
    }
    
    // Enhanced validation for cross-department communication - fetch all active users
    const recipients = await User.find({ 
      _id: { $in: ids },
      isActive: true
    }).populate('activeDepartment', 'name');
    
    if (recipients.length !== ids.length) {
      console.log(`Invalid recipients detected. Found: ${recipients.length}, Expected: ${ids.length}`);
      return next(
        new ErrorResponse(`Some recipient IDs are invalid or inactive`, 400)
      );
    }
    
    // Enhanced cross-department messaging support - ALL users can communicate across departments
    console.log(`Cross-department messaging: ${req.user.role} (${req.user.activeDepartment?.name || 'No Dept'}) sending to:`, 
      recipients.map(r => `${r.username}(${r.role}-${r.activeDepartment?.name || 'No Dept'})`));
    
    // Allow all valid roles to communicate with each other regardless of department
    const validRoles = ['SuperAdmin', 'Admin', 'AdminDepartment', 'AdminTuningDesk', 'User'];
    const senderRoleValid = validRoles.includes(req.user.role);
    const recipientRolesValid = recipients.every(r => validRoles.includes(r.role));
    
    if (!senderRoleValid || !recipientRolesValid) {
      console.log(`Invalid roles detected. Sender: ${req.user.role}, Recipients: ${recipients.map(r => r.role)}`);
      return next(
        new ErrorResponse('Invalid user roles detected', 400)
      );
    }
    
    // Cross-department communication validation - explicitly allow all department combinations
    const senderDept = req.user.activeDepartment?.name || 'System';
    const recipientDepts = recipients.map(r => r.activeDepartment?.name || 'System');
    
    console.log(`Cross-department communication enabled: ${senderDept} → [${recipientDepts.join(', ')}]`);
    
    // Special logging for User role messaging
    if (req.user.role === 'User') {
      console.log(`User role messaging enabled: ${req.user.username} from ${senderDept} can send messages`);
    }
    
    // Special logging for cross-department AdminDepartment communication
    const crossDeptAdmins = recipients.filter(r => 
      r.role === 'AdminDepartment' && 
      r.activeDepartment?._id.toString() !== req.user.activeDepartment?._id.toString()
    );
    
    if (crossDeptAdmins.length > 0) {
      console.log(`Cross-department AdminDepartment communication: ${senderDept} → ${crossDeptAdmins.map(r => r.activeDepartment?.name).join(', ')}`);
    }
    
    // Prepare recipients data for message storage
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
      console.log(`${attachments.length} attachments processed`);
    }
    
    // Create message with enhanced metadata for cross-department messaging
    const message = await Message.create({
      sender: req.user._id,
      recipients: recipientsData,
      subject,
      content,
      attachments,
      // Add message type and metadata for better categorization
      messageType: recipientsData.length === 1 ? 'one-to-one' : 'one-to-many',
      // Add cross-department flag for analytics
      crossDepartment: recipients.some(r => 
        r.activeDepartment?._id.toString() !== req.user.activeDepartment?._id.toString()
      )
    });
    
    // Populate comprehensive data for response
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
    
    const messageTypeDesc = recipientsData.length === 1 ? 'One-to-One' : 'One-to-Many';
    const crossDeptDesc = message.crossDepartment ? ' (Cross-Department)' : '';
    
    console.log(`Message sent successfully: ${messageTypeDesc}${crossDeptDesc} from ${req.user.role}(${senderDept}) to ${recipients.map(r => `${r.role}(${r.activeDepartment?.name || 'System'})`).join(', ')}`);
    
    res.status(201).json({
      success: true,
      messageType: messageTypeDesc,
      crossDepartment: message.crossDepartment,
      data: populatedMessage
    });
  } catch (err) {
    console.error('Error sending message:', err);
    next(err);
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private - Sender, Admin, or AdminTuningDesk
exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return next(
        new ErrorResponse(`Message not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Enhanced deletion permissions - sender or Admin/AdminTuningDesk can delete
    const isSender = message.sender.toString() === req.user._id.toString();
    const hasAdminAccess = ['Admin', 'AdminTuningDesk'].includes(req.user.role);
    
    if (!isSender && !hasAdminAccess) {
      return next(
        new ErrorResponse(`Not authorized to delete this message`, 403)
      );
    }
    
    // Delete attachments if any
    if (message.attachments && message.attachments.length > 0) {
      message.attachments.forEach(attachment => {
        const filePath = path.join(__dirname, '../..', attachment.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    await message.deleteOne();
    
    console.log(`Message deleted by ${req.user.role}: ${req.params.id}`);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    let message = await Message.findById(req.params.id);
    
    if (!message) {
      return next(
        new ErrorResponse(`Message not found with id of ${req.params.id}`, 404)
      );
    }
    
    console.log(`Mark as read request from ${req.user.username} (${req.user.role}) for message ${req.params.id}`);
    
    // Enhanced permissions: Allow AdminTuningDesk to mark any message as read, and Users to mark their own messages
    if (req.user.role === 'AdminTuningDesk') {
      console.log(`AdminTuningDesk ${req.user.username} marking message as read with administrative privileges`);
      
      // Find if user is already a recipient, if not, we'll just mark it as read without modifying recipients
      const recipient = message.recipients.find(
        r => r.user.toString() === req.user._id.toString()
      );
      
      if (recipient) {
        recipient.read = true;
      } else {
        // For AdminTuningDesk, we'll add them as a recipient if they're not already
        message.recipients.push({
          user: req.user._id,
          read: true
        });
      }
      
      await message.save();
    } else {
      // For other users (including User role), check if they are a recipient
      const recipient = message.recipients.find(
        r => r.user.toString() === req.user._id.toString()
      );
      
      if (!recipient) {
        console.log(`User ${req.user.username} (${req.user.role}) is not a recipient of message ${req.params.id}`);
        return next(
          new ErrorResponse(`Not authorized to mark this message as read`, 403)
        );
      }
      
      // Update read status
      recipient.read = true;
      await message.save();
    }
    
    // Populate comprehensive data for response
    message = await Message.findById(req.params.id)
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
    
    console.log(`Message marked as read by ${req.user.role}: ${req.params.id}`);
    
    res.status(200).json({
      success: true,
      data: message
    });
  } catch (err) {
    console.error('Error marking message as read:', err);
    next(err);
  }
};
