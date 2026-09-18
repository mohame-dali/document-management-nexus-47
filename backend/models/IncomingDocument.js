
const mongoose = require('mongoose');

const incomingDocumentSchema = new mongoose.Schema({
  serialNumber: { type: Number, required: true },
  year: { 
    type: Number, 
    required: true, 
    default: () => new Date().getFullYear() // Automatically set to the current year 
  },
  arrivalDate: { type: Date, required: true },
  correspondenceNumber: { type: String, required: true },
  correspondenceDate: { type: Date, required: true },
  typeDocument: { type: String, required: false },
  activity: { 
    type: String, 
    required: false, 
    default: null 
  },
  dateActivity: {
    type: Date,
    required: false,
    default: null
  },
  source: { type: String, required: false },
  subject: { type: String, required: true },
  scannedDocument: { type: String, required: false, default: null },
  ocrText: { // New field for storing OCR-extracted text
    type: String, 
    required: false, 
    default: null 
  },
  assignedTo: [{
    id: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    name: { type: String }
  }], 
  answer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "OutgoingDocument", 
    default: null 
  }, // perform by AdminDepartment 
  responsibleUser: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    default: null, 
    required: false
  }, // perform by 'AdminDepartment
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
incomingDocumentSchema.index({ serialNumber: 1, year: 1 }, { unique: true });
incomingDocumentSchema.index({ "assignedTo.id": 1 });
incomingDocumentSchema.index({ dateActivity: 1 });

const IncomingDocument = mongoose.model("IncomingDocument", incomingDocumentSchema);

module.exports = IncomingDocument;
