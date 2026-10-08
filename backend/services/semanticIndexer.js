const mongoose = require('mongoose');
const SemanticIndex = require('../models/SemanticIndex');
const { getEmbedding } = require('./ollamaService');

/**
 * Extrait le texte utile d'un document pour l'embedding
 */
function extractSearchableText(doc) {
  const parts = [];
  if (doc.subject) parts.push(doc.subject);
  if (doc.source) {
    const src = typeof doc.source === 'object' ? doc.source.name : doc.source;
    if (src) parts.push(src);
  }
  if (doc.correspondenceNumber) parts.push(doc.correspondenceNumber);
  if (doc.serialNumber) parts.push(doc.serialNumber);
  if (doc.description) parts.push(doc.description);
  if (doc.notes) parts.push(doc.notes);
  if (doc.ocrText) parts.push(doc.ocrText);
  return parts.filter(Boolean).join(' | ').trim();
}

/**
 * Extrait les department IDs d'un document selon son type
 */
function extractDepartmentIds(doc, type) {
  const ids = [];
  
  if (type === 'incoming') {
    // assignedTo est un array de { id, name }
    if (Array.isArray(doc.assignedTo)) {
      doc.assignedTo.forEach((item) => {
        const id = item?.id || item?._id || item;
        if (id && mongoose.Types.ObjectId.isValid(id)) {
          ids.push(id);
        }
      });
    }
    // Fallback : un seul champ departmentId
    if (ids.length === 0 && doc.departmentId) {
      ids.push(doc.departmentId);
    }
  } else if (type === 'outgoing') {
    // source.id est un ObjectId unique
    const srcId = doc.source?.id || doc.source?._id || doc.source;
    if (srcId && mongoose.Types.ObjectId.isValid(srcId)) {
      ids.push(srcId);
    }
    if (ids.length === 0 && doc.departmentId) {
      ids.push(doc.departmentId);
    }
  }
  
  return ids;
}

/**
 * Indexe UN document (create ou update)
 */
async function indexDocument(doc, type) {
  try {
    const text = extractSearchableText(doc);
    
    if (!text || text.length < 20) {
      return { skipped: true, reason: 'text_too_short' };
    }

    const embedding = await getEmbedding(text);

    let sourceVal = '';
    if (doc.source) {
      sourceVal = typeof doc.source === 'object' ? (doc.source.name || '') : String(doc.source);
    }

    const deptIds = extractDepartmentIds(doc, type);
    console.log(`[Index] Doc #${doc.serialNumber} → depts: ${deptIds.length > 0 ? deptIds.join(', ') : 'N/A'}`);

    await SemanticIndex.findOneAndUpdate(
      { documentType: type, documentId: doc._id },
      {
        documentType: type,
        documentId: doc._id,
        sourceText: text.substring(0, 4000),
        embedding,
        metadata: {
          subject: doc.subject || '',
          serialNumber: doc.serialNumber ? String(doc.serialNumber) : '',
          year: doc.year || (doc.createdAt ? new Date(doc.createdAt).getFullYear() : new Date().getFullYear()),
          source: sourceVal,
          status: doc.status || '',
          documentDate: doc.arrivalDate || doc.issueDate || doc.createdAt || new Date(),
          createdAt: doc.createdAt || new Date(),
          // 🆕 RBAC : département(s)
          ...(type === 'incoming' 
            ? { departmentIds: extractDepartmentIds(doc, 'incoming') }
            : { departmentId: extractDepartmentIds(doc, 'outgoing')[0] || null }
          ),
        },
        embeddingModel: 'nomic-embed-text',
        indexedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return { success: true, documentId: doc._id.toString() };
  } catch (error) {
    const errorDetails = error.ollamaError || error.original || error.message;
    console.error(
      `[Index] Erreur pour ${doc._id}:`,
      error.message,
      error.ollamaError ? `(Ollama: ${error.ollamaError})` : '',
      error.original ? `(${error.original})` : ''
    );
    return { success: false, error: errorDetails, code: error.code };
  }
}

/**
 * Supprime un document de l'index
 */
async function removeFromIndex(documentId, type) {
  try {
    await SemanticIndex.deleteOne({ 
      documentType: type, 
      documentId 
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  extractSearchableText,
  extractDepartmentIds,
  indexDocument,
  removeFromIndex,
};
