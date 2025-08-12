
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'Username is required'], 
    unique: true,
    trim: true 
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['SuperAdmin', 'Admin', 'AdminDepartment', 'AdminTuningDesk', 'User'],
    required: [true, 'Role is required']
  },
  departments: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }
  ],
  activeDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  photo: { 
    type: String, 
    default: '' 
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

// Check role-specific constraints before save
userSchema.pre('save', function(next) {
  // Check if AdminTuningDesk or SuperAdmin has departments assigned
  if ((this.role === 'AdminTuningDesk' || this.role === 'SuperAdmin') && this.departments.length > 0) {
    throw new Error(`${this.role} cannot belong to any department`);
  }
  next();
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  // Only run this if password was modified
  if (!this.isModified('password')) {
    return next();
  }

  // Generate salt
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Set activeDepartment to the first department if not set and departments exist
userSchema.pre('save', function(next) {
  if (!this.activeDepartment && this.departments.length > 0) {
    this.activeDepartment = this.departments[0];
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
