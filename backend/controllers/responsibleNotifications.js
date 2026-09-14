
const ResponsibleNotification = require('../models/ResponsibleNotification');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get unread responsible notifications for current user
// @route   GET /api/responsible-notifications/unread
// @access  Private
exports.getUnreadNotifications = async (req, res, next) => {
  try {
    const currentTime = new Date();
    
    const notifications = await ResponsibleNotification.find({
      assignedUserId: req.user.id,
      isRead: false,
      $or: [
        { isDismissed: false },
        { 
          isDismissed: true,
          dismissedUntil: { $lte: currentTime }
        }
      ]
    })
    .populate('documentId', 'subject serialNumber year')
    .populate('assignedBy', 'username')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/responsible-notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await ResponsibleNotification.findOneAndUpdate(
      { 
        _id: req.params.id,
        assignedUserId: req.user.id
      },
      { 
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return next(
        new ErrorResponse('Notification not found', 404)
      );
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Temporarily dismiss notification
// @route   PUT /api/responsible-notifications/:id/dismiss
// @access  Private
exports.dismissNotification = async (req, res, next) => {
  try {
    const { dismissMinutes = 60 } = req.body;
    
    const dismissedUntil = new Date();
    dismissedUntil.setMinutes(dismissedUntil.getMinutes() + dismissMinutes);

    const notification = await ResponsibleNotification.findOneAndUpdate(
      { 
        _id: req.params.id,
        assignedUserId: req.user.id
      },
      { 
        isDismissed: true,
        dismissedUntil: dismissedUntil
      },
      { new: true }
    );

    if (!notification) {
      return next(
        new ErrorResponse('Notification not found', 404)
      );
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create responsible notification (internal use)
// @route   POST /api/responsible-notifications
// @access  Private
exports.createNotification = async (req, res, next) => {
  try {
    const { documentId, assignedUserId, assignedBy } = req.body;

    // Check if notification already exists for this document and user
    const existingNotification = await ResponsibleNotification.findOne({
      documentId,
      assignedUserId,
      isRead: false
    });

    if (existingNotification) {
      return res.status(200).json({
        success: true,
        data: existingNotification,
        message: 'Notification already exists'
      });
    }

    const notification = await ResponsibleNotification.create({
      documentId,
      assignedUserId,
      assignedBy
    });

    const populatedNotification = await ResponsibleNotification.findById(notification._id)
      .populate('documentId', 'subject serialNumber year')
      .populate('assignedBy', 'username');

    res.status(201).json({
      success: true,
      data: populatedNotification
    });
  } catch (err) {
    next(err);
  }
};
