
const IncomingDocument = require('../../../models/IncomingDocument');
const OutgoingDocument = require('../../../models/OutgoingDocument');
const ErrorResponse = require('../../../utils/errorResponse');
const fs = require('fs');
const path = require('path');

// @desc    Delete incoming document
// @route   DELETE /api/incoming-documents/:id
// @access  Private/Admin/AdminTuningDesk
exports.deleteIncomingDocument = async (req, res, next) => {
  try {
    const document = await IncomingDocument.findById(req.params.id);
    
    if (!document) {
      return next(
        new ErrorResponse(`Document not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Delete file if exists
    if (document.scannedDocument) {
      const filePath = path.join(__dirname, '../../..', document.scannedDocument);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Check if this document is referenced in any outgoing document
    const referencingDoc = await OutgoingDocument.findOne({ reference: document._id });
    
    if (referencingDoc) {
      // Update the outgoing document to remove the reference
      await OutgoingDocument.findByIdAndUpdate(
        referencingDoc._id,
        { reference: null }
      );
    }
    
    await document.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};
