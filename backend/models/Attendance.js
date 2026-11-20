const mongoose = require('mongoose');

const SYSTEM_MOTIFS = [
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
];

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
  // Validation dynamique : accepte les 14 motifs système ainsi que les motifs personnalisés créés dans LeaveReason
  motif: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
    validate: {
      validator: async function (value) {
        if (value === null || value === undefined || value === '') {
          return true;
        }
        const normalized = String(value).trim().toLowerCase();
        if (SYSTEM_MOTIFS.includes(normalized)) {
          return true;
        }
        const LeaveReason = mongoose.models.LeaveReason || mongoose.model('LeaveReason');
        const exists = await LeaveReason.exists({ code: normalized });
        return Boolean(exists);
      },
      message: "Motif d'absence invalide ou inexistant dans les motifs de congé"
    }
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
  // Clés canoniques alignées avec attendanceService.ts / AttendancePage.tsx (correspondance legacy nomService/lieuMission/... gérée par le contrôleur)
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
