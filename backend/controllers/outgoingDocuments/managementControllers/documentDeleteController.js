
const OutgoingDocument = require('../../../models/OutgoingDocument');
const IncomingDocument = require('../../../models/IncomingDocument');
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

    // Si on supprime un sortant qui a une reference, trouver l'entrant associé et mettre son answer à null
    if (document.reference) {
      const associatedIncoming = await IncomingDocument.findById(document.reference);
      if (associatedIncoming) {
        associatedIncoming.answer = null;
        await associatedIncoming.save({ validateBeforeSave: false });
      }
      document.reference = null;
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
