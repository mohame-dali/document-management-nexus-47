
const IncomingDocument = require('../../../models/IncomingDocument');
const OutgoingDocument = require('../../../models/OutgoingDocument');
const ErrorResponse = require('../../../utils/errorResponse');

// @desc    Add answer (outgoing document) to incoming document
// @route   POST /api/incoming-documents/:id/answer
// @access  Private/AdminDepartment
exports.addAnswer = async (req, res, next) => {
  try {
    const { outgoingDocumentId } = req.body;
    
    if (!outgoingDocumentId) {
      return next(
        new ErrorResponse('Please provide an outgoing document ID', 400)
      );
    }
    
    // Check if incoming document exists
    let incomingDocument = await IncomingDocument.findById(req.params.id);
    
    if (!incomingDocument) {
      return next(
        new ErrorResponse(`Incoming document not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Check if incoming document is assigned to the active department
    if (!req.user.activeDepartment) {
      return next(new ErrorResponse('No active department selected', 403));
    }
    
    const isAssigned = incomingDocument.assignedTo.some(
      dept => {
        const deptId = dept.id ? 
          (typeof dept.id === 'string' ? dept.id : dept.id._id?.toString() || dept.id.toString()) :
          (typeof dept === 'string' ? dept : dept._id?.toString() || dept.toString());
        
        return deptId === req.user.activeDepartment._id.toString();
      }
    );
    
    if (!isAssigned) {
      return next(
        new ErrorResponse(`Document is not assigned to your department`, 403)
      );
    }
    
    // Check if outgoing document exists
    const outgoingDocument = await OutgoingDocument.findById(outgoingDocumentId);
    
    if (!outgoingDocument) {
      return next(
        new ErrorResponse(`Outgoing document not found with id of ${outgoingDocumentId}`, 404)
      );
    }
    
    // Check if outgoing document belongs to the active department
    if (outgoingDocument.source.id.toString() !== req.user.activeDepartment._id.toString()) {
      return next(
        new ErrorResponse(`Outgoing document does not belong to your department`, 403)
      );
    }
    
    // Update incoming document with answer
    incomingDocument = await IncomingDocument.findByIdAndUpdate(
      req.params.id,
      { answer: outgoingDocumentId },
      { new: true, runValidators: true }
    ).populate('assignedTo.id')
      .populate('responsibleUser', 'username photo')
      .populate('answer')
      .populate('folder');
    
    // Update outgoing document reference to point back to this incoming document
    await OutgoingDocument.findByIdAndUpdate(
      outgoingDocumentId,
      { reference: req.params.id },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: incomingDocument
    });
  } catch (err) {
    console.error('Error in addAnswer:', err);
    next(err);
  }
};
