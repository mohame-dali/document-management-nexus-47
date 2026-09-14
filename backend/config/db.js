
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Admin default credentials
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123', // This will be hashed
  role: 'Admin',
  isActive: true
};

// Default MongoDB URI if not provided in environment variables
const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/document-management';

// Function to create default admin if none exists
const createDefaultAdmin = async () => {
  try {
    // Check if there's any admin user already
    const adminExists = await User.findOne({ role: 'Admin' });
    
    if (!adminExists) {
      console.log('No admin user found. Creating default admin account...');
      
      // Create new admin user
      await User.create({
        username: DEFAULT_ADMIN.username,
        password: DEFAULT_ADMIN.password, // This will be hashed by the pre-save hook in User model
        role: DEFAULT_ADMIN.role,
        isActive: DEFAULT_ADMIN.isActive
      });
      
      console.log('Default admin user created successfully.');
      console.log('Username:', DEFAULT_ADMIN.username);
      console.log('Password:', DEFAULT_ADMIN.password);
      console.log('Please change these credentials after first login!');
    }
  } catch (error) {
    console.error('Error creating default admin:', error.message);
  }
};

const connectDB = async () => {
  try {
    // Use the provided MONGODB_URI from environment variables or fall back to the default
    const dbUri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
    
    if (!dbUri) {
      throw new Error('MongoDB URI is not defined. Please set MONGODB_URI in your environment variables.');
    }
    
    console.log('Connecting to MongoDB...');
    // Removed deprecated options
    const conn = await mongoose.connect(dbUri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create default admin account if needed
    await createDefaultAdmin();
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
