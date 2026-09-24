const mongoose = require('mongoose');

const leaveReasonSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  labelAr: {
    type: String,
    required: true,
    trim: true
  },
  labelFr: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['conge', 'mission', 'formation', 'service', 'autre']
  },
  impacteSolde: {
    type: Boolean,
    required: true,
    default: false
  },
  description: {
    type: String,
    trim: true
  },
  requiresDocument: {
    type: Boolean,
    default: false
  },
  requiresServiceName: {
    type: Boolean,
    default: false
  },
  requiresLieu: {
    type: Boolean,
    default: false
  },
  requiresFormationDetails: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#e2e8f0'
  },
  icon: {
    type: String,
    default: null
  },
  order: {
    type: Number,
    default: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

leaveReasonSchema.index({ category: 1, order: 1 });
leaveReasonSchema.index({ isActive: 1 });

module.exports = mongoose.model('LeaveReason', leaveReasonSchema);
