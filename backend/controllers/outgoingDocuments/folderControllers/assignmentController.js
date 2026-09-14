
const OutgoingDocument = require('../../../models/OutgoingDocument');
const Folder = require('../../../models/Folder');
const ErrorResponse = require('../../../utils/errorResponse');

// @desc    Assign document to folder
// @route   PUT /api/outgoing-documents/:id/folder
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
    
    let document = await OutgoingDocument.findById(req.params.id);
    
    if (!document) {
      return next(
        new ErrorResponse(`Document not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Check if document belongs to the active department
    if (document.source.id.toString() !== req.user.activeDepartment._id.toString()) {
      return next(
        new ErrorResponse(`Document does not belong to your active department`, 403)
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
    
    // Update the document
    document = await OutgoingDocument.findByIdAndUpdate(
      req.params.id,
      { folder: folderId || null },
      { new: true, runValidators: true }
    ).populate('folder')
      .populate('reference')
      .populate('createdBy', 'username');
    
    res.status(200).json({
      success: true,
      data: document
    });
  } catch (err) {
    next(err);
  }
};
