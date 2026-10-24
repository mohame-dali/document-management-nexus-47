const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const Personnel = require('../models/Personnel');
const User = require('../models/User');

/**
 * @desc    Recherche globale multi-modules (courriers entrants/sortants, RH, utilisateurs)
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
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const isNum = !isNaN(Number(trimmed)) && trimmed !== '';
    const numVal = isNum ? Number(trimmed) : null;

    // Requête Courriers entrants
    const incomingConditions = [{ subject: regex }, { correspondenceNumber: regex }];
    if (numVal !== null) {
      incomingConditions.push({ serialNumber: numVal });
    }
    const incomingPromise = IncomingDocument.find({
      isDeleted: { $ne: true },
      $or: incomingConditions
    })
      .select('_id serialNumber year subject correspondenceNumber arrivalDate typeDocument')
      .sort({ year: -1, serialNumber: -1 })
      .limit(5)
      .lean();

    // Requête Courriers sortants
    const outgoingConditions = [{ subject: regex }, { assignedTo: regex }];
    if (numVal !== null) {
      outgoingConditions.push({ serialNumber: numVal });
    }
    const outgoingPromise = OutgoingDocument.find({
      isDeleted: { $ne: true },
      $or: outgoingConditions
    })
      .select('_id serialNumber year subject issueDate typeDocument')
      .sort({ year: -1, serialNumber: -1 })
      .limit(5)
      .lean();

    // Requête Personnel RH
    const personnelConditions = [{ nom: regex }, { prenom: regex }, { cin: regex }];
    const personnelPromise = Personnel.find({
      isDeleted: { $ne: true },
      $or: personnelConditions
    })
      .select('_id nom prenom cin poste activeDepartment photo statut')
      .populate('activeDepartment', 'name')
      .limit(5)
      .lean();

    // Requête Utilisateurs
    const userConditions = [{ username: regex }, { role: regex }];
    const userPromise = User.find({
      isDeleted: { $ne: true },
      $or: userConditions
    })
      .select('_id username role activeDepartment photo')
      .populate('activeDepartment', 'name')
      .limit(5)
      .lean();

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
