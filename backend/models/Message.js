
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
      ref: 'User' 
    },
    read: { 
      type: Boolean, 
      default: false 
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
  attachments: [{
    filename: String,
    path: String,
    size: Number,
    mimetype: String,
    priority: { 
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'  
    }
  }],
  // Enhanced fields for cross-department messaging
  messageType: {
    type: String,
    enum: ['one-to-one', 'one-to-many'],
    default: 'one-to-one'
  },
  crossDepartment: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
});

// Enhanced indexation for cross-department searches
messageSchema.index({ sender: 1, 'recipients.user': 1});
messageSchema.index({ crossDepartment: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
