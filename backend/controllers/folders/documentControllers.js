
const Folder = require('../../models/Folder');
const IncomingDocument = require('../../models/IncomingDocument');
const OutgoingDocument = require('../../models/OutgoingDocument');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get documents in a folder
// @route   GET /api/folders/:id/documents
// @access  Private
exports.getFolderDocuments = async (req, res, next) => {
  try {
    const folder = await Folder.findById(req.params.id);
    
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
    
    // Get incoming documents
    const incomingDocuments = await IncomingDocument.find({
      folder: req.params.id
    }).populate('responsibleUser', 'username')
      .populate('answer')
      .populate('createdBy', 'username');
    
    // Get outgoing documents
    const outgoingDocuments = await OutgoingDocument.find({
      folder: req.params.id
    }).populate('reference')
      .populate('createdBy', 'username');
    
    res.status(200).json({
      success: true,
      data: {
        incomingDocuments,
        outgoingDocuments
      }
    });
  } catch (err) {
    next(err);
  }
};
