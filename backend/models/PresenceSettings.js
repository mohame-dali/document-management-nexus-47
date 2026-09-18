const mongoose = require('mongoose');

const presenceSettingsSchema = new mongoose.Schema({
  annee: {
    type: Number,
    required: true,
    unique: true,
    default: () => new Date().getFullYear()
  },
  soldeAnnuelDefaut: {
    type: Number,
    default: 45
  },
  motifsDeductibles: {
    type: [String],
    default: [
      'conge_annuel',
      'absence_injustifiee',
      'recuperation',
      'conge_exceptionnel'
    ]
  },
  joursWeekend: {
    type: [Number], // 0: Dimanche, 6: Samedi
    default: [0, 6]
  },
  joursFeries: [{
    date: {
      type: Date,
      required: true
    },
    libelle: {
      type: String,
      required: true,
      trim: true
    }
  }],
  autoriserSaisieFuture: {
    type: Boolean,
    default: true
  },
  autoriserSaisieRetroactive: {
    type: Boolean,
    default: true
  },
  derniereReinitialisation: {
    type: Date,
    default: Date.now
  },
  modifiePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PresenceSettings', presenceSettingsSchema);
