const mongoose = require('mongoose');

const RHDiplomeSchema = new mongoose.Schema({
  personnelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Personnel',
    required: true,
    index: true
  },
  typeDiplome: {
    type: String,
    required: [true, 'Le type de diplôme est obligatoire'],
    trim: true
  },
  sujetDiplome: {
    type: String,
    required: [true, 'Le sujet du diplôme est obligatoire'],
    trim: true
  },
  dateObtention: {
    type: Date,
    required: [true, 'La date d\'obtention est obligatoire']
  },
  etablissement: {
    type: String,
    default: '',
    trim: true
  },
  reference: {
    type: String,
    default: '',
    trim: true
  },
  niveau: {
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

RHDiplomeSchema.index({ personnelId: 1, dateObtention: -1 });

module.exports = mongoose.model('RHDiplome', RHDiplomeSchema);
