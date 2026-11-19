const mongoose = require('mongoose');
const Personnel = require('../../models/Personnel');
const Attendance = require('../../models/Attendance');
const Department = require('../../models/Department');
const OrganizationSettings = require('../../models/OrganizationSettings');
const LeaveReason = require('../../models/LeaveReason');
const PresenceSettings = require('../../models/PresenceSettings');

/**
 * Détermine si l'utilisateur peut consulter tous les départements
 * (Admin, Director ou AdminDepartment rattaché au département RH)
 */
const canUserSeeAllDepartments = async (req) => {
  if (!req.user) return false;
  const role = req.user.role;
  if (role === 'Admin' || role === 'Director') {
    return true;
  }
  if (role === 'AdminDepartment') {
    if (req.isAdminRH === true) return true;
    try {
      const settings = await OrganizationSettings.findOne().lean();
      const rhDeptId = settings?.rhDepartmentId?.toString();
      const userDept = req.user.activeDepartment;
      const userDeptId = (userDept?._id || userDept)?.toString();
      return Boolean(rhDeptId && userDeptId && userDeptId === rhDeptId);
    } catch (_err) {
      return false;
    }
  }
  return false;
};

/**
 * Retourne le symbole court affiché dans la grille papier (31 colonnes)
 */
const getDayCodeSymbol = (statut, motif) => {
  if (statut === 'present') return 'ح';
  if (!motif) return 'غ';

  const symbolMap = {
    conge_annuel: 'ع.س',
    conge_maladie: 'م',
    conge_exceptionnel: 'ع.إ',
    conge_maternite: 'أ',
    conge_paternite: 'أ',
    recuperation: 'إس',
    mission: 'م.ع',
    formation: 'ت',
    service: 'خ',
    absence_injustifiee: 'غ',
    detachement_externe: 'إل',
    disponibilite: 'إس.ت',
    greve: 'إض',
    sans_solde: 'ب.ر'
  };

  return symbolMap[motif] || 'غ';
};

/**
 * @desc    Générer les données structurées de la fiche de présence mensuelle (grille 1..31)
 * @route   GET /api/hr/attendance/monthly-report
 * @access  Private (Admin, Director, AdminDepartment via checkAttendanceAccess)
 */
