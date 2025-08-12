
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    // Get user including populated departments and activeDepartment
    const user = await User.findById(req.user.id)
      .populate('departments')
      .populate('activeDepartment');

    console.log('getMe - User found:', user.username);
    console.log('getMe - User departments:', user.departments?.map(d => ({ id: d._id, name: d.name })));
    console.log('getMe - User active department:', user.activeDepartment ? { id: user.activeDepartment._id, name: user.activeDepartment.name } : 'None');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error in getMe:', err);
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
