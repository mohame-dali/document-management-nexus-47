const mongoose = require('mongoose');

const personnelDocumentSchema = new mongoose.Schema({
  personnelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Personnel',
    required: [true, 'La référence du personnel (personnelId) est obligatoire']
  },
  documentType: {
    type: String,
    enum: {
      values: ['IncomingDocument', 'OutgoingDocument'],
      message: 'documentType doit être IncomingDocument ou OutgoingDocument'
    },
    required: [true, 'Le type de document (documentType) est obligatoire']
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "L'identifiant du document (documentId) est obligatoire"]
    // Référence polymorphe (pas de ref strict)
  },
  typeAssociation: {
    type: String,
    required: [true, "Le type d'association est obligatoire"],
    trim: true
  },
  commentaire: {
    type: String,
    default: '',
    trim: true
  },
  dateAssociation: {
    type: Date,
    default: Date.now
  },
  associePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "L'utilisateur associateur (associePar) est obligatoire"]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index composé unique pour empêcher les doublons d'association pour le même personnel et le même document
personnelDocumentSchema.index(
  { personnelId: 1, documentType: 1, documentId: 1 },
  { unique: true }
);

// Index simple sur documentId pour les recherches inverses rapides
personnelDocumentSchema.index({ documentId: 1 });
personnelDocumentSchema.index({ typeAssociation: 1 });

module.exports = mongoose.model('PersonnelDocument', personnelDocumentSchema);
