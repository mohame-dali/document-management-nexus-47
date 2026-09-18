const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'اسم المجلد مطلوب'],
    trim: true,
    maxlength: [120, 'لا يمكن أن يتجاوز اسم المجلد 120 حرفاً']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  parent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Folder', 
    default: null 
  },
  department: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department', 
    required: [true, 'القسم الإداري مطلوب'] 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'المستخدم المنشئ مطلوب'] 
  },
  status: { 
    type: String, 
    enum: ['En cours', 'Fermé'], 
    default: 'En cours' 
  },
  color: {
    type: String,
    default: '#2c5282'
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'documentModel'
  }],
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
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate for subfolders
folderSchema.virtual('subfolders', {
  ref: 'Folder',
  localField: '_id',
  foreignField: 'parent'
});

// Virtual populate for incoming documents
folderSchema.virtual('incomingDocuments', {
  ref: 'IncomingDocument',
  localField: '_id',
  foreignField: 'folder'
});

// Virtual populate for outgoing documents
folderSchema.virtual('outgoingDocuments', {
  ref: 'OutgoingDocument',
  localField: '_id',
  foreignField: 'folder'
});

// Add indexes for efficient querying
folderSchema.index({ department: 1, parent: 1 });
folderSchema.index({ createdBy: 1 });
folderSchema.index({ status: 1 });

const Folder = mongoose.model('Folder', folderSchema);

module.exports = Folder;
