/**
 * Script d'indexation vectorielle des documents (RAG Phase 1)
 *
 * Indexe tous les courriers entrants et sortants dans la collection SemanticIndex.
 * Convertit le texte (objet, source, type, numéro, OCR) en embeddings via Ollama.
 *
 * UTILISATION (manuelle) :
 *   cd backend
 *   node scripts/indexDocuments.js
 *
 * OPTIONS :
 *   --force   Ré-indexer même les documents déjà indexés
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const SemanticIndex = require('../models/SemanticIndex');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const { getEmbedding } = require('../services/ollamaService');

/**
 * Construit le texte représentatif d'un document pour l'embedding
 * @param {object} doc - Document incoming ou outgoing
 * @param {'incoming' | 'outgoing'} type - Type de document
 * @returns {string} - Texte consolidé
 */
function buildDocumentText(doc, type) {
  const parts = [];

  if (doc.subject && doc.subject.trim()) {
    parts.push(`Objet: ${doc.subject.trim()}`);
  }

  if (type === 'incoming') {
    if (doc.source && typeof doc.source === 'string') {
      parts.push(`Source / Expéditeur: ${doc.source.trim()}`);
    }
    if (doc.correspondenceNumber) {
      parts.push(`N° Correspondance: ${doc.correspondenceNumber}`);
    }
    if (doc.activity) {
      parts.push(`Activité: ${doc.activity}`);
    }
  } else {
    const srcName = doc.source?.name || (typeof doc.source === 'string' ? doc.source : null);
    if (srcName) {
      parts.push(`Source / Direction: ${srcName.trim()}`);
    }
    if (Array.isArray(doc.assignedTo) && doc.assignedTo.length > 0) {
      parts.push(`Destinataires: ${doc.assignedTo.join(', ')}`);
    }
  }

  if (doc.typeDocument) {
    parts.push(`Type de document: ${doc.typeDocument}`);
  }

  if (doc.serialNumber && doc.year) {
    parts.push(`N° d'enregistrement: ${doc.serialNumber}/${doc.year}`);
  }

  if (doc.ocrText && doc.ocrText.trim()) {
    parts.push(`Contenu du document:\n${doc.ocrText.trim()}`);
  }

  return parts.join('\n');
}

/**
 * Indexe un document individuel
 * @param {object} doc - Document source
 * @param {'incoming' | 'outgoing'} documentType - Type
 * @param {boolean} force - Forcer la ré-indexation
 */
