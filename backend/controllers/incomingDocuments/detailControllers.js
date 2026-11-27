const IncomingDocument = require('../../models/IncomingDocument');
const OrganizationSettings = require('../../models/OrganizationSettings');
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
      return next(
        new ErrorResponse(`Invalid document ID format: ${documentId}`, 400)
      );
    }
    
    const document = await IncomingDocument.findById(documentId)
      .populate('assignedTo.id')
      .populate({
        path: 'responsibleUser',
        select: 'username role photo personnelId',
        populate: { path: 'personnelId', select: 'nom prenom poste' }
      })
      .populate('answer') // This will populate the full outgoing document
      .populate('folder');
    
    if (!document || document.isDeleted) {
      return next(
        new ErrorResponse(`Document not found with id of ${documentId}`, 404)
      );
    }
    
    // Director, Admin and AdminTuningDesk have access to all documents
    if (req.user.role === 'Director' || req.user.role === 'Admin' || req.user.role === 'AdminTuningDesk') {
      return res.status(200).json({
        success: true,
        data: document
      });
    }
    
    // For AdminDepartment and User roles, check department access
    if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected', 403));
      }

      const userActiveDeptId = (req.user.activeDepartment._id || req.user.activeDepartment).toString();

      // Unassigned document: access restricted to Bureau d'Ordre (and Admin/Director/AdminTuningDesk handled above)
      if (!document.assignedTo || document.assignedTo.length === 0) {
        const settings = await OrganizationSettings.findOne().select('bureauOrdreDepartmentId').lean();
        const bureauOrdreId = settings?.bureauOrdreDepartmentId
          ? settings.bureauOrdreDepartmentId.toString()
          : null;

        if (bureauOrdreId && userActiveDeptId === bureauOrdreId) {
          return res.status(200).json({
            success: true,
            data: document
          });
        }

        return next(
          new ErrorResponse('Not authorized to access unassigned document', 403)
        );
      }

      // Check if the document is assigned to user's active department
      const isAssigned = document.assignedTo.some(
        dept => {
          const deptId = dept.id ? 
            (typeof dept.id === 'string' ? dept.id : dept.id._id?.toString() || dept.id.toString()) :
            (typeof dept === 'string' ? dept : dept._id?.toString() || dept.toString());
          
          return deptId === userActiveDeptId;
        }
      );
      
      if (!isAssigned) {
        return next(
          new ErrorResponse(`Not authorized to access this document`, 403)
        );
      }

      return res.status(200).json({
        success: true,
        data: document
      });
    }
    
    return next(
      new ErrorResponse(`Not authorized to access this document`, 403)
    );
  } catch (err) {
    console.error('Error in getIncomingDocument:', err);
    next(err);
  }
};
