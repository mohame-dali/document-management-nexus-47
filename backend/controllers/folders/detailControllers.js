
const Folder = require('../../models/Folder');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get single folder
// @route   GET /api/folders/:id
// @access  Private
exports.getFolder = async (req, res, next) => {
  try {
    const folder = await Folder.findById(req.params.id)
      .populate('department')
      .populate('parent')
      .populate('createdBy', 'username');
    
    if (!folder) {
      return next(
        new ErrorResponse(`Folder not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Check if user has access to this folder
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin' && req.user.role !== 'AdminTuningDesk') {
      if (folder.department.toString() !== req.user.activeDepartment._id.toString()) {
        return next(
          new ErrorResponse(`Not authorized to access this folder`, 403)
        );
      }
    }
    
    res.status(200).json({
      success: true,
      data: folder
    });
  } catch (err) {
    next(err);
  }
};
