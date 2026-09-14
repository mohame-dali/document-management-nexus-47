
const mongoose = require('mongoose');

const documentOptionsSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['activity', 'source', 'typeDocument', 'assignedTo', 'pourInfo'],
    required: true
  },
  documentType: {
    type: String,
    enum: ['incoming', 'outgoing', 'both'],
    required: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure unique combination of category, documentType and value
documentOptionsSchema.index({ category: 1, documentType: 1, value: 1 }, { unique: true });

const DocumentOptions = mongoose.model('DocumentOptions', documentOptionsSchema);

module.exports = DocumentOptions;
