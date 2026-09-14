
const mongoose = require('mongoose');

const activityNotificationSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IncomingDocument',
    required: true
  },
  activity: {
    type: String,
    required: true
  },
  dateActivity: {
    type: Date,
    required: true
  },
  notificationType: {
    type: String,
    enum: ['today', 'tomorrow', '2days', '3days', 'overdue'],
    required: true
  },
  recipients: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    }
  }],
  message: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

activityNotificationSchema.index({ documentId: 1 });
activityNotificationSchema.index({ dateActivity: 1 });
activityNotificationSchema.index({ 'recipients.userId': 1 });
activityNotificationSchema.index({ notificationType: 1 });

const ActivityNotification = mongoose.model('ActivityNotification', activityNotificationSchema);

module.exports = ActivityNotification;
