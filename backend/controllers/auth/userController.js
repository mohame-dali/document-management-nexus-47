
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findById(req.user.id || req.user._id)
          .populate('departments')
          .populate('activeDepartment');
      } catch (e) {
        console.warn('getMe - Database lookup notice:', e.message);
      }
    }

    if (!user) {
      user = req.user;
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error in getMe:', err);
    if (req.user) {
      return res.status(200).json({
        success: true,
        data: req.user
      });
    }
    next(err);
  }
};

// @desc    Log user out / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};
