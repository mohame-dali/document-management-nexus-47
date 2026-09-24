const mongoose = require('mongoose');

const RHEcoleSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nomAr: {
    type: String,
    required: true,
    trim: true
  },
  pays: {
    type: String,
    default: 'تونس',
    trim: true
  },
  ville: {
    type: String,
    default: '',
    trim: true
  },
  adresse: {
    type: String,
    default: ''
  },
  telephone: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: '',
    lowercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['militaire', 'civile', 'universitaire'],
    default: 'militaire'
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Index
RHEcoleSchema.index({ isActive: 1 });
RHEcoleSchema.index({ pays: 1, ville: 1 });

module.exports = mongoose.model('RHEcole', RHEcoleSchema);
