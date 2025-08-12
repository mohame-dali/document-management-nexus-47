
const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Department name is required'], 
    unique: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Remove the duplicate index declaration
// departmentSchema.index({ name: 1 });

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
