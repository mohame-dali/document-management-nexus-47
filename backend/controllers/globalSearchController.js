const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const Personnel = require('../models/Personnel');
const User = require('../models/User');
const { sanitizeSearchQuery } = require('../utils/regexUtils');

/**
 * Extrait les identifiants de départements autorisés pour l'utilisateur
 */
function resolveUserDepartmentIds(user) {
  if (!user) return [];
  const depts = new Set();

  if (user.activeDepartment) {
    const id = user.activeDepartment._id || user.activeDepartment;
    if (id) depts.add(id.toString());
  }

  if (Array.isArray(user.departments)) {
    user.departments.forEach((d) => {
      const id = d._id || d;
      if (id) depts.add(id.toString());
    });
  }

  return Array.from(depts);
}

/**
 * @desc    Recherche globale multi-modules avec cloisonnement RBAC par département
 * @route   GET /api/search?q=...
 * @access  Private
 */
exports.globalSearch = async (req, res) => {
  try {
    const rawQuery = req.query.q || req.query.query || '';
    if (typeof rawQuery !== 'string' || rawQuery.trim().length < 2) {
      return res.status(200).json({
        success: true,
        data: {
          incoming: [],
          outgoing: [],
          personnel: [],
          users: []
        },
        incoming: [],
        outgoing: [],
        personnel: [],
        users: []
      });
    }

    const trimmed = rawQuery.trim();
    // Sécurité anti-ReDoS : échapper tous les métacaractères Regex
    const safeQuery = sanitizeSearchQuery(trimmed);
    if (!safeQuery) {
      return res.status(200).json({
        success: true,
        data: { incoming: [], outgoing: [], personnel: [], users: [] },
        incoming: [],
        outgoing: [],
        personnel: [],
        users: []
      });
    }

    const regex = new RegExp(safeQuery, 'i');
    const isNum = !isNaN(Number(trimmed)) && trimmed !== '';
    const numVal = isNum ? Number(trimmed) : null;

    // RBAC: Vérification du rôle et des départements
    const currentUser = req.user;
    const isGlobalAdmin = currentUser && ['Admin', 'Director'].includes(currentUser.role);
    const userDeptIds = resolveUserDepartmentIds(currentUser);

    // Si non-admin global et aucun département assigné : cloisonnement strict sans crasher
    const hasDeptAccess = isGlobalAdmin || userDeptIds.length > 0;

    // 1. Requête Courriers entrants
    let incomingPromise;
    if (!hasDeptAccess) {
      incomingPromise = Promise.resolve([]);
    } else {
      const incomingFilter = {
        isDeleted: { $ne: true },
        $or: [
          { subject: regex },
          { correspondenceNumber: regex }
        ]
      };
      if (numVal !== null) {
        incomingFilter.$or.push({ serialNumber: numVal });
      }
      if (!isGlobalAdmin) {
        incomingFilter['assignedTo.id'] = { $in: userDeptIds };
      }
      incomingPromise = IncomingDocument.find(incomingFilter)
        .select('_id serialNumber year subject correspondenceNumber arrivalDate typeDocument assignedTo')
        .sort({ year: -1, serialNumber: -1 })
        .limit(5)
        .lean();
    }

    // 2. Requête Courriers sortants
    let outgoingPromise;
    if (!hasDeptAccess) {
      outgoingPromise = Promise.resolve([]);
    } else {
      const outgoingConditions = [{ subject: regex }, { assignedTo: regex }];
      if (numVal !== null) {
        outgoingConditions.push({ serialNumber: numVal });
      }
      const outgoingFilter = {
        isDeleted: { $ne: true },
        $or: outgoingConditions
      };
      if (!isGlobalAdmin) {
        outgoingFilter.$and = [
          {
            $or: [
              { 'source.id': { $in: userDeptIds } },
              { departmentId: { $in: userDeptIds } }
            ]
          }
        ];
      }
      outgoingPromise = OutgoingDocument.find(outgoingFilter)
        .select('_id serialNumber year subject issueDate typeDocument source')
        .sort({ year: -1, serialNumber: -1 })
        .limit(5)
        .lean();
    }

    // 3. Requête Personnel RH
    let personnelPromise;
    if (!hasDeptAccess) {
      personnelPromise = Promise.resolve([]);
    } else {
      const personnelConditions = [{ nom: regex }, { prenom: regex }, { cin: regex }];
      const personnelFilter = {
        isDeleted: { $ne: true },
        $or: personnelConditions
      };
      if (!isGlobalAdmin) {
        personnelFilter.$and = [
          {
            $or: [
              { activeDepartment: { $in: userDeptIds } },
              { departments: { $in: userDeptIds } }
            ]
          }
        ];
      }
      personnelPromise = Personnel.find(personnelFilter)
        .select('_id nom prenom cin poste activeDepartment photo statut')
        .populate('activeDepartment', 'name')
        .limit(5)
        .lean();
    }

    // 4. Requête Utilisateurs
    let userPromise;
    if (!currentUser) {
      userPromise = Promise.resolve([]);
    } else if (isGlobalAdmin) {
      const userConditions = [{ username: regex }, { role: regex }];
      userPromise = User.find({
        isDeleted: { $ne: true },
        $or: userConditions
      })
        .select('_id username role activeDepartment photo')
        .populate('activeDepartment', 'name')
        .limit(5)
        .lean();
    } else if (userDeptIds.length > 0) {
      const userConditions = [{ username: regex }, { role: regex }];
      userPromise = User.find({
        isDeleted: { $ne: true },
        $and: [
          {
            $or: [
              { activeDepartment: { $in: userDeptIds } },
              { departments: { $in: userDeptIds } }
            ]
          },
          { $or: userConditions }
        ]
      })
        .select('_id username role activeDepartment photo')
        .populate('activeDepartment', 'name')
        .limit(5)
        .lean();
    } else {
      userPromise = Promise.resolve([]);
    }

    const [incoming, outgoing, personnel, users] = await Promise.all([
      incomingPromise.catch(() => []),
      outgoingPromise.catch(() => []),
      personnelPromise.catch(() => []),
      userPromise.catch(() => [])
    ]);

    const result = {
      incoming: incoming || [],
      outgoing: outgoing || [],
      personnel: personnel || [],
      users: users || []
    };

    return res.status(200).json({
      success: true,
      data: result,
      ...result
    });
  } catch (error) {
    console.error('[GlobalSearch Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche globale',
      data: { incoming: [], outgoing: [], personnel: [], users: [] },
      incoming: [],
      outgoing: [],
      personnel: [],
      users: []
    });
  }
};
