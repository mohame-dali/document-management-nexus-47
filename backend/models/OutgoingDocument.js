
const mongoose = require('mongoose');

const outgoingDocumentSchema = new mongoose.Schema({
  serialNumber: { type: Number, required: true },
  year: { 
    type: Number, 
    required: true, 
    default: () => new Date().getFullYear() // Automatically set to the current year 
  },
  issueDate: { type: Date, required: true },
  typeDocument: { type: String, required: false },
  source: { 
    id: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    name: { type: String, required: true } 
  },
  assignedTo: [{ 
    type: String, // External department names (e.g., ["وزارة الداخلية", "بلدية تونس"])
    required: false 
  }],
  pourInfo: [{ 
    type: String, // Additional external metadata (e.g., ["الديوانة", "البنك المركزي"])
    required: false 
  }],
  subject: { type: String, required: true },
  ocrText: { // New field for storing OCR-extracted text
    type: String, 
    required: false, 
    default: null 
  },
  scannedDocument: { type: String, required: false, default: null },
  reference: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "IncomingDocument", 
    default: null 
  }, // perform by 'AdminDepartment' 
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Folder",
    default: null,
  }, // Classement du document
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
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
  },
  isIndexed: {
    type: Boolean,
    default: false,
    index: true
  },
  indexError: {
    type: String,
    default: null
  },
  lastIndexAttempt: {
    type: Date,
    default: null
  },
  indexAttempts: {
    type: Number,
    default: 0
  },
  createdAt: { type: Date, default: Date.now },
});

// Ensure unique combination of serialNumber and year
outgoingDocumentSchema.index({ serialNumber: 1, year: 1 }, { unique: true });
outgoingDocumentSchema.index({ "source.id": 1 });

// ═══════════════════════════════════════════════════════════════
// HOOKS RAG — Auto-indexation vectorielle (non-bloquant)
// ═══════════════════════════════════════════════════════════════

outgoingDocumentSchema.post('save', function (doc) {
  setImmediate(async () => {
    try {
      const { indexDocument } = require('../services/semanticIndexer');
      const result = await indexDocument(doc, 'outgoing');
      if (result && result.success) {
        await doc.constructor.updateOne(
          { _id: doc._id },
          { $set: { isIndexed: true, indexError: null, lastIndexAttempt: new Date() } }
        );
        console.log(`[RAG Auto-Index] ✅ Outgoing #${doc._id} indexé`);
      } else {
        const errorMsg = (result && (result.error || result.reason)) || 'Unknown indexing error';
        await doc.constructor.updateOne(
          { _id: doc._id },
          {
            $set: { isIndexed: false, indexError: String(errorMsg), lastIndexAttempt: new Date() },
            $inc: { indexAttempts: 1 }
          }
        );
        console.error(`[RAG Auto-Index] ⚠️ Outgoing #${doc._id} échec :`, errorMsg);
      }
    } catch (err) {
      try {
        await doc.constructor.updateOne(
          { _id: doc._id },
          {
            $set: { isIndexed: false, indexError: err.message, lastIndexAttempt: new Date() },
            $inc: { indexAttempts: 1 }
          }
        );
      } catch (innerErr) {
        // ignore
      }
      console.error(`[RAG Auto-Index] ⚠️ Outgoing #${doc._id} :`, err.message);
    }
  });
});

outgoingDocumentSchema.post('findOneAndUpdate', function (doc) {
  if (!doc) return;
  setImmediate(async () => {
    try {
      const { indexDocument } = require('../services/semanticIndexer');
      const result = await indexDocument(doc, 'outgoing');
      if (result && result.success) {
        await doc.constructor.updateOne(
          { _id: doc._id },
          { $set: { isIndexed: true, indexError: null, lastIndexAttempt: new Date() } }
        );
        console.log(`[RAG Auto-Index] ✅ Outgoing #${doc._id} réindexé`);
      } else {
        const errorMsg = (result && (result.error || result.reason)) || 'Unknown indexing error';
        await doc.constructor.updateOne(
          { _id: doc._id },
          {
            $set: { isIndexed: false, indexError: String(errorMsg), lastIndexAttempt: new Date() },
            $inc: { indexAttempts: 1 }
          }
        );
        console.error(`[RAG Auto-Index] ⚠️ Outgoing #${doc._id} réindexation échec :`, errorMsg);
      }
    } catch (err) {
      try {
        await doc.constructor.updateOne(
          { _id: doc._id },
          {
            $set: { isIndexed: false, indexError: err.message, lastIndexAttempt: new Date() },
            $inc: { indexAttempts: 1 }
          }
        );
      } catch (innerErr) {
        // ignore
      }
      console.error(`[RAG Auto-Index] ⚠️ Outgoing #${doc._id} :`, err.message);
    }
  });
});

outgoingDocumentSchema.post('findOneAndDelete', function (doc) {
  if (!doc) return;
  setImmediate(async () => {
    try {
      const { removeFromIndex } = require('../services/semanticIndexer');
      await removeFromIndex(doc._id, 'outgoing');
      console.log(`[RAG Auto-Index] 🗑️ Outgoing #${doc._id} retiré`);
    } catch (err) {
      console.error(`[RAG Auto-Index] ⚠️ Delete :`, err.message);
    }
  });
});

const OutgoingDocument = mongoose.model("OutgoingDocument", outgoingDocumentSchema);

module.exports = OutgoingDocument;