const getMonthlyAttendanceSheet = async (req, res, next) => {
  try {
    const { year, month, departmentId } = req.query;

    const now = new Date();
    const targetYear = year !== undefined ? parseInt(year, 10) : now.getUTCFullYear();
    const targetMonth = month !== undefined ? parseInt(month, 10) : now.getUTCMonth() + 1;

    if (isNaN(targetYear) || targetYear < 1900 || targetYear > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Année invalide'
      });
    }

    if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Mois invalide (1-12)'
      });
    }

    const canSeeAll = await canUserSeeAllDepartments(req);
    let effectiveDepartmentId = null;

    if (!canSeeAll) {
      effectiveDepartmentId =
        req.userRestrictedToDepartment ||
        req.user.activeDepartment?._id ||
        req.user.activeDepartment ||
        null;
    } else if (departmentId && departmentId !== 'all') {
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Identifiant de département invalide'
        });
      }
      effectiveDepartmentId = departmentId;
    }

    const daysInMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    const start = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    const personnelFilter = { isDeleted: { $ne: true } };
    if (effectiveDepartmentId) {
      personnelFilter.activeDepartment = effectiveDepartmentId;
    }

    const [personnels, departmentInfo, orgSettings, leaveReasons, presenceSettings] = await Promise.all([
      Personnel.find(personnelFilter)
        .select('nom prenom cin poste posteActuel numeroUnite numeroArmee activeDepartment statut')
        .populate('activeDepartment', 'name')
        .sort({ nom: 1, prenom: 1 })
        .lean(),
      effectiveDepartmentId
        ? Department.findById(effectiveDepartmentId).select('name').lean()
        : Promise.resolve(null),
      OrganizationSettings.findOne().select('nomAdministration logoAdministration').lean(),
      LeaveReason.find({ isActive: true }).sort({ order: 1 }).lean(),
      PresenceSettings.findOne({ annee: targetYear }).lean()
    ]);

    const personnelIds = personnels.map((p) => p._id);

    const attendances =
      personnelIds.length > 0
        ? await Attendance.find({
            personnelId: { $in: personnelIds },
            date: { $gte: start, $lte: end }
          })
            .select('personnelId date statut motif leaveReasonId impacteSolde heureArrivee')
            .lean()
        : [];

    const leaveReasonByCode = new Map();
    const leaveReasonById = new Map();
    leaveReasons.forEach((lr) => {
      if (lr.code) leaveReasonByCode.set(lr.code, lr);
      if (lr._id) leaveReasonById.set(lr._id.toString(), lr);
    });

    const attendancesByPersonnel = new Map();
    attendances.forEach((att) => {
      const key = att.personnelId.toString();
      if (!attendancesByPersonnel.has(key)) {
        attendancesByPersonnel.set(key, []);
      }
      attendancesByPersonnel.get(key).push(att);
    });

    const records = personnels.map((p) => {
      const list = attendancesByPersonnel.get(p._id.toString()) || [];
      const days = {};
      const byMotif = {};

      let present = 0;
      let absent = 0;
      let conge = 0;
      let missionFormation = 0;
      let absenceInjustifiee = 0;
      let otherAbsence = 0;
      let deductible = 0;

      list.forEach((a) => {
        const dayNum = new Date(a.date).getUTCDate();
        if (dayNum < 1 || dayNum > daysInMonth) return;

        const reason =
          (a.motif && leaveReasonByCode.get(a.motif)) ||
          (a.leaveReasonId && leaveReasonById.get(a.leaveReasonId.toString())) ||
          null;

        const symbol = getDayCodeSymbol(a.statut, a.motif);

        days[dayNum] = {
          statut: a.statut,
          motif: a.motif || null,
          motifLabelAr: reason?.labelAr || null,
          motifLabelFr: reason?.labelFr || null,
          category: reason?.category || null,
          impacteSolde: Boolean(a.impacteSolde),
          heureArrivee: a.heureArrivee || null,
          symbol
        };

        if (a.statut === 'present') {
          present++;
        } else {
          absent++;
          if (a.impacteSolde) {
            deductible++;
          }
          if (a.motif) {
            byMotif[a.motif] = (byMotif[a.motif] || 0) + 1;
          }

          const category = reason?.category || '';
          if (
            category === 'conge' ||
            (a.motif && a.motif.startsWith('conge_')) ||
            a.motif === 'recuperation'
          ) {
            conge++;
          } else if (
            ['mission', 'formation', 'service'].includes(category) ||
            ['mission', 'formation', 'service'].includes(a.motif)
          ) {
            missionFormation++;
          } else if (a.motif === 'absence_injustifiee') {
            absenceInjustifiee++;
          } else {
            otherAbsence++;
          }
        }
      });

      const recordedCount = Object.keys(days).length;

      return {
        personnel: p,
        days,
        byMotif,
        totals: {
          present,
          absent,
          conge,
          missionFormation,
          absenceInjustifiee,
          otherAbsence,
          deductible,
          nonRecorded: Math.max(0, daysInMonth - recordedCount)
        }
      };
    });

    return res.json({
      success: true,
      data: {
        year: targetYear,
        month: targetMonth,
        daysInMonth,
        department: departmentInfo
          ? { _id: departmentInfo._id, name: departmentInfo.name }
          : null,
        organization: {
          nomAdministration: orgSettings?.nomAdministration || '',
          logoAdministration: orgSettings?.logoAdministration || ''
        },
        weekendDays: Array.isArray(presenceSettings?.joursWeekend)
          ? presenceSettings.joursWeekend
          : [0, 6],
        holidays: Array.isArray(presenceSettings?.joursFeries)
          ? presenceSettings.joursFeries.map((h) => ({
              date: h.date ? new Date(h.date).toISOString().split('T')[0] : null,
              libelle: h.libelle || ''
            }))
          : [],
        leaveReasons: leaveReasons.map((lr) => ({
          code: lr.code,
          labelAr: lr.labelAr,
          labelFr: lr.labelFr || '',
          category: lr.category,
          impacteSolde: Boolean(lr.impacteSolde),
          color: lr.color || '#e2e8f0',
          symbol: getDayCodeSymbol('absent', lr.code)
        })),
        totalPersonnel: personnels.length,
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMonthlyAttendanceSheet
};