async function indexSingleDocument(doc, documentType, force = false) {
  if (!doc || !doc._id) {
    return { success: false, reason: 'INVALID_DOC' };
  }

  // Vérifier si déjà indexé
  if (!force) {
    const existing = await SemanticIndex.findOne({ documentType, documentId: doc._id });
    if (existing) {
      return { success: true, skipped: true };
    }
  }

  const text = buildDocumentText(doc, documentType);
  if (!text || text.trim().length === 0) {
    return { success: false, reason: 'EMPTY_TEXT' };
  }

  const embedding = await getEmbedding(text);

  let sourceVal = null;
  let docDate = null;

  if (documentType === 'incoming') {
    sourceVal = doc.source || null;
    docDate = doc.correspondenceDate || doc.arrivalDate || null;
  } else {
    sourceVal = doc.source?.name || (typeof doc.source === 'string' ? doc.source : null);
    docDate = doc.issueDate || null;
  }

  await SemanticIndex.findOneAndUpdate(
    { documentType, documentId: doc._id },
    {
      documentType,
      documentId: doc._id,
      sourceText: text.substring(0, 4000),
      embedding,
      metadata: {
        subject: doc.subject || null,
        serialNumber: doc.serialNumber ? String(doc.serialNumber) : null,
        year: doc.year || (docDate ? new Date(docDate).getFullYear() : null),
        source: sourceVal,
        status: doc.status || null,
        documentDate: docDate,
        createdAt: doc.createdAt || new Date(),
      },
      embeddingModel: 'nomic-embed-text',
      indexedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  // Mettre à jour le statut isIndexed sur le document source
  const Model = documentType === 'incoming' ? IncomingDocument : OutgoingDocument;
  await Model.updateOne(
    { _id: doc._id },
    { $set: { isIndexed: true, indexError: null, lastIndexAttempt: new Date() } }
  );

  return { success: true, skipped: false };
}

/**
 * Indexe tous les documents (entrants et sortants)
 * @param {object} options - Options ({ force, verbose })
 */
async function indexAllDocuments(options = {}) {
  const force = Boolean(options.force);
  const startTime = Date.now();

  console.log('\n======================================================');
  console.log('🚀 DÉMARRAGE DE L\'INDEXATION VECTORIELLE (RAG PHASE 1)');
  console.log(`   • Mode: ${force ? 'Ré-indexation forcée (--force)' : 'Incrémental (nouveaux uniquement)'}`);
  console.log('======================================================\n');

  const stats = {
    incoming: { total: 0, indexed: 0, skipped: 0, failed: 0 },
    outgoing: { total: 0, indexed: 0, skipped: 0, failed: 0 },
  };

  // ─── 1. Traitement des courriers entrants ───
  console.log('📥 Récupération des courriers entrants...');
  const incomingDocs = await IncomingDocument.find({ isDeleted: { $ne: true } }).lean();
  stats.incoming.total = incomingDocs.length;
  console.log(`   → ${incomingDocs.length} courriers entrants trouvés.`);

  for (let i = 0; i < incomingDocs.length; i++) {
    const doc = incomingDocs[i];
    try {
      const res = await indexSingleDocument(doc, 'incoming', force);
      if (res.skipped) {
        stats.incoming.skipped++;
      } else if (res.success) {
        stats.incoming.indexed++;
        console.log(`   [Incoming ${i + 1}/${incomingDocs.length}] Indexé: #${doc.serialNumber}/${doc.year} - ${doc.subject?.slice(0, 40)}`);
      } else {
        stats.incoming.failed++;
        console.warn(`   [Incoming ${i + 1}/${incomingDocs.length}] Ignoré (${res.reason}): #${doc.serialNumber}`);
      }
    } catch (err) {
      stats.incoming.failed++;
      console.error(
        `   ❌ [Incoming ${i + 1}/${incomingDocs.length}] Erreur doc #${doc.serialNumber}: ${err.message}`,
        err.ollamaError ? `(Ollama: ${err.ollamaError})` : '',
        err.original ? `(${err.original})` : ''
      );
    }
  }

  // ─── 2. Traitement des courriers sortants ───
  console.log('\n📤 Récupération des courriers sortants...');
  const outgoingDocs = await OutgoingDocument.find({ isDeleted: { $ne: true } }).lean();
  stats.outgoing.total = outgoingDocs.length;
  console.log(`   → ${outgoingDocs.length} courriers sortants trouvés.`);

  for (let i = 0; i < outgoingDocs.length; i++) {
    const doc = outgoingDocs[i];
    try {
      const res = await indexSingleDocument(doc, 'outgoing', force);
      if (res.skipped) {
        stats.outgoing.skipped++;
      } else if (res.success) {
        stats.outgoing.indexed++;
        console.log(`   [Outgoing ${i + 1}/${outgoingDocs.length}] Indexé: #${doc.serialNumber}/${doc.year} - ${doc.subject?.slice(0, 40)}`);
      } else {
        stats.outgoing.failed++;
        console.warn(`   [Outgoing ${i + 1}/${outgoingDocs.length}] Ignoré (${res.reason}): #${doc.serialNumber}`);
      }
    } catch (err) {
      stats.outgoing.failed++;
      console.error(
        `   ❌ [Outgoing ${i + 1}/${outgoingDocs.length}] Erreur doc #${doc.serialNumber}: ${err.message}`,
        err.ollamaError ? `(Ollama: ${err.ollamaError})` : '',
        err.original ? `(${err.original})` : ''
      );
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalIndexed = stats.incoming.indexed + stats.outgoing.indexed;
  const totalSkipped = stats.incoming.skipped + stats.outgoing.skipped;
  const totalFailed = stats.incoming.failed + stats.outgoing.failed;

  console.log('\n======================================================');
  console.log('📊 RAPPORT D\'INDEXATION VECTORIELLE (RAG PHASE 1) :');
  console.log(`   • Courriers entrants : ${stats.incoming.indexed} indexés, ${stats.incoming.skipped} ignorés, ${stats.incoming.failed} erreurs (total: ${stats.incoming.total})`);
  console.log(`   • Courriers sortants : ${stats.outgoing.indexed} indexés, ${stats.outgoing.skipped} ignorés, ${stats.outgoing.failed} erreurs (total: ${stats.outgoing.total})`);
  console.log(`   • Total indexés      : ${totalIndexed}`);
  console.log(`   • Total inchangés    : ${totalSkipped}`);
  console.log(`   • Total erreurs      : ${totalFailed}`);
  console.log(`   • Durée d'exécution  : ${duration}s`);
  console.log('======================================================\n');

  return { stats, duration, totalIndexed, totalSkipped, totalFailed };
}

// ─── Exécution directe via CLI ───
if (require.main === module) {
  (async () => {
    const force = process.argv.includes('--force');
    const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-management';

    try {
      console.log(`Connexion à MongoDB (${dbUri})...`);
      await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 5000 });
      console.log('✅ Connecté à MongoDB.');

      await indexAllDocuments({ force });

      await mongoose.connection.close();
      console.log('✅ Connexion MongoDB fermée proprement.');
      process.exit(0);
    } catch (error) {
      console.error('❌ Erreur fatale lors de l\'indexation :', error.message);
      try {
        await mongoose.connection.close();
      } catch (_) {}
      process.exit(1);
    }
  })();
}

module.exports = {
  buildDocumentText,
  indexSingleDocument,
  indexAllDocuments,
};
