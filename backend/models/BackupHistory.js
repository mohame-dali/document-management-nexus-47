const mongoose = require('mongoose');

const BackupHistorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['manual', 'automatic'],
    required: true
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'failed'],
    default: 'in_progress'
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    default: 0
  },
  documentsCount: {
    incomingDocuments: {
      type: Number,
      default: 0
    },
    outgoingDocuments: {
      type: Number,
      default: 0
    }
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
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  backupYear: {
    type: Number,
    default: null
  },
  exportPath: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BackupHistory', BackupHistorySchema);