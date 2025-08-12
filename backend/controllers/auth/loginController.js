
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');
const { sendTokenResponse } = require('./utils');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    console.log('Login request received with body:', JSON.stringify(req.body));
    
    const { username, password } = req.body;

    // Validate email & password
    if (!username || !password) {
      console.log('Missing username or password');
      return next(new ErrorResponse('Please provide username and password', 400));
    }

    console.log(`Login attempt for username: ${username}`);

    // Check for user
    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      console.log(`User not found: ${username}`);
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    console.log(`User found: ${username}, Active status: ${user.isActive}`);

    // Check if user account is active
    if (!user.isActive) {
      console.log(`User ${username} account is deactivated`);
      return next(new ErrorResponse('Your account has been deactivated', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    console.log(`Password match for ${username}: ${isMatch}`);

    if (!isMatch) {
      console.log(`Invalid password for ${username}`);
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    console.log(`Login successful for user: ${username}`);
    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Login error:', err);
    next(err);
  }
};
