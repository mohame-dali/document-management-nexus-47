
const IncomingDocument = require('../../models/IncomingDocument');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Search incoming documents
// @route   GET /api/incoming-documents/search
// @access  Private
exports.searchIncomingDocuments = async (req, res, next) => {
  try {
    const { q, year, dateFrom, dateTo, serialNumber, subject } = req.query;
    
    // Build the query object
    let query = {};
    
    // Text search in multiple fields including OCR
    if (q) {
      query.$or = [
        { subject: { $regex: q, $options: 'i' } },
        { source: { $regex: q, $options: 'i' } },
        { ocrText: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { activity: { $regex: q, $options: 'i' } }
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
      query.arrivalDate = {};
      if (dateFrom) {
        query.arrivalDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.arrivalDate.$lte = new Date(dateTo);
      }
    }
    
    // Filter by department for AdminDepartment and User roles (not for SuperAdmin, AdminTuningDesk, Admin)
    if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected', 403));
      }
      
      query['assignedTo.id'] = req.user.activeDepartment._id;
    }
    
    console.log('Incoming documents search query:', query);
    
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
    console.error('Search error:', err);
    next(err);
  }
};
