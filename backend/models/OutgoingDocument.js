
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
  createdAt: { type: Date, default: Date.now },
});

// Ensure unique combination of serialNumber and year
outgoingDocumentSchema.index({ serialNumber: 1, year: 1 }, { unique: true });
outgoingDocumentSchema.index({ "source.id": 1 });

const OutgoingDocument = mongoose.model("OutgoingDocument", outgoingDocumentSchema);

module.exports = OutgoingDocument;

