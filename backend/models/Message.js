
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  recipients: [{
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    read: { 
      type: Boolean, 
      default: false 
    },
    readAt: {
      type: Date
    }
  }],
  subject: { 
    type: String, 
    required: true, 
    trim: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  priority: {
    type: String,
    enum: ['normal', 'high', 'urgent'],
    default: 'normal'
  },
  attachments: [{
    filename: String,
    path: String,
    size: Number,
    mimetype: String
  }],
  messageType: {
    type: String,
    enum: ['one-to-one', 'one-to-many'],
    default: 'one-to-one'
  },
  crossDepartment: {
    type: Boolean,
    default: false
  },
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
});

// Indexation for performance
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ 'recipients.user': 1, createdAt: -1 });
messageSchema.index({ 'recipients.user': 1, 'recipients.read': 1 });
messageSchema.index({ crossDepartment: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;

