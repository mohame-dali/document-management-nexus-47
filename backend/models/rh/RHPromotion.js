const mongoose = require('mongoose');

const RHPromotionSchema = new mongoose.Schema({
  personnelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Personnel',
    required: true,
    index: true
  },
  gradePrecedent: {
    type: String,
    default: '',
    trim: true
  },
  gradeNouveau: {
    type: String,
    required: [true, 'Le nouveau grade est obligatoire'],
    trim: true
  },
  datePromotion: {
    type: Date,
    required: [true, 'La date de promotion est obligatoire']
  },
  reference: {
    type: String,
    default: '',
    trim: true
  },
  motif: {
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

RHPromotionSchema.index({ personnelId: 1, datePromotion: -1 });

module.exports = mongoose.model('RHPromotion', RHPromotionSchema);
