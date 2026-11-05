
const OutgoingDocument = require('../../models/OutgoingDocument');
const ErrorResponse = require('../../utils/errorResponse');
const { sanitizeSearchQuery } = require('../../utils/regexUtils');

// @desc    Get all outgoing documents with pagination
// @route   GET /api/outgoing-documents
// @access  Private
exports.getOutgoingDocuments = async (req, res, next) => {
  try {
    let query = { isDeleted: false };
    
    // If not AdminTuningDesk, Admin, or Director, filter by department
    if (req.user.role !== 'Director' && req.user.role !== 'AdminTuningDesk' && req.user.role !== 'Admin') {
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected', 403));
      }
      
      query['source.id'] = req.user.activeDepartment._id;
    }
    
    // For AdminTuningDesk, Director and Admin, allow filtering by department if specified
    if ((req.user.role === 'AdminTuningDesk' || req.user.role === 'Director' || req.user.role === 'Admin') && req.query.department) {
      query['source.id'] = req.query.department;
    }
    
    // Filter by year if provided
    if (req.query.year) {
      query.year = parseInt(req.query.year);
    } else {
      // Default to current year
      query.year = new Date().getFullYear();
    }
    
    // Search query: server-side text and numeric search (subject, assignedTo, serialNumber)
    if (req.query.q && req.query.q.trim() !== '') {
      const q = req.query.q.trim();
      const safeQ = sanitizeSearchQuery(q);
      const orConditions = [];
      if (safeQ) {
        orConditions.push({ subject: { $regex: safeQ, $options: 'i' } });
        orConditions.push({ assignedTo: { $regex: safeQ, $options: 'i' } });
      }
      const num = Number(q);
      if (!isNaN(num) && num > 0) {
        orConditions.push({ serialNumber: num });
      }
      if (orConditions.length > 0) {
        query.$or = orConditions;
      }
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
