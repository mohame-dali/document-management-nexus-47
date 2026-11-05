
const IncomingDocument = require('../../../models/IncomingDocument');
const OutgoingDocument = require('../../../models/OutgoingDocument');
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

    // Si on supprime un entrant qui a une answer, trouver le sortant associé et mettre son reference à null
    if (document.answer) {
      const associatedOutgoing = await OutgoingDocument.findById(document.answer);
      if (associatedOutgoing) {
        associatedOutgoing.reference = null;
        await associatedOutgoing.save({ validateBeforeSave: false });
      }
      document.answer = null;
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
