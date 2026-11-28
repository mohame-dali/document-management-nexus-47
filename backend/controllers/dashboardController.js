const mongoose = require('mongoose');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const Personnel = require('../models/Personnel');
const AuditLog = require('../models/AuditLog');
const SemanticIndex = require('../models/SemanticIndex');
const AttendanceDeclaration = require('../models/AttendanceDeclaration');
const Department = require('../models/Department');
const { getWorkerRuntimeStatus } = require('../services/ollamaService');
const { isExecutiveDashboardUser } = require('../middleware/auth');

const CRITICAL_AUDIT_ACTIONS = [
  'user_create',
  'user_update',
  'user_delete',
  'PERMANENT_DELETE',
  'EMPTY_TRASH',
  'document_delete',
  'personnel_create',
  'personnel_delete',
  'personnel_restore',
  'personnel_link_user',
  'presence_settings_balance_change',
];

const PRIORITY_RANK = {
  overdue: 0,
  urgent: 1,
  unassigned: 2,
};

async function buildExecutiveBottleneckData({ startOfToday, tomorrowEnd }) {
  const pendingAnswerOr = [{ answer: null }, { answer: { $exists: false } }];

  if (mongoose.connection.readyState === 1) {
    try {
      const deletedAnswerIds = await OutgoingDocument.distinct('_id', { isDeleted: true });
      if (Array.isArray(deletedAnswerIds) && deletedAnswerIds.length > 0) {
        pendingAnswerOr.push({ answer: { $in: deletedAnswerIds } });
      }
    } catch {
      // Fallback safely to null/missing answers if distinct fails
    }
  }

  const urgentCriteria = {
    activity: { $nin: [null, ''] },
    dateActivity: { $ne: null, $lte: tomorrowEnd },
  };
  const unassignedCriteria = {
    $or: [{ responsibleUser: null }, { responsibleUser: { $exists: false } }],
  };

  const [
    urgentOrOverdueCount,
    unassignedResponsibleCount,
    pendingHrRequestsCount,
    rawFollowUpDocs,
  ] = await Promise.all([
    IncomingDocument.countDocuments({
      isDeleted: { $ne: true },
      $or: pendingAnswerOr,
      ...urgentCriteria,
    }),
    IncomingDocument.countDocuments({
      isDeleted: { $ne: true },
      $and: [{ $or: pendingAnswerOr }, unassignedCriteria],
    }),
    AttendanceDeclaration.countDocuments({ validationStatus: 'en_attente' }),
    IncomingDocument.find({
      isDeleted: { $ne: true },
      $and: [
        { $or: pendingAnswerOr },
        { $or: [urgentCriteria, unassignedCriteria] },
      ],
    })
      .select('serialNumber year subject arrivalDate activity dateActivity correspondenceNumber assignedTo responsibleUser')
      .populate('assignedTo.id', 'name code')
      .sort({ dateActivity: 1, arrivalDate: -1, createdAt: -1 })
      .limit(40)
      .lean(),
  ]);

  const mappedDocs = (Array.isArray(rawFollowUpDocs) ? rawFollowUpDocs : []).map((doc) => {
    const hasActivityDeadline = Boolean(doc.activity && String(doc.activity).trim() !== '' && doc.dateActivity);
    const deadlineDate = hasActivityDeadline ? new Date(doc.dateActivity) : null;
    const isValidDeadline = Boolean(deadlineDate && !Number.isNaN(deadlineDate.getTime()));
    const isOverdue = Boolean(isValidDeadline && deadlineDate < startOfToday);
    const isUrgent = Boolean(isValidDeadline && deadlineDate >= startOfToday && deadlineDate <= tomorrowEnd);
    const isUnassigned = !doc.responsibleUser;

    let urgencyStatus = 'unassigned';
    if (isOverdue) {
      urgencyStatus = 'overdue';
    } else if (isUrgent) {
      urgencyStatus = 'urgent';
    }

    const departments = Array.isArray(doc.assignedTo)
      ? doc.assignedTo
          .map((dept) => (dept?.id && typeof dept.id === 'object' ? dept.id.name : dept?.name) || '')
          .filter(Boolean)
      : [];

    return {
      _id: String(doc._id),
      serialNumber: doc.serialNumber,
      year: doc.year,
      subject: doc.subject || '',
      correspondenceNumber: doc.correspondenceNumber || '',
      arrivalDate: doc.arrivalDate || null,
      activity: doc.activity || '',
      dateActivity: doc.dateActivity || null,
      departments,
      hasResponsible: !isUnassigned,
      isUrgentOrOverdue: isOverdue || isUrgent,
      urgencyStatus,
    };
  });

  mappedDocs.sort((a, b) => {
    const rankDiff = (PRIORITY_RANK[a.urgencyStatus] ?? 9) - (PRIORITY_RANK[b.urgencyStatus] ?? 9);
    if (rankDiff !== 0) return rankDiff;
    if (a.dateActivity && b.dateActivity) {
      const deadlineDiff = new Date(a.dateActivity).getTime() - new Date(b.dateActivity).getTime();
      if (deadlineDiff !== 0) return deadlineDiff;
    }
    const arrivalA = a.arrivalDate ? new Date(a.arrivalDate).getTime() : 0;
    const arrivalB = b.arrivalDate ? new Date(b.arrivalDate).getTime() : 0;
    return arrivalB - arrivalA;
  });

  return {
    urgentOrOverdueCount,
    unassignedResponsibleCount,
    pendingHrRequestsCount,
    followUpDocuments: mappedDocs.slice(0, 20),
  };
}

