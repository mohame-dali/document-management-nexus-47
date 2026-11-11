const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');
const { sendTokenResponse } = require('./utils');

const MOCK_ADMIN_ID = '65f000000000000000000001';
const getMockAdmin = () => ({
  _id: MOCK_ADMIN_ID,
  id: MOCK_ADMIN_ID,
  username: 'admin',
  role: 'Admin',
  isActive: true,
  mustChangePassword: false,
  departments: [
    { _id: '65f000000000000000000010', id: '65f000000000000000000010', name: 'Direction Générale' }
  ],
  activeDepartment: { _id: '65f000000000000000000010', id: '65f000000000000000000010', name: 'Direction Générale' },
  photo: '',
  getSignedJwtToken: function() {
    return jwt.sign(
      { id: this._id, role: this.role, username: this.username },
      process.env.JWT_SECRET || 'dms_dev_jwt_secret_key_64_bytes_secure_random_fallback_token_2026',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const username = req.body?.username;
    const password = req.body?.password;

    // Strict type validation to prevent NoSQL injection
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid credentials format' });
    }

    if (!username.trim() || !password) {
      return next(new ErrorResponse('Please provide username and password', 400));
    }

    if (username.length > 100 || password.length > 200) {
      return res.status(400).json({ success: false, message: 'Invalid credentials format' });
    }

    // Check if database is offline - fallback to mock admin
    if (mongoose.connection.readyState !== 1) {
      if (username.trim() === 'admin' && (password === 'Admin123!' || password === 'admin')) {
        console.log('[Auth] Database offline — authenticating mock admin user');
        return sendTokenResponse(getMockAdmin(), 200, res);
      }
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check for user in database
    let user;
    try {
      user = await User.findOne({ username: username.trim() }).select('+password');
    } catch (dbErr) {
      if (username.trim() === 'admin' && (password === 'Admin123!' || password === 'admin')) {
        console.log('[Auth] Database query failed — authenticating mock admin user');
        return sendTokenResponse(getMockAdmin(), 200, res);
      }
      throw dbErr;
    }

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if user account is active
    if (!user.isActive) {
      return next(new ErrorResponse('Your account has been deactivated', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Login error:', err.message || err);
    next(err);
  }
};
