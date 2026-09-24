const mongoose = require('mongoose');

const personnelSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom est obligatoire'],
    trim: true
  },
  dateNaissance: {
    type: Date,
    default: null
  },
  lieuNaissance: {
    type: String,
    trim: true,
    default: ''
  },
  sexe: {
    type: String,
    enum: ['Homme', 'Femme'],
    default: undefined
  },
  cin: {
    type: String,
    trim: true,
    default: ''
  },
  adresse: {
    type: String,
    trim: true,
    default: ''
  },
  telephone: {
    type: String,
    trim: true,
    default: ''
  },
  emailPersonnel: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  poste: {
    type: String,
    trim: true,
    default: ''
  },
  activeDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  dateEmbauche: {
    type: Date,
    default: null
  },
  statut: {
    type: String,
    enum: ['en_attente', 'actif', 'inactif'],
    default: 'en_attente'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  photo: {
    type: String,
    default: ''
  },
  // Groupe A — Identité étendue
  nomPere: { type: String, default: '', trim: true },
  nomMere: { type: String, default: '', trim: true },
  nomGrandPere: { type: String, default: '', trim: true },
  groupeSanguin: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
    default: ''
  },

  // Groupe B — Situation administrative
  dateEmissionCin: { type: Date, default: null },
  numeroUnite: { type: String, default: '', trim: true },
  numeroArmee: { type: String, default: '', trim: true },
  dateEngagement: { type: Date, default: null },
  typeEngagement: { type: String, default: '', trim: true },
  origineEngagement: { type: String, default: '', trim: true },
  niveauEtude: { type: String, default: '', trim: true },
  diplomeBase: { type: String, default: '', trim: true },
  specialite: { type: String, default: '', trim: true },
  arme: { type: String, default: '', trim: true },
  posteActuel: { type: String, default: '', trim: true },

  // Groupe C — Situation familiale
  etatCivil: {
    type: String,
    enum: ['celibataire', 'marie', 'divorce', 'veuf', ''],
    default: ''
  },
  nomConjoint: { type: String, default: '', trim: true },
  dateMariage: { type: Date, default: null },
  nombreEnfants: { type: Number, default: 0, min: 0 },
  enfants: { type: Number, default: 0, min: 0 },

  // Groupe D — Passeport
  numeroPasseport: { type: String, default: '', trim: true },
  dateValiditePasseport: { type: Date, default: null },

  // Groupe E — 3 personnes à prévenir
  personnesAPrevenir: [
    {
      nom: { type: String, default: '', trim: true },
      lien: { type: String, default: '', trim: true },
      telephone: { type: String, default: '', trim: true },
      adresse: { type: String, default: '', trim: true }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
});

// Index de recherche textuelle rapide sur nom, prenom, cin
personnelSchema.index({ nom: 1, prenom: 1 });
personnelSchema.index({ cin: 1 });
personnelSchema.index({ statut: 1 });
personnelSchema.index({ activeDepartment: 1 });
personnelSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Personnel', personnelSchema);
