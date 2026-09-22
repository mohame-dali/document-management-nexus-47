const mongoose = require('mongoose');

const RHSanctionSchema = new mongoose.Schema({
  personnelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Personnel',
    required: true,
    index: true
  },
  dateSanction: {
    type: Date,
    required: [true, 'La date de sanction est obligatoire']
  },
  nombreJours: {
    type: Number,
    default: 0
  },
  raison: {
    type: String,
    required: [true, 'La raison de la sanction est obligatoire'],
    trim: true
  },
  typeSanction: {
    type: String,
    default: '',
    trim: true
  },
  reference: {
    type: String,
    default: '',
    trim: true
  },
  observations: {
    type: String,
    default: '',
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

RHSanctionSchema.index({ personnelId: 1, dateSanction: -1 });

module.exports = mongoose.model('RHSanction', RHSanctionSchema);
