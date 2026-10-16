
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

    console.log(`[Auth] Tentative de connexion reçue pour: ${typeof username === 'string' ? username.slice(0, 50) : '[format invalide]'}`);

    // Strict type validation to prevent NoSQL injection
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid credentials format' });
    }

    if (!username.trim() || !password) {
      console.log('Missing username or password');
      return next(new ErrorResponse('Please provide username and password', 400));
    }

    if (username.length > 100 || password.length > 200) {
      return res.status(400).json({ success: false, message: 'Invalid credentials format' });
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

    if (!isMatch) {
      console.log(`[Auth] Identifiants incorrects pour: ${username}`);
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    console.log(`Login successful for user: ${username}`);
    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Login error:', err);
    next(err);
  }
};
