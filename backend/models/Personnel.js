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
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
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

module.exports = mongoose.model('Personnel', personnelSchema);
