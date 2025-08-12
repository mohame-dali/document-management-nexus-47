
const IncomingDocument = require('../../models/IncomingDocument');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get all incoming documents
// @route   GET /api/incoming-documents
// @access  Private
exports.getIncomingDocuments = async (req, res, next) => {
  try {
    let query = {};
    
    // Filter by department for AdminDepartment and User roles (not for SuperAdmin, Admin, or AdminTuningDesk)
    if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected', 403));
      }
      
      query['assignedTo.id'] = req.user.activeDepartment._id;
    }
    
    // For SuperAdmin, AdminTuningDesk, and Admin allow filtering by department if specified
    if ((req.user.role === 'SuperAdmin' || req.user.role === 'AdminTuningDesk' || req.user.role === 'Admin') && req.query.department) {
      query['assignedTo.id'] = req.query.department;
    }
    
    // Filter by year if provided
    if (req.query.year) {
      query.year = parseInt(req.query.year);
    } else {
      // Default to current year
      query.year = new Date().getFullYear();
    }
    
    const documents = await IncomingDocument.find(query)
      .populate('assignedTo.id')
      .populate('responsibleUser', 'username photo')
      .populate('answer')
      .populate('folder')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (err) {
    next(err);
  }
};
