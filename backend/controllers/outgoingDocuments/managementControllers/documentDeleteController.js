
const OutgoingDocument = require('../../../models/OutgoingDocument');
const ErrorResponse = require('../../../utils/errorResponse');

// @desc    Delete outgoing document (Soft delete)
// @route   DELETE /api/outgoing-documents/:id
// @access  Private/Admin/AdminTuningDesk
exports.deleteOutgoingDocument = async (req, res, next) => {
  try {
    const document = await OutgoingDocument.findById(req.params.id);
    
    if (!document || document.isDeleted) {
      return next(
        new ErrorResponse(`Document not found with id of ${req.params.id}`, 404)
      );
    }
    
    document.isDeleted = true;
    document.deletedAt = new Date();
    document.deletedBy = req.user._id || req.user.id;
    await document.save({ validateBeforeSave: false });
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};
