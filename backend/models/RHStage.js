const mongoose = require('mongoose');

const RHStageSchema = new mongoose.Schema({
  personnelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Personnel',
    required: true,
    index: true
  },

  // Optionnel : session planifiée (Cas A)
  sessionFormationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RHSessionFormation', // Modèle créé ultérieurement
    default: null
  },

  // Optionnel : document source (Cas A)
  sourceDocumentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IncomingDocument',
    default: null
  },

  // Classification du stage
  localisation: {
    type: String,
    enum: ['tunisie', 'etranger'],
    required: true,
    default: 'tunisie'
  },

  pays: {
    type: String,
    default: 'تونس',
    trim: true
  },

  lieuStage: {
    type: String,
    required: true,
    trim: true
  },

  sujetStage: {
    type: String,
    required: true,
    trim: true
  },

  // Optionnel : type de formation (référentiel)
  typeFormationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RHTypeFormation',
    default: null
  },

  // Optionnel : école (référentiel)
  ecoleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RHEcole',
    default: null
  },

  // Dates
  dateDebut: {
    type: Date,
    required: true
  },

  dateFin: {
    type: Date,
    required: true
  },

  // Numéros officiels
  numeroRoute: {
    type: String,
    default: '',
    trim: true
  },

  numeroStage: {
    type: String,
    default: '',
    trim: true
  },

  // Résultat
  statut: {
    type: String,
    enum: ['inscrit', 'en_cours', 'acheve', 'suspendu', 'abandonne'],
    default: 'acheve' // Pour les stages historiques, c'est achevé
  },

  resultat: {
    type: String,
    enum: ['admis', 'refuse', 'en_attente', ''],
    default: ''
  },

  mention: {
    type: String,
    default: '',
    trim: true
  },

  // Documents joints au stage (attestations, certificats)
  documents: [{
    nom: { type: String, default: '' },
    type: {
      type: String,
      enum: ['convocation', 'attestation', 'certificat', 'rapport', 'autre'],
      default: 'autre'
    },
    chemin: { type: String, default: '' },
    dateAjout: { type: Date, default: Date.now }
  }],

  // Notes
  observations: {
    type: String,
    default: ''
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },

  // Traçabilité
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index
RHStageSchema.index({ personnelId: 1, dateDebut: -1 });
RHStageSchema.index({ personnelId: 1, localisation: 1 });
RHStageSchema.index({ sessionFormationId: 1 });
RHStageSchema.index({ sourceDocumentId: 1 });
RHStageSchema.index({ statut: 1 });
RHStageSchema.index({ pays: 1 });
RHStageSchema.index({ isDeleted: 1 });

// Méthode virtuelle pour calculer la durée en jours
RHStageSchema.virtual('duree').get(function() {
  if (!this.dateDebut || !this.dateFin) return 0;
  const diff = new Date(this.dateFin) - new Date(this.dateDebut);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('RHStage', RHStageSchema);
