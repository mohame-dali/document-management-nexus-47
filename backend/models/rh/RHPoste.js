const mongoose = require('mongoose');

const RHPosteSchema = new mongoose.Schema({
  personnelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Personnel',
    required: true,
    index: true
  },
  poste: {
    type: String,
    required: [true, 'Le poste est obligatoire'],
    trim: true
  },
  dateDebut: {
    type: Date,
    required: [true, 'La date de début est obligatoire']
  },
  dateFin: {
    type: Date,
    default: null
  },
  reference: {
    type: String,
    default: '',
    trim: true
  },
  lieu: {
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

RHPosteSchema.index({ personnelId: 1, dateDebut: -1 });

module.exports = mongoose.model('RHPoste', RHPosteSchema);
