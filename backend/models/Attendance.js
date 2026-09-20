const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  personnelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Personnel',
    required: true,
    index: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  statut: {
    type: String,
    enum: ['present', 'absent'],
    required: true,
    default: 'present'
  },
  motif: {
    type: String,
    enum: [
      'conge_annuel',
      'absence_injustifiee',
      'recuperation',
      'conge_exceptionnel',
      'conge_maladie',
      'conge_maternite',
      'conge_paternite',
      'formation',
      'mission',
      'service',
      'detachement_externe',
      'disponibilite',
      'greve',
      'sans_solde'
    ],
    default: null
  },
  leaveReasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveReason',
    default: null
  },
  impacteSolde: {
    type: Boolean,
    default: false
  },
  detailsMotif: {
    serviceNom: {
      type: String,
      trim: true,
      default: ''
    },
    missionLieu: {
      type: String,
      trim: true,
      default: ''
    },
    missionObjet: {
      type: String,
      trim: true,
      default: ''
    },
    formationIntitule: {
      type: String,
      trim: true,
      default: ''
    },
    formationOrganisme: {
      type: String,
      trim: true,
      default: ''
    },
    formationDuree: {
      type: String,
      trim: true,
      default: ''
    },
    formationDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PersonnelDocument',
      default: null
    },
    commentaire: {
      type: String,
      trim: true,
      default: ''
    }
  },
  heureArrivee: {
    type: String,
    default: null
  },
  saisiPar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  modifiePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Index unique composé : un enregistrement de présence par agent et par jour
attendanceSchema.index({ personnelId: 1, date: 1 }, { unique: true });

// Index de requêtage pour les rapports et filtrages par département et date
attendanceSchema.index({ departmentId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
