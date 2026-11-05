const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');
const { sendTokenResponse } = require('./utils');

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

    // Check for user
    const user = await User.findOne({ username: username.trim() }).select('+password');

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
