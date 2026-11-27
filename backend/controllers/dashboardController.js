const mongoose = require('mongoose');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const Personnel = require('../models/Personnel');
const AuditLog = require('../models/AuditLog');
const SemanticIndex = require('../models/SemanticIndex');
const OrganizationSettings = require('../models/OrganizationSettings');
const Attendance = require('../models/Attendance');
const AttendanceDeclaration = require('../models/AttendanceDeclaration');
const Department = require('../models/Department');
const Message = require('../models/Message');
const { getWorkerRuntimeStatus } = require('../services/ollamaService');

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

const toId = (val) => {
  if (!val) return null;
  if (typeof val === 'object' && val._id) return String(val._id);
  return String(val);
};

/**
 * @desc    Obtenir les statistiques réelles et précises du dashboard (KPIs)
 * @route   GET /api/dashboard/stats?year=2024
 * @access  Private
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
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

    // Cloisonnement RBAC par département si applicable
    const userRole = req.user?.role;
    const isGlobalRole = ['Director', 'AdminTuningDesk', 'Admin'].includes(userRole);

    if (!isGlobalRole && req.user?.activeDepartment) {
      const activeDeptId = req.user.activeDepartment._id || req.user.activeDepartment;
      incomingFilter['assignedTo.id'] = activeDeptId;
      outgoingFilter['source.id'] = activeDeptId;
    }

    // Filtre des courriers entrants en attente de réponse
    const pendingFilter = {
      ...incomingFilter,
      answer: null,
    };

    // Exécution parallélisée des 3 compteurs sur MongoDB
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
 * @desc    Obtenir un résumé exécutif en lecture seule adapté au rôle de l'utilisateur connecté
 * @route   GET /api/dashboard/summary?year=2026
 * @access  Private
 */
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const role = req.user?.role || 'User';
    const currentYear = req.query.year
      ? parseInt(req.query.year, 10) || new Date().getFullYear()
      : new Date().getFullYear();

    const activeDeptId = toId(req.user?.activeDepartment);
    const activeDeptName =
      typeof req.user?.activeDepartment === 'object' && req.user?.activeDepartment !== null
        ? req.user.activeDepartment.name || ''
        : '';

    const settings = await OrganizationSettings.findOne()
      .select('rhDepartmentId')
      .lean();
    const rhDeptId = toId(settings?.rhDepartmentId);
    const isRHAdmin =
      role === 'AdminDepartment' &&
      Boolean(rhDeptId) &&
      Boolean(activeDeptId) &&
      activeDeptId === rhDeptId;

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const tomorrowEnd = new Date(startOfToday.getTime() + 2 * 24 * 60 * 60 * 1000 - 1);

    const summary = {
      role,
      isRHAdmin,
      year: currentYear,
      timestamp: now.toISOString(),
    };

    if (role === 'Admin') {
      const failedIndexFilter = {
        isDeleted: { $ne: true },
        isIndexed: false,
        $or: [
          { indexError: { $ne: null } },
          { indexAttempts: { $gt: 0 } },
        ],
      };

      const [
        indexedIncoming,
        indexedOutgoing,
        failedIncoming,
        failedOutgoing,
        totalVectors,
        pendingPersonnelCount,
        criticalLogs,
      ] = await Promise.all([
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
    } else if (role === 'AdminTuningDesk') {
      const [todayIncoming, todayOutgoing, unroutedIncoming, activeOcrIncoming, activeOcrOutgoing] =
        await Promise.all([
          IncomingDocument.countDocuments({
            isDeleted: { $ne: true },
            createdAt: { $gte: startOfToday, $lte: endOfToday },
          }),
          OutgoingDocument.countDocuments({
            isDeleted: { $ne: true },
            createdAt: { $gte: startOfToday, $lte: endOfToday },
          }),
          IncomingDocument.countDocuments({
            isDeleted: { $ne: true },
            $or: [{ assignedTo: { $exists: false } }, { assignedTo: { $size: 0 } }],
          }),
          IncomingDocument.countDocuments({
            isDeleted: { $ne: true },
            ocrStatus: { $in: ['pending', 'processing'] },
          }),
          OutgoingDocument.countDocuments({
            isDeleted: { $ne: true },
            ocrStatus: { $in: ['pending', 'processing'] },
          }),
        ]);

      summary.bureauOrdre = {
        todayIncoming,
        todayOutgoing,
        unroutedIncoming,
        activeOcrJobs: activeOcrIncoming + activeOcrOutgoing,
      };
    } else if (isRHAdmin) {
      const [
        activePersonnel,
        pendingAccounts,
        todayPresent,
        todayAbsent,
        pendingDeclarations,
      ] = await Promise.all([
        Personnel.countDocuments({ isDeleted: { $ne: true }, statut: 'actif' }),
        Personnel.countDocuments({ isDeleted: { $ne: true }, statut: 'en_attente' }),
        Attendance.countDocuments({
          date: { $gte: startOfToday, $lte: endOfToday },
          statut: 'present',
        }),
        Attendance.countDocuments({
          date: { $gte: startOfToday, $lte: endOfToday },
          statut: 'absent',
        }),
        AttendanceDeclaration.countDocuments({ validationStatus: 'en_attente' }),
      ]);

      summary.hr = {
        activePersonnel,
        pendingAccounts,
        todayAttendance: {
          present: todayPresent,
          absent: todayAbsent,
        },
        pendingDeclarations,
      };
    } else if (role === 'Director') {
      const unansweredFilter = {
        isDeleted: { $ne: true },
        $or: [{ answer: null }, { answer: { $exists: false } }],
      };

      const [
        incomingTotal,
        outgoingTotal,
        unansweredIncoming,
        unansweredUrgentIncoming,
        activeDepartments,
      ] = await Promise.all([
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

      summary.director = {
        incomingTotal,
        outgoingTotal,
        unansweredIncoming,
        unansweredUrgentIncoming,
        activeDepartments,
      };
    } else {
      // AdminDepartment (non-RH) or User — strict department + user scoping
      const deptUnansweredFilter = activeDeptId
        ? {
            isDeleted: { $ne: true },
            'assignedTo.id': activeDeptId,
            $or: [{ answer: null }, { answer: { $exists: false } }],
          }
        : null;

      const userId = req.user?._id;
      const inboxFilter = userId
        ? {
            'recipients.user': userId,
            deletedBy: { $ne: userId },
            permanentlyDeletedBy: { $ne: userId },
          }
        : null;

      const [unansweredIncoming, urgentIncoming, unreadMessagesCount, recentMsgDocs] =
        await Promise.all([
          deptUnansweredFilter ? IncomingDocument.countDocuments(deptUnansweredFilter) : 0,
          deptUnansweredFilter
            ? IncomingDocument.countDocuments({
                ...deptUnansweredFilter,
                activity: { $nin: [null, ''] },
                dateActivity: { $ne: null, $lte: tomorrowEnd },
              })
            : 0,
          userId
            ? Message.countDocuments({
                recipients: { $elemMatch: { user: userId, read: false } },
                deletedBy: { $ne: userId },
                permanentlyDeletedBy: { $ne: userId },
              })
            : 0,
          inboxFilter
            ? Message.find(inboxFilter)
                .sort({ createdAt: -1 })
                .limit(4)
                .select('subject priority sender recipients createdAt')
                .populate('sender', 'username role')
                .lean()
            : [],
        ]);

      summary.department = {
        departmentId: activeDeptId,
        departmentName: activeDeptName,
        unansweredIncoming,
        urgentIncoming,
        unreadMessagesCount,
        myPersonnelId: toId(req.user?.personnelId),
        recentMessages: (recentMsgDocs || []).map((msg) => {
          const recipientEntry = Array.isArray(msg.recipients)
            ? msg.recipients.find((r) => toId(r.user) === toId(userId))
            : null;
          return {
            _id: String(msg._id),
            subject: msg.subject || '',
            priority: msg.priority || 'normal',
            senderUsername: msg.sender?.username || '',
            read: Boolean(recipientEntry?.read),
            createdAt: msg.createdAt,
          };
        }),
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
