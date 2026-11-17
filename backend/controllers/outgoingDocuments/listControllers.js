
const OutgoingDocument = require('../../models/OutgoingDocument');
const ErrorResponse = require('../../utils/errorResponse');
const { sanitizeSearchQuery } = require('../../utils/regexUtils');

function buildOutgoingSort(queryParams) {
  const dirParam = (queryParams.sortDirection || queryParams.sort || '').toString().toLowerCase();
  const dir = dirParam === 'asc' ? 1 : -1;
  const field = (queryParams.sortField || '').toString().trim();
  const sortBy = (queryParams.sortBy || '').toString().trim();

  if (field === 'serialNumber') return { serialNumber: dir, _id: dir };
  if (field === 'issueDate') return { issueDate: dir, serialNumber: dir, _id: dir };
  if (field === 'subject') return { subject: dir, _id: -1 };
  if (field === 'status') return { folder: dir, issueDate: -1, _id: -1 };

  if (sortBy === 'oldest-issue') return { issueDate: 1, serialNumber: 1, _id: 1 };
  if (sortBy === 'newest-issue') return { issueDate: -1, serialNumber: -1, _id: -1 };
  if (sortBy === 'serial-asc') return { serialNumber: 1, _id: 1 };
  if (sortBy === 'serial-desc') return { serialNumber: -1, _id: -1 };

  if (dirParam === 'asc') return { createdAt: 1, _id: 1 };
  return { createdAt: -1, _id: -1 };
}

// @desc    Get all outgoing documents with server-side filtering, sorting & pagination
// @route   GET /api/outgoing-documents
// @access  Private
exports.getOutgoingDocuments = async (req, res, next) => {
  try {
    const query = { isDeleted: false };
    const andConditions = [];

    // If not AdminTuningDesk, Admin, or Director, filter by department
    if (req.user.role !== 'Director' && req.user.role !== 'AdminTuningDesk' && req.user.role !== 'Admin') {
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected', 403));
      }

      query['source.id'] = req.user.activeDepartment._id || req.user.activeDepartment;
    }

    // For AdminTuningDesk, Director and Admin, allow filtering by department if specified
    if (
      (req.user.role === 'AdminTuningDesk' || req.user.role === 'Director' || req.user.role === 'Admin') &&
      req.query.department &&
      req.query.department !== 'all'
    ) {
      query['source.id'] = req.query.department;
    }

    // Filter by year if provided
    const parsedYear = req.query.year ? parseInt(req.query.year, 10) : NaN;
    query.year = !isNaN(parsedYear) ? parsedYear : new Date().getFullYear();

    // Filter by document type if provided
    const typeFilter = (req.query.typeDocument || req.query.type || '').toString().trim();
    if (typeFilter && typeFilter !== 'all_types') {
      query.typeDocument = typeFilter;
    }

    // Filter by folder / categorization status
    const folderParam = (req.query.folderFilter || req.query.folder || '').toString().trim().toLowerCase();
    if (folderParam === 'categorized') {
      query.folder = { $ne: null };
    } else if (folderParam === 'uncategorized') {
      andConditions.push({ $or: [{ folder: null }, { folder: { $exists: false } }] });
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
        andConditions.push({ $or: orConditions });
      }
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
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
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 20), 100);
    const skip = (page - 1) * limit;
    const sortObj = buildOutgoingSort(req.query);

    // Get total count after all filters are applied
    const totalCount = await OutgoingDocument.countDocuments(query);

    const documents = await OutgoingDocument.find(query)
      .populate('folder')
      .populate('reference')
      .select('-createdBy') // Exclude createdBy to avoid populate issues
      .sort(sortObj)
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
