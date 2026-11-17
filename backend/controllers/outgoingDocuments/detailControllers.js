
const OutgoingDocument = require('../../models/OutgoingDocument');
const IncomingDocument = require('../../models/IncomingDocument');
const ErrorResponse = require('../../utils/errorResponse');
const mongoose = require('mongoose');

function extractId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'object') {
    if (value._id) return value._id.toString();
    if (value.id) return String(value.id);
    if (typeof value.toString === 'function') {
      const str = value.toString();
      return str === '[object Object]' ? null : str;
    }
  }
  return String(value);
}

// @desc    Get single outgoing document
// @route   GET /api/outgoing-documents/:id
// @access  Private
exports.getOutgoingDocument = async (req, res, next) => {
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

    // Guard null/missing activeDepartment for department-scoped roles
    const userActiveDeptId = extractId(req.user.activeDepartment);
    if (!userActiveDeptId) {
      return next(new ErrorResponse('No active department selected', 403));
    }

    // For AdminDepartment and User roles, check access permissions
    let hasAccess = false;
    const sourceDeptId = document.source ? extractId(document.source.id) : null;

    // Check if user belongs to the source department of the outgoing document
    if (sourceDeptId && sourceDeptId === userActiveDeptId) {
      hasAccess = true;
      console.log('User has access as member of source department');
    }

    // If not authorized yet, check if this is a response to an incoming document
    // that the user's department has access to
    const referenceIncomingId = extractId(document.reference);
    if (!hasAccess && referenceIncomingId) {
      console.log('Checking if outgoing document is a response to accessible incoming document...');

      try {
        const incomingDocument = await IncomingDocument.findById(referenceIncomingId);

        if (incomingDocument && !incomingDocument.isDeleted && incomingDocument.assignedTo && incomingDocument.assignedTo.length > 0) {
          // Check if user's department is assigned to the incoming document
          const isAssignedToUserDepartment = incomingDocument.assignedTo.some(dept => {
            const deptId = extractId(dept.id !== undefined ? dept.id : dept);
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
      console.log(`User ${req.user.username} with department ${userActiveDeptId} not authorized to access outgoing document from department ${sourceDeptId}`);
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
