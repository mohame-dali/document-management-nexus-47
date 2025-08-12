
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');
const bcrypt = require('bcryptjs');

// @desc    Deactivate user (soft delete)
// @route   PUT /api/users/:id/deactivate
// @access  Private/Admin/AdminDepartment
exports.deactivateUser = async (req, res, next) => {
  try {
    // Validate that id is provided and is a valid ObjectId format
    if (!req.params.id || req.params.id === 'undefined') {
      return next(
        new ErrorResponse('User ID is required and must be valid', 400)
      );
    }
    
    let user = await User.findById(req.params.id).populate('departments');
    
    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Enhanced authorization for SuperAdmin, Admin and AdminDepartment
    if (req.user.role === 'SuperAdmin' || req.user.role === 'Admin') {
      console.log(`${req.user.role} user - can deactivate any user`);
      // SuperAdmin and Admin can deactivate any user
    } else if (req.user.role === 'AdminDepartment') {
      // Verify the user belongs to the AdminDepartment's active department
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected', 400));
      }
      
      const userDeptIds = user.departments.map(dept => dept._id.toString());
      const hasAccess = userDeptIds.includes(req.user.activeDepartment._id.toString());
      
      if (!hasAccess) {
        return next(
          new ErrorResponse(`Not authorized to deactivate this user`, 403)
        );
      }
    } else {
      return next(
        new ErrorResponse('Not authorized to deactivate users', 403)
      );
    }
    
    // Prevent deactivating the last Admin user
    if (user.role === 'Admin') {
      const activeAdminCount = await User.countDocuments({ 
        role: 'Admin', 
        isActive: true 
      });
      
      if (activeAdminCount <= 1) {
        return next(
          new ErrorResponse('Cannot deactivate the last active Admin user', 400)
        );
      }
    }
    
    // Update user activation status based on request
    const newStatus = req.body.isActive !== undefined ? req.body.isActive : false;
    
    user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: newStatus },
      { new: true }
    ).populate('departments')
     .populate('activeDepartment')
     .populate('createdBy', 'username');
    
    console.log(`User ${newStatus ? 'activated' : 'deactivated'} successfully: ${user.username}`);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Deactivate user error:', err);
    next(err);
  }
};

// @desc    Reset user password
// @route   PUT /api/users/:id/resetpassword
// @access  Private/Admin/AdminDepartment
exports.resetPassword = async (req, res, next) => {
  try {
    // Validate that id is provided and is a valid ObjectId format
    if (!req.params.id || req.params.id === 'undefined') {
      return next(
        new ErrorResponse('User ID is required and must be valid', 400)
      );
    }
    
    const user = await User.findById(req.params.id).populate('departments');
    
    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Enhanced authorization for SuperAdmin, Admin and AdminDepartment
    if (req.user.role === 'SuperAdmin' || req.user.role === 'Admin') {
      console.log(`${req.user.role} user - can reset password for any user`);
      // SuperAdmin and Admin can reset password for any user
    } else if (req.user.role === 'AdminDepartment') {
      // Verify the user belongs to the AdminDepartment's active department
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected', 400));
      }
      
      const userDeptIds = user.departments.map(dept => dept._id.toString());
      const hasAccess = userDeptIds.includes(req.user.activeDepartment._id.toString());
      
      if (!hasAccess) {
        return next(
          new ErrorResponse(`Not authorized to reset password for this user`, 403)
        );
      }
    } else {
      return next(
        new ErrorResponse('Not authorized to reset passwords', 403)
      );
    }
    
    // Set new password (default or from request)
    const newPassword = req.body.newPassword || 'password123';
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user with new password
    await User.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword },
      { new: true }
    );
    
    console.log(`Password reset successfully for user: ${user.username}`);
    
    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      newPassword: newPassword // Include the new password in response for admin reference
    });
  } catch (err) {
    console.error('Reset password error:', err);
    next(err);
  }
};
