const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');

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
