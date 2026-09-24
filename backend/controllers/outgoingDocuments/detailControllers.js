
const OutgoingDocument = require('../../models/OutgoingDocument');
const IncomingDocument = require('../../models/IncomingDocument');
const ErrorResponse = require('../../utils/errorResponse');
const mongoose = require('mongoose');

// @desc    Get single outgoing document
// @route   GET /api/outgoing-documents/:id
// @access  Private
exports.getOutgoingDocument = async (req, res, next) => {
  try {
    let documentId = req.params.id;
    
    // Handle case where id might be an object or invalid format
    if (typeof documentId === 'object') {
      // If it's an object, try to extract the id or _id property
      documentId = documentId.id || documentId._id || documentId;
    }
    
    // Ensure we have a string
    documentId = String(documentId);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      console.log('Invalid ObjectId format:', documentId);
      return next(
        new ErrorResponse(`Invalid document ID format: ${documentId}`, 400)
      );
    }
    
    console.log('Fetching outgoing document with ID:', documentId);
    
    const document = await OutgoingDocument.findById(documentId)
      .populate('folder')
      .populate('reference')
      .populate('createdBy', 'username');
    
    if (!document || document.isDeleted) {
      return next(
        new ErrorResponse(`Document not found with id of ${documentId}`, 404)
      );
    }
    
    console.log('Found outgoing document:', document._id);
    console.log('Document scanned document path:', document.scannedDocument);
    
    // Director, AdminTuningDesk and Admin have access to all documents
    if (req.user.role === 'Director' || req.user.role === 'AdminTuningDesk' || req.user.role === 'Admin') {
      console.log(`${req.user.role} has full access to all documents`);
      return res.status(200).json({
        success: true,
        data: document
      });
    }
    
    // For AdminDepartment and User roles, check access permissions
    let hasAccess = false;
    
    // Check if user belongs to the source department of the outgoing document
    if (document.source.id.toString() === req.user.activeDepartment._id.toString()) {
      hasAccess = true;
      console.log('User has access as member of source department');
    }
    
    // If not authorized yet, check if this is a response to an incoming document
    // that the user's department has access to
    if (!hasAccess && document.reference) {
      console.log('Checking if outgoing document is a response to accessible incoming document...');
      
      try {
        const incomingDocument = await IncomingDocument.findById(document.reference);
        
        if (incomingDocument && incomingDocument.assignedTo && incomingDocument.assignedTo.length > 0) {
          // Check if user's department is assigned to the incoming document
          const isAssignedToUserDepartment = incomingDocument.assignedTo.some(dept => {
            const deptId = dept.id ? 
              (typeof dept.id === 'string' ? dept.id : dept.id._id?.toString() || dept.id.toString()) :
              (typeof dept === 'string' ? dept : dept._id?.toString() || dept.toString());
            
            const userActiveDeptId = req.user.activeDepartment._id.toString();
            console.log('Comparing department IDs for incoming document access:', { deptId, userActiveDeptId });
            
            return deptId === userActiveDeptId;
          });
          
          if (isAssignedToUserDepartment) {
            hasAccess = true;
            console.log('User has access to outgoing document as response to assigned incoming document');
          }
        }
      } catch (error) {
        console.error('Error checking incoming document reference:', error);
      }
    }
    
    if (!hasAccess) {
      console.log(`User ${req.user.username} with department ${req.user.activeDepartment._id} not authorized to access outgoing document from department ${document.source.id}`);
      return next(
        new ErrorResponse(`Not authorized to access this document`, 403)
      );
    }
    
    res.status(200).json({
      success: true,
      data: document
    });
  } catch (err) {
    console.error('Error in getOutgoingDocument:', err);
    next(err);
  }
};
