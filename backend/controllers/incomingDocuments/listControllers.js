
const IncomingDocument = require('../../models/IncomingDocument');
const ErrorResponse = require('../../utils/errorResponse');
const { sanitizeSearchQuery } = require('../../utils/regexUtils');

// @desc    Get all incoming documents with pagination
// @route   GET /api/incoming-documents
// @access  Private
exports.getIncomingDocuments = async (req, res, next) => {
  try {
    let query = { isDeleted: false };
    
    // Filter by department for AdminDepartment and User roles (not for Director, Admin, or AdminTuningDesk)
    if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected', 403));
      }
      
      query['assignedTo.id'] = req.user.activeDepartment._id;
    }
    
    // For Director, AdminTuningDesk, and Admin allow filtering by department if specified
    if ((req.user.role === 'Director' || req.user.role === 'AdminTuningDesk' || req.user.role === 'Admin') && req.query.department) {
      query['assignedTo.id'] = req.query.department;
    }
    
    // Filter by year if provided
    if (req.query.year) {
      query.year = parseInt(req.query.year);
    } else {
      // Default to current year
      query.year = new Date().getFullYear();
    }

    // Filter by source if provided
    if (req.query.source && req.query.source.trim() !== '') {
      const safeSource = sanitizeSearchQuery(req.query.source);
      if (safeSource) {
        query.source = { $regex: safeSource, $options: 'i' };
      }
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per request
    const skip = (page - 1) * limit;

    // Get total count for hasMore calculation
    const totalCount = await IncomingDocument.countDocuments(query);
    
    const documents = await IncomingDocument.find(query)
      .populate('assignedTo.id')
      .populate('responsibleUser', 'username photo')
      .populate('answer')
      .populate('folder')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate if there are more pages
    const hasMore = (page * limit) < totalCount;
    
    res.status(200).json({
      success: true,
      count: documents.length,
      totalCount,
      page,
      limit,
      hasMore,
      data: documents
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Compter les courriers entrants non traités
// @route   GET /api/incoming-documents/pending/count
// @access  Private
exports.getPendingCount = async (req, res) => {
  try {
    const IncomingDocument = require('../../models/IncomingDocument');
    const query = {
      isDeleted: { $ne: true },
      answer: null,
    };
    // Restriction par département si nécessaire
    if (req.userRestrictedToDepartment) {
      query['assignedTo.departmentId'] = req.userRestrictedToDepartment;
    } else if (req.user && (req.user.role === 'AdminDepartment' || req.user.role === 'User') && req.user.activeDepartment) {
      query['assignedTo.id'] = req.user.activeDepartment._id || req.user.activeDepartment;
    }
    const count = await IncomingDocument.countDocuments(query);
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('[IncomingPendingCount] Erreur:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