/**
 * @desc    Obtenir les statistiques réelles et précises du dashboard (KPIs)
 * @route   GET /api/dashboard/stats?year=2024
 * @access  Private (Admin & Director only)
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    if (!isExecutiveDashboardUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Dashboard access is restricted to Admin and Director roles',
      });
    }

    const currentYear = req.query.year
      ? parseInt(req.query.year, 10)
      : new Date().getFullYear();

    const incomingFilter = {
      isDeleted: false,
      year: currentYear,
    };

    const outgoingFilter = {
      isDeleted: false,
      year: currentYear,
    };

    const pendingFilter = {
      ...incomingFilter,
      answer: null,
    };

    const [incomingTotal, outgoingTotal, pending] = await Promise.all([
      IncomingDocument.countDocuments(incomingFilter),
      OutgoingDocument.countDocuments(outgoingFilter),
      IncomingDocument.countDocuments(pendingFilter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        year: currentYear,
        incomingTotal,
        outgoingTotal,
        pending,
        totalDocuments: incomingTotal + outgoingTotal,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Obtenir le résumé exécutif de suivi opérationnel (Admin et Directeur uniquement)
 * @route   GET /api/dashboard/summary?year=2026
 * @access  Private (Admin & Director only)
 */
exports.getDashboardSummary = async (req, res, next) => {
  try {
    if (!isExecutiveDashboardUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Dashboard access is restricted to Admin and Director roles',
      });
    }

    const role = req.user?.role || 'Director';
    const normalizedRole = String(role).trim().toLowerCase();
    const isAdminRole = normalizedRole === 'admin';
    const currentYear = req.query.year
      ? parseInt(req.query.year, 10) || new Date().getFullYear()
      : new Date().getFullYear();

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(startOfToday.getTime() + 2 * 24 * 60 * 60 * 1000 - 1);

    const summary = {
      role,
      isRHAdmin: false,
      year: currentYear,
      timestamp: now.toISOString(),
    };

    const executivePromise = buildExecutiveBottleneckData({ startOfToday, tomorrowEnd });

    if (isAdminRole) {
      const failedIndexFilter = {
        isDeleted: { $ne: true },
        isIndexed: false,
        $or: [
          { indexError: { $ne: null } },
          { indexAttempts: { $gt: 0 } },
        ],
      };

      const [
        executiveData,
        indexedIncoming,
        indexedOutgoing,
        failedIncoming,
        failedOutgoing,
        totalVectors,
        pendingPersonnelCount,
        criticalLogs,
      ] = await Promise.all([
        executivePromise,
        IncomingDocument.countDocuments({ isDeleted: { $ne: true }, isIndexed: true }),
        OutgoingDocument.countDocuments({ isDeleted: { $ne: true }, isIndexed: true }),
        IncomingDocument.countDocuments(failedIndexFilter),
        OutgoingDocument.countDocuments(failedIndexFilter),
        SemanticIndex.countDocuments({}),
        Personnel.countDocuments({
          isDeleted: { $ne: true },
          statut: 'en_attente',
          userId: null,
        }),
        AuditLog.find({ action: { $in: CRITICAL_AUDIT_ACTIONS } })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('userId', 'username role')
          .lean(),
      ]);

      summary.executive = executiveData;
      summary.admin = {
        system: {
          mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          aiWorker: getWorkerRuntimeStatus(),
          semanticIndex: {
            indexedDocs: indexedIncoming + indexedOutgoing,
            failedDocs: failedIncoming + failedOutgoing,
            totalVectors,
          },
        },
        pendingPersonnelCount,
        recentCriticalAudit: (criticalLogs || []).map((log) => ({
          _id: String(log._id),
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId || '',
          username: log.userId?.username || log.userDetails?.username || 'System',
          role: log.userId?.role || log.userDetails?.role || '',
          createdAt: log.createdAt,
        })),
      };
    } else {
      const unansweredFilter = {
        isDeleted: { $ne: true },
        $or: [{ answer: null }, { answer: { $exists: false } }],
      };

      const [
        executiveData,
        incomingTotal,
        outgoingTotal,
        unansweredIncoming,
        unansweredUrgentIncoming,
        activeDepartments,
      ] = await Promise.all([
        executivePromise,
        IncomingDocument.countDocuments({ isDeleted: { $ne: true }, year: currentYear }),
        OutgoingDocument.countDocuments({ isDeleted: { $ne: true }, year: currentYear }),
        IncomingDocument.countDocuments(unansweredFilter),
        IncomingDocument.countDocuments({
          ...unansweredFilter,
          activity: { $nin: [null, ''] },
          dateActivity: { $ne: null, $lte: tomorrowEnd },
        }),
        Department.countDocuments({ isActive: true }),
      ]);

      summary.executive = executiveData;
      summary.director = {
        incomingTotal,
        outgoingTotal,
        unansweredIncoming,
        unansweredUrgentIncoming,
        activeDepartments,
      };
    }

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
};

