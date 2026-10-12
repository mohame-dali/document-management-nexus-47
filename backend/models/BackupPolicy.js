const mongoose = require('mongoose');

const BackupPolicySchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: false
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'weekly'
  },
  includeAttachments: {
    type: Boolean,
    default: true
  },
  compressionLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  retentionDays: {
    type: Number,
    default: 30,
    min: 1,
    max: 365
  },
  hour: {
    type: Number,
    default: 2,
    min: 0,
    max: 23
  },
  minute: {
    type: Number,
    default: 0,
    min: 0,
    max: 59
  },
  dayOfWeek: {
    type: Number,
    default: 0,
    min: 0,
    max: 6
  },
  dayOfMonth: {
    type: Number,
    default: 1,
    min: 1,
    max: 28
  },
  retentionCount: {
    type: Number,
    default: 10,
    min: 1,
    max: 100
  },
  lastBackupDate: {
    type: Date,
    default: null
  },
  nextScheduledBackup: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: false
  },
  updatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BackupPolicy', BackupPolicySchema);