
const IncomingDocument = require('../../../models/IncomingDocument');
const ErrorResponse = require('../../../utils/errorResponse');

// @desc    Delete incoming document (Soft delete)
// @route   DELETE /api/incoming-documents/:id
// @access  Private/Admin/AdminTuningDesk
exports.deleteIncomingDocument = async (req, res, next) => {
  try {
    const document = await IncomingDocument.findById(req.params.id);
    
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
