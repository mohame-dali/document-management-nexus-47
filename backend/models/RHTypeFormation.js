const mongoose = require('mongoose');

const RHTypeFormationSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  nom: {
    type: String,
    required: true,
    trim: true
  },
  nomAr: {
    type: String,
    required: true,
    trim: true
  },
  categorie: {
    type: String,
    enum: ['technique', 'tactique', 'langue', 'management', 'autre'],
    default: 'autre'
  },
  dureeReference: {
    type: Number,
    default: 0,
    min: 0
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
RHTypeFormationSchema.index({ isActive: 1 });
RHTypeFormationSchema.index({ categorie: 1 });

module.exports = mongoose.model('RHTypeFormation', RHTypeFormationSchema);
