
const IncomingDocument = require('../../models/IncomingDocument');
const OutgoingDocument = require('../../models/OutgoingDocument');
const ErrorResponse = require('../../utils/errorResponse');
const { sanitizeSearchQuery } = require('../../utils/regexUtils');

function buildIncomingSort(queryParams) {
  const dirParam = (queryParams.sortDirection || queryParams.sort || '').toString().toLowerCase();
  const dir = dirParam === 'asc' ? 1 : -1;
  const field = (queryParams.sortField || '').toString().trim();
  const sortBy = (queryParams.sortBy || '').toString().trim();

  if (field === 'serialNumber') return { serialNumber: dir, _id: dir };
  if (field === 'arrivalDate') return { arrivalDate: dir, serialNumber: dir, _id: dir };
  if (field === 'subject') return { subject: dir, _id: -1 };
  if (field === 'status') return { answer: dir, arrivalDate: -1, _id: -1 };

  if (sortBy === 'oldest-arrival') return { arrivalDate: 1, serialNumber: 1, _id: 1 };
  if (sortBy === 'newest-arrival') return { arrivalDate: -1, serialNumber: -1, _id: -1 };
  if (sortBy === 'serial-asc') return { serialNumber: 1, _id: 1 };
  if (sortBy === 'serial-desc') return { serialNumber: -1, _id: -1 };

  if (dirParam === 'asc') return { createdAt: 1, _id: 1 };
  return { createdAt: -1, _id: -1 };
}

// @desc    Get all incoming documents with server-side filtering, sorting & pagination
// @route   GET /api/incoming-documents
// @access  Private
exports.getIncomingDocuments = async (req, res, next) => {
  try {
    const query = { isDeleted: false };
    const andConditions = [];

    // Filter by department for AdminDepartment and User roles (not for Director, Admin, or AdminTuningDesk)
    if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected', 403));
      }

      query['assignedTo.id'] = req.user.activeDepartment._id || req.user.activeDepartment;
    }

    // For Director, AdminTuningDesk, and Admin allow filtering by department if specified
    if (
      (req.user.role === 'Director' || req.user.role === 'AdminTuningDesk' || req.user.role === 'Admin') &&
      req.query.department &&
      req.query.department !== 'all'
    ) {
      query['assignedTo.id'] = req.query.department;
    }

    // Filter by year if provided
    const parsedYear = req.query.year ? parseInt(req.query.year, 10) : NaN;
    query.year = !isNaN(parsedYear) ? parsedYear : new Date().getFullYear();

    // Filter by source if provided
    if (req.query.source && req.query.source.trim() !== '' && req.query.source !== 'all_sources') {
      const safeSource = sanitizeSearchQuery(req.query.source);
      if (safeSource) {
        query.source = { $regex: safeSource, $options: 'i' };
      }
    }

    // Filter by document type if provided
    const typeFilter = (req.query.typeDocument || req.query.type || '').toString().trim();
    if (typeFilter && typeFilter !== 'all_types') {
      query.typeDocument = typeFilter;
    }

    // Filter by status (pending / answered / urgent) and/or urgency flag
    const statusParam = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : '';
    const isUrgencyFilter =
      req.query.urgency === 'true' ||
      req.query.urgency === '1' ||
      statusParam === 'urgent';

    if (statusParam === 'pending' || statusParam === 'answered') {
      const deletedAnswerIds = await OutgoingDocument.distinct('_id', { isDeleted: true });

      if (statusParam === 'pending') {
        const pendingOr = [{ answer: null }, { answer: { $exists: false } }];
        if (deletedAnswerIds.length > 0) {
          pendingOr.push({ answer: { $in: deletedAnswerIds } });
        }
        andConditions.push({ $or: pendingOr });
      } else {
        query.answer = deletedAnswerIds.length > 0
          ? { $ne: null, $nin: deletedAnswerIds }
          : { $ne: null };
      }
    }

    if (isUrgencyFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Matches overdue (< today), today, and tomorrow (<= today + 1 day end-of-day)
      const tomorrowEnd = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 - 1);
      query.activity = { $nin: [null, ''] };
      query.dateActivity = { $ne: null, $lte: tomorrowEnd };
    }

    // Search query: server-side text and numeric search (subject, source, serialNumber)
    if (req.query.q && req.query.q.trim() !== '') {
      const q = req.query.q.trim();
      const safeQ = sanitizeSearchQuery(q);
      const orConditions = [];
      if (safeQ) {
        orConditions.push({ subject: { $regex: safeQ, $options: 'i' } });
        orConditions.push({ source: { $regex: safeQ, $options: 'i' } });
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

    // Pagination parameters
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 20), 100);
    const skip = (page - 1) * limit;
    const sortObj = buildIncomingSort(req.query);

    // Get total count after all filters are applied
    const totalCount = await IncomingDocument.countDocuments(query);

    const documents = await IncomingDocument.find(query)
      .populate('assignedTo.id')
      .populate({
        path: 'responsibleUser',
        select: 'username role photo personnelId',
        populate: { path: 'personnelId', select: 'nom prenom poste' }
      })
      .populate('answer')
      .populate('folder')
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
