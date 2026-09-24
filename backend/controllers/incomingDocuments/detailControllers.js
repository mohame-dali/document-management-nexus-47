
const IncomingDocument = require('../../models/IncomingDocument');
const ErrorResponse = require('../../utils/errorResponse');
const mongoose = require('mongoose');

// @desc    Get single incoming document
// @route   GET /api/incoming-documents/:id
// @access  Private
exports.getIncomingDocument = async (req, res, next) => {
  try {
    let documentId = req.params.id;
    
    // Handle case where id might be an object or invalid format
    if (typeof documentId === 'object') {
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
    
    const document = await IncomingDocument.findById(documentId)
      .populate('assignedTo.id')
      .populate('responsibleUser', 'username photo')
      .populate('answer') // This will populate the full outgoing document
      .populate('folder');
    
    if (!document || document.isDeleted) {
      return next(
        new ErrorResponse(`Document not found with id of ${documentId}`, 404)
      );
    }
    
    console.log('Document found:', document._id);
    console.log('Document has answer:', !!document.answer);
    if (document.answer) {
      console.log('Answer document ID:', document.answer._id);
      console.log('Answer scanned document:', document.answer.scannedDocument);
    }
    console.log('User role:', req.user.role);
    console.log('User departments:', req.user.departments?.map(d => d._id));
    console.log('User active department:', req.user.activeDepartment?._id);
    console.log('Document assigned to:', document.assignedTo?.map(a => a.id));
    
    // Director, Admin and AdminTuningDesk have access to all documents
    if (req.user.role === 'Director' || req.user.role === 'Admin' || req.user.role === 'AdminTuningDesk') {
      console.log(`${req.user.role} has full access to all documents`);
      return res.status(200).json({
        success: true,
        data: document
      });
    }
    
    // For AdminDepartment and User roles, check department access
    if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      // Check if user has an active department
      if (!req.user.activeDepartment) {
        console.log(`User ${req.user.username} has no active department`);
        return next(new ErrorResponse('No active department selected', 403));
      }
      
      // Check if the document is assigned to user's active department
      const isAssigned = document.assignedTo && document.assignedTo.some(
        dept => {
          // Handle both populated and non-populated department objects
          const deptId = dept.id ? 
            (typeof dept.id === 'string' ? dept.id : dept.id._id?.toString() || dept.id.toString()) :
            (typeof dept === 'string' ? dept : dept._id?.toString() || dept.toString());
          
          const userActiveDeptId = req.user.activeDepartment._id.toString();
          
          console.log('Comparing department IDs:', { deptId, userActiveDeptId, match: deptId === userActiveDeptId });
          
          return deptId === userActiveDeptId;
        }
      );
      
      // If document has no assignments, allow access for now (backward compatibility)
      if (!document.assignedTo || document.assignedTo.length === 0) {
        console.log('Document has no department assignments, allowing access');
        return res.status(200).json({
          success: true,
          data: document
        });
      }
      
      if (!isAssigned) {
        console.log(`User ${req.user.username} with department ${req.user.activeDepartment._id} not authorized to access document assigned to:`, document.assignedTo.map(a => a.id));
        return next(
          new ErrorResponse(`Not authorized to access this document`, 403)
        );
      }
      
      console.log(`User ${req.user.username} has access to document through department ${req.user.activeDepartment._id}`);
    }
    
    res.status(200).json({
      success: true,
      data: document
    });
  } catch (err) {
    console.error('Error in getIncomingDocument:', err);
    next(err);
  }
};
