
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Test admin credentials - only for development
// @route   GET /api/auth/test-admin
// @access  Public
exports.testAdminCredentials = async (req, res, next) => {
  try {
    // Check if admin exists
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (!adminExists) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Admin user exists',
      username: 'admin'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset admin password (development only)
// @route   POST /api/auth/reset-admin
// @access  Public
exports.resetAdminPassword = async (req, res, next) => {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return next(new ErrorResponse('This route is not available in production', 403));
    }
    
    // Find admin user
    let admin = await User.findOne({ username: 'admin' });
    
    if (!admin) {
      // Create admin user if not found
      admin = new User({
        username: 'admin',
        password: 'admin123',
        role: 'Admin',
        isActive: true
      });
    } else {
      // Reset existing admin password
      admin.password = 'admin123';
    }
    
    await admin.save();
    
    console.log('Admin password reset to: admin123');
    
    res.status(200).json({
      success: true,
      message: 'Admin password reset successfully',
      username: 'admin',
      password: 'admin123'
    });
  } catch (err) {
    console.error('Error resetting admin password:', err);
    next(err);
  }
};
