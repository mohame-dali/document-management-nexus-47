const mongoose = require('mongoose');

/**
 * Index vectoriel pour la recherche sémantique (RAG)
 * Stocke l'embedding de chaque document indexé
 */
const semanticIndexSchema = new mongoose.Schema({
  // ─── Référence vers le document source ───
  documentType: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true,
    index: true,
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  
  // ─── Contenu indexé ───
  sourceText: {
    type: String,
    required: true,
  },
  
  // ─── Vecteur d'embedding (768 dimensions pour nomic-embed-text) ───
  embedding: {
    type: [Number],
    required: true,
  },
  
  // ─── Métadonnées pour filtrage et affichage ───
  metadata: {
    subject: String,
    serialNumber: String,
    year: Number,
    source: String,
    status: String,
    documentDate: Date,
    createdAt: Date,
    // 🆕 RBAC — Isolation par département(s)
    // Pour les entrants : plusieurs départements possibles
    departmentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    }],
    // Pour les sortants : un seul département émetteur
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
  },
  
  // ─── Versioning ───
  embeddingModel: {
    type: String,
    default: 'nomic-embed-text',
  },
  indexedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// ─── Index unique : 1 seul vecteur par document ───
semanticIndexSchema.index(
  { documentType: 1, documentId: 1 }, 
  { unique: true, name: 'unique_doc_idx' }
);

// ─── Index pour filtrage par année ───
semanticIndexSchema.index({ 'metadata.year': 1 });

// Index composé pour accélérer les requêtes filtrées
semanticIndexSchema.index({ 
  'metadata.departmentIds': 1, 
  documentType: 1 
});

semanticIndexSchema.index({ 
  'metadata.departmentId': 1, 
  documentType: 1 
});

module.exports = mongoose.model('SemanticIndex', semanticIndexSchema);
