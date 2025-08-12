
const mongoose = require('mongoose');

const responsibleNotificationSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IncomingDocument',
    required: true
  },
  assignedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  isDismissed: {
    type: Boolean,
    default: false
  },
  dismissedUntil: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
responsibleNotificationSchema.index({ assignedUserId: 1, isRead: 1, isDismissed: 1 });
responsibleNotificationSchema.index({ documentId: 1 });

const ResponsibleNotification = mongoose.model('ResponsibleNotification', responsibleNotificationSchema);

module.exports = ResponsibleNotification;
