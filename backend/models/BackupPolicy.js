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
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BackupPolicy', BackupPolicySchema);