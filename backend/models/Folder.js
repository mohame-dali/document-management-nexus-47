
const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Folder name is required'] 
  },
  parent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Folder', 
    default: null 
  },
  department: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department', 
    required: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['En cours', 'Fermé'], 
    default: 'En cours' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Add compound index for department and parent for faster queries
folderSchema.index({ department: 1, parent: 1 });

const Folder = mongoose.model('Folder', folderSchema);

module.exports = Folder;
