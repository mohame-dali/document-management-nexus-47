
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');
const fs = require('fs');
const path = require('path');

// @desc    Upload user photo
// @route   PUT /api/users/:id/photo
// @access  Private/Admin/AdminDepartment
exports.uploadPhoto = async (req, res, next) => {
  try {
    let user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    
    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Check authorization
    if (req.user.role === 'AdminDepartment') {
      // Verify the user belongs to the AdminDepartment's active department
      const userDeptIds = user.departments.map(dept => dept.toString());
      const hasAccess = userDeptIds.includes(req.user.activeDepartment._id.toString());
      
      if (!hasAccess) {
        return next(
          new ErrorResponse(`Not authorized to update this user's photo`, 403)
        );
      }
    } else if (req.user.role === 'AdminTuningDesk') {
      // AdminTuningDesk can only update their own photo
      if (req.user.id !== req.params.id) {
        return next(
          new ErrorResponse(`Not authorized to update this user's photo`, 403)
        );
      }
    } else if (req.user.role === 'User') {
      // Users can only update their own photo
      if (req.user.id !== req.params.id) {
        return next(
          new ErrorResponse(`Not authorized to update this user's photo`, 403)
        );
      }
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return next(new ErrorResponse('Please upload a file', 400));
    }
    
    // Delete old photo if exists
    if (user.photo) {
      const oldPhotoPath = path.join(__dirname, '../..', user.photo);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }
    
    // Update user with new photo path
    user = await User.findByIdAndUpdate(
      req.params.id,
      { photo: `/uploads/usersphoto/${req.file.filename}` },
      { new: true }
    ).populate('departments')
     .populate('activeDepartment')
     .populate('createdBy', 'username');
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};
