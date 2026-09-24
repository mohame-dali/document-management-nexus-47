
const OutgoingDocument = require('../../models/OutgoingDocument');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Search outgoing documents
// @route   GET /api/outgoing-documents/search
// @access  Private
exports.searchOutgoingDocuments = async (req, res, next) => {
  try {
    const { q, year, dateFrom, dateTo, serialNumber, subject, page, limit } = req.query;
    
    // Build the query object
    let query = {};
    
    // Text search in multiple fields including OCR
    if (q) {
      query.$or = [
        { subject: { $regex: q, $options: 'i' } },
        { ocrText: { $regex: q, $options: 'i' } },
        { 'source.name': { $regex: q, $options: 'i' } },
        { assignedTo: { $regex: q, $options: 'i' } },
        { pourInfo: { $regex: q, $options: 'i' } }
      ];
    }
    
    // Filter by year if provided
    if (year) {
      query.year = parseInt(year);
    }
    
    // Filter by serial number if provided
    if (serialNumber) {
      query.serialNumber = parseInt(serialNumber);
    }
    
    // Filter by subject if provided
    if (subject) {
      query.subject = { $regex: subject, $options: 'i' };
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.issueDate = {};
      if (dateFrom) {
        query.issueDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.issueDate.$lte = new Date(dateTo);
      }
    }
    
    // Filter by department if not Director, AdminTuningDesk or Admin
    if (req.user.role !== 'Director' && req.user.role !== 'AdminTuningDesk' && req.user.role !== 'Admin') {
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected', 403));
      }
      
      query['source.id'] = req.user.activeDepartment._id;
    }
    
    // Pagination parameters
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 100); // Max 100 per request
    const skip = (pageNum - 1) * limitNum;

    // Get total count for hasMore calculation
    const totalCount = await OutgoingDocument.countDocuments(query);
    
    console.log('Outgoing documents search query:', query);
    
    const documents = await OutgoingDocument.find(query)
      .populate('folder')
      .populate('reference')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Calculate if there are more pages
    const hasMore = (pageNum * limitNum) < totalCount;
    
    res.status(200).json({
      success: true,
      count: documents.length,
      totalCount,
      page: pageNum,
      limit: limitNum,
      hasMore,
      data: documents
    });
  } catch (err) {
    console.error('Search error:', err);
    next(err);
  }
};
