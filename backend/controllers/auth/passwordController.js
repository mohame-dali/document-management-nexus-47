
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');
const { sendTokenResponse } = require('./utils');

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    // Require currentPassword explicitly
    if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
      return next(new ErrorResponse('Current password is required', 400));
    }

    // Validate new password
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return next(new ErrorResponse('Password must be at least 8 characters', 400));
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    // Always verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return next(new ErrorResponse('Current password is incorrect', 401));
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Admin/Department Admin update user password
// @route   PUT /api/users/:id/password
// @access  Private/Admin/AdminDepartment
exports.updateUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body || {};
    
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return next(new ErrorResponse('Password must be at least 8 characters', 400));
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    // Authorization check
    if (req.user.role === 'AdminDepartment') {
      const activeDeptId = req.user.activeDepartment
        ? (req.user.activeDepartment._id || req.user.activeDepartment).toString()
        : null;
      if (!activeDeptId) {
        return next(new ErrorResponse('No active department selected', 403));
      }

      const userDeptIds = (user.departments || []).map(dept =>
        (dept && dept._id ? dept._id : dept).toString()
      );
      const hasAccess = userDeptIds.includes(activeDeptId);
      
      if (!hasAccess) {
        return next(new ErrorResponse('Not authorized to update this user password', 403));
      }
    } else if (req.user.role !== 'Admin') {
      return next(new ErrorResponse('Not authorized to update user passwords', 403));
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (err) {
    next(err);
  }
};
