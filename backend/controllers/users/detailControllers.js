
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin/AdminDepartment
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('departments')
      .populate('activeDepartment')
      .populate('createdBy', 'username');
    
    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Check if AdminDepartment has access to this user
    if (req.user.role === 'AdminDepartment') {
      // Get the ids of the user's departments
      const userDeptIds = user.departments.map(dept => dept._id.toString());
      
      // Check if the AdminDepartment's active department is in the user's departments
      const hasAccess = userDeptIds.includes(req.user.activeDepartment._id.toString());
      
      if (!hasAccess) {
        return next(
          new ErrorResponse(`Not authorized to access this user`, 403)
        );
      }
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};
