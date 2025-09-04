
const OutgoingDocument = require('../../models/OutgoingDocument');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get all outgoing documents with pagination
// @route   GET /api/outgoing-documents
// @access  Private
exports.getOutgoingDocuments = async (req, res, next) => {
  try {
    let query = {};
    
    // If not AdminTuningDesk, Admin, or SuperAdmin, filter by department
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'AdminTuningDesk' && req.user.role !== 'Admin') {
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected', 403));
      }
      
      query['source.id'] = req.user.activeDepartment._id;
    }
    
    // For AdminTuningDesk and SuperAdmin, allow filtering by department if specified
    if ((req.user.role === 'AdminTuningDesk' || req.user.role === 'SuperAdmin') && req.query.department) {
      query['source.id'] = req.query.department;
    }
    
    // Filter by year if provided
    if (req.query.year) {
      query.year = parseInt(req.query.year);
    } else {
      // Default to current year
      query.year = new Date().getFullYear();
    }
    
    // Check if we just need the count for dashboard stats
    if (req.query.count === 'true') {
      const count = await OutgoingDocument.countDocuments(query);
      return res.status(200).json({
        success: true,
        count
      });
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per request
    const skip = (page - 1) * limit;

    // Get total count for hasMore calculation
    const totalCount = await OutgoingDocument.countDocuments(query);
    
    const documents = await OutgoingDocument.find(query)
      .populate('folder')
      .populate('reference')
      .select('-createdBy') // Exclude createdBy to avoid populate issues
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
