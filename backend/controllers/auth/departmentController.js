
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Switch active department
// @route   PUT /api/auth/switchdepartment/:departmentId
// @access  Private
exports.switchDepartment = async (req, res, next) => {
  try {
    const { departmentId } = req.params;

    // Check if user has this department
    const hasDepartment = req.user.departments.some(
      dept => dept._id.toString() === departmentId
    );

    if (!hasDepartment) {
      return next(
        new ErrorResponse(`User does not have access to this department`, 403)
      );
    }

    // Update the user's active department
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { activeDepartment: departmentId },
      { new: true }
    ).populate('departments activeDepartment');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};
