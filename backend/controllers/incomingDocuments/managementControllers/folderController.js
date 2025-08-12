
const IncomingDocument = require('../../../models/IncomingDocument');
const Folder = require('../../../models/Folder');
const ErrorResponse = require('../../../utils/errorResponse');

// @desc    Assign document to folder
// @route   PUT /api/incoming-documents/:id/folder
// @access  Private/AdminDepartment
exports.assignToFolder = async (req, res, next) => {
  try {
    const { folderId } = req.body;
    
    // Allow removing from folder if folderId is null
    if (folderId === undefined) {
      return next(
        new ErrorResponse('Please provide a folder ID or null', 400)
      );
    }
    
    // Check if document exists
    let document = await IncomingDocument.findById(req.params.id);
    
    if (!document) {
      return next(
        new ErrorResponse(`Document not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Check if document is assigned to the active department
    if (!req.user.activeDepartment) {
      return next(new ErrorResponse('No active department selected', 403));
    }
    
    const isAssigned = document.assignedTo.some(
      dept => dept.id.toString() === req.user.activeDepartment._id.toString()
    );
    
    if (!isAssigned) {
      return next(
        new ErrorResponse(`Document is not assigned to your department`, 403)
      );
    }
    
    // Check if folder exists and belongs to the active department
    if (folderId) {
      const folder = await Folder.findById(folderId);
      
      if (!folder) {
        return next(
          new ErrorResponse(`Folder not found`, 404)
        );
      }
      
      if (folder.department.toString() !== req.user.activeDepartment._id.toString()) {
        return next(
          new ErrorResponse(`Folder does not belong to your active department`, 403)
        );
      }
    }
    
    // Update document
    document = await IncomingDocument.findByIdAndUpdate(
      req.params.id,
      { folder: folderId || null },
      { new: true, runValidators: true }
    ).populate('assignedTo.id')
      .populate('responsibleUser', 'username photo')
      .populate('answer')
      .populate('folder');
    
    res.status(200).json({
      success: true,
      data: document
    });
  } catch (err) {
    next(err);
  }
};
