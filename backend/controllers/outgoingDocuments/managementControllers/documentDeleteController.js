
const OutgoingDocument = require('../../../models/OutgoingDocument');
const IncomingDocument = require('../../../models/IncomingDocument');
const ErrorResponse = require('../../../utils/errorResponse');
const fs = require('fs');
const path = require('path');

// @desc    Delete outgoing document
// @route   DELETE /api/outgoing-documents/:id
// @access  Private/Admin/AdminTuningDesk
exports.deleteOutgoingDocument = async (req, res, next) => {
  try {
    const document = await OutgoingDocument.findById(req.params.id);
    
    if (!document) {
      return next(
        new ErrorResponse(`Document not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Remove file if exists
    if (document.scannedDocument) {
      const filePath = path.join(__dirname, '../../..', document.scannedDocument);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Update any incoming document that references this document
    if (document.reference) {
      await IncomingDocument.findByIdAndUpdate(
        document.reference,
        { answer: null }
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
