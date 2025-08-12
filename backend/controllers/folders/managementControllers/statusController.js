
const Folder = require('../../../models/Folder');
const ErrorResponse = require('../../../utils/errorResponse');

// @desc    Update folder status
// @route   PUT /api/folders/:id/status
// @access  Private/AdminDepartment
exports.updateFolderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status || !['En cours', 'Fermé'].includes(status)) {
      return next(
        new ErrorResponse('Please provide a valid status (En cours, Fermé)', 400)
      );
    }
    
    let folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return next(
        new ErrorResponse(`Folder not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Check if folder belongs to the active department
    if (folder.department.toString() !== req.user.activeDepartment._id.toString()) {
      return next(
        new ErrorResponse(`Not authorized to update this folder`, 403)
      );
    }
    
    // Update folder status
    folder = await Folder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('department')
      .populate('parent')
      .populate('createdBy', 'username');
    
    res.status(200).json({
      success: true,
      data: folder
    });
  } catch (err) {
    next(err);
  }
};
