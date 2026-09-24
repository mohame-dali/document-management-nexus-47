const mongoose = require('mongoose');

const AttendanceDeclarationSchema = new mongoose.Schema({
  personnelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Personnel',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  statut: {
    type: String,
    enum: ['present', 'absent'],
    required: true
  },
  motif: {
    type: String,
    default: ''
  },
  leaveReasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveReason',
    default: null
  },
  detailsMotif: {
    nomService: { type: String, default: '' },
    lieuMission: { type: String, default: '' },
    objetMission: { type: String, default: '' },
    intituleFormation: { type: String, default: '' },
    commentaire: { type: String, default: '' }
  },
  heureArrivee: {
    type: String,
    default: ''
  },
  validationStatus: {
    type: String,
    enum: ['en_attente', 'approuvee', 'rejetee', 'modifiee'],
    default: 'en_attente',
    index: true
  },
  validatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  validatedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  adminComment: {
    type: String,
    default: ''
  },
  attendanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    default: null
  }
}, {
  timestamps: true
});

// Indexation optimisée pour les requêtes fréquentes
AttendanceDeclarationSchema.index({ personnelId: 1, date: -1 });
AttendanceDeclarationSchema.index({ validationStatus: 1, date: -1 });
AttendanceDeclarationSchema.index({ departmentId: 1, validationStatus: 1 });

// Unicité : une seule déclaration "en_attente" par agent pour une date donnée
AttendanceDeclarationSchema.index(
  { personnelId: 1, date: 1 },
  { unique: true, partialFilterExpression: { validationStatus: 'en_attente' } }
);

module.exports = mongoose.model('AttendanceDeclaration', AttendanceDeclarationSchema);
