const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const PresenceSettings = require('../models/PresenceSettings');
const LeaveReason = require('../models/LeaveReason');
const Personnel = require('../models/Personnel');
const Department = require('../models/Department');
const { logAuditAction } = require('../utils/auditLogger');

// 4 Motifs par défaut qui impactent le solde annuel de 45 jours
const DEFAULT_DEDUCTIBLE_MOTIFS = [
  'conge_annuel',
  'absence_injustifiee',
  'recuperation',
  'conge_exceptionnel'
];

/**
 * Normalise une date au début de journée UTC (00:00:00.000)
 */
const parseDateToUTCStartOfDay = (dateInput) => {
  if (!dateInput) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error('Format de date invalide');
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

/**
 * Retourne l'intervalle UTC pour une journée complète
 */
const getUTCDayRange = (dateInput) => {
  const start = parseDateToUTCStartOfDay(dateInput);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
};

// @desc    Obtenir la feuille de présence quotidienne (collectif)
// @route   GET /api/attendance/daily
// @access  Private (Admin, SuperAdmin, AdminDepartment)
const getDailyAttendance = async (req, res, next) => {
  try {
    const { date, departmentId } = req.query;

    let targetDate;
    try {
      targetDate = parseDateToUTCStartOfDay(date);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Date invalide' });
    }

    const { start, end } = getUTCDayRange(targetDate);

    // Filtrage départemental : forcer le département de rattachement pour un Chef de département
    let effectiveDepartmentId = departmentId;
    if (req.userRestrictedToDepartment) {
      effectiveDepartmentId = req.userRestrictedToDepartment;
    }

    // Filtrer les personnels actifs
    const personnelFilter = {
      statut: { $ne: 'inactif' }
    };
    if (effectiveDepartmentId) {
      personnelFilter.activeDepartment = effectiveDepartmentId;
    }

    const personnels = await Personnel.find(personnelFilter)
      .select('nom prenom cin poste activeDepartment photo statut')
      .populate('activeDepartment', 'name code')
      .sort({ nom: 1, prenom: 1 })
      .lean();

    const personnelIds = personnels.map(p => p._id);

    // Récupérer les enregistrements de présence existants pour cette date
    const attendances = await Attendance.find({
      personnelId: { $in: personnelIds },
      date: { $gte: start, $lte: end }
    }).lean();

    const attendanceMap = new Map();
    attendances.forEach(a => {
      attendanceMap.set(a.personnelId.toString(), a);
    });

    // Associer chaque personnel à sa présence du jour (ou null si non encore saisie)
    const data = personnels.map(personnel => ({
      personnel,
      attendance: attendanceMap.get(personnel._id.toString()) || null
    }));

    return res.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      departmentId: effectiveDepartmentId || null,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enregistrer ou mettre à jour un lot de présences (saisie collective)
// @route   POST /api/attendance/batch
// @access  Private (Admin, SuperAdmin, AdminDepartment)
const saveBatchAttendance = async (req, res, next) => {
  try {
    const { date, entries } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'La date est requise' });
    }

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: 'La liste des entrées est requise' });
    }

    let targetDate;
    try {
      targetDate = parseDateToUTCStartOfDay(date);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Date invalide' });
    }

    const year = targetDate.getUTCFullYear();
    const settings = await PresenceSettings.findOne({ annee: year }).lean();
    const motifsDeductibles = settings?.motifsDeductibles || DEFAULT_DEDUCTIBLE_MOTIFS;

    // Vérification des autorisations de saisie temporelle (autoriserSaisieFuture et autoriserSaisieRetroactive)
    const autoriserSaisieFuture = settings ? settings.autoriserSaisieFuture !== false : true;
    const autoriserSaisieRetroactive = settings ? settings.autoriserSaisieRetroactive !== false : true;

    const todayStr = new Date().toISOString().split('T')[0];
    const defaultDateStr = targetDate.toISOString().split('T')[0];

    for (const entry of entries) {
      let entryDateStr = defaultDateStr;
      if (entry.date) {
        try {
          entryDateStr = parseDateToUTCStartOfDay(entry.date).toISOString().split('T')[0];
        } catch (err) {
          entryDateStr = defaultDateStr;
        }
      }

      if (!autoriserSaisieFuture && entryDateStr > todayStr) {
        return res.status(403).json({
          success: false,
          message: 'غير مسموح بتسجيل الحضور لتواريخ مستقبلية'
        });
      }

      if (!autoriserSaisieRetroactive && entryDateStr < todayStr) {
        return res.status(403).json({
          success: false,
          message: 'غير مسموح بتسجيل الحضور لتواريخ سابقة'
        });
      }
    }

    // Charger les types de motifs pour correspondance dynamique par code
    const leaveReasons = await LeaveReason.find().lean();
    const leaveReasonMap = new Map();
    leaveReasons.forEach(lr => leaveReasonMap.set(lr.code, lr));

    // Récupérer les fiches de personnel pour vérification des départements
    const personnelIds = entries.map(e => e.personnelId);
    const personnels = await Personnel.find({ _id: { $in: personnelIds } }).lean();
    const personnelMap = new Map();
    personnels.forEach(p => personnelMap.set(p._id.toString(), p));

    // Vérification de sécurité stricte : un Chef de département ne peut modifier que son département
    if (req.userRestrictedToDepartment) {
      const restrictedDeptStr = req.userRestrictedToDepartment.toString();
      for (const entry of entries) {
        const agent = personnelMap.get(entry.personnelId.toString());
        if (!agent) {
          return res.status(404).json({
            success: false,
            message: `Personnel introuvable pour l'identifiant ${entry.personnelId}`
          });
        }
        const agentDeptStr = agent.activeDepartment ? agent.activeDepartment.toString() : '';
        if (agentDeptStr !== restrictedDeptStr) {
          return res.status(403).json({
            success: false,
            message: 'Opération refusée : certains agents ne font pas partie de votre département'
          });
        }
      }
    }

    let savedCount = 0;
    for (const entry of entries) {
      const agent = personnelMap.get(entry.personnelId.toString());
      if (!agent) continue;

      const isPresent = entry.statut === 'present';
      const motif = isPresent ? null : (entry.motif || null);
      
      let impacteSolde = false;
      let leaveReasonId = null;

      if (!isPresent && motif) {
        const foundReason = leaveReasonMap.get(motif);
        if (foundReason) {
          impacteSolde = Boolean(foundReason.impacteSolde);
          leaveReasonId = foundReason._id;
        } else {
          // Fallback rétrocompatibilité
          impacteSolde = motifsDeductibles.includes(motif);
          leaveReasonId = null;
        }
      }

      const heureArrivee = isPresent ? (entry.heureArrivee || null) : null;
      const detailsMotif = isPresent ? {} : (entry.detailsMotif || {});
      const departmentId = agent.activeDepartment || req.userRestrictedToDepartment;

      await Attendance.findOneAndUpdate(
        {
          personnelId: entry.personnelId,
          date: targetDate
        },
        {
          $set: {
            departmentId,
            statut: isPresent ? 'present' : 'absent',
            motif,
            leaveReasonId,
            impacteSolde,
            detailsMotif,
            heureArrivee,
            modifiePar: req.user._id
          },
          $setOnInsert: {
            saisiPar: req.user._id
          }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );
      savedCount++;
    }

    // Journalisation dans AuditLog
    await logAuditAction(
      'attendance_batch_save',
      'Attendance',
      targetDate.toISOString().split('T')[0],
      req.user._id,
      req.user,
      {
        date: targetDate.toISOString().split('T')[0],
        count: savedCount,
        departmentId: req.userRestrictedToDepartment || null
      }
    );

    return res.json({
      success: true,
      message: `${savedCount} présence(s) enregistrée(s) avec succès`,
      count: savedCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir le calendrier d'un agent (Self-service / Consultation)
// @route   GET /api/attendance/calendar/:personnelId
// @access  Private (Agent concerné, Chef de dépt, Admin/AdminRH)
const getPersonnelCalendar = async (req, res, next) => {
  try {
    const { personnelId } = req.params;
    const { year, month } = req.query;

    const personnel = await Personnel.findById(personnelId).lean();
    if (!personnel) {
      return res.status(404).json({ success: false, message: 'Personnel introuvable' });
    }

    // Contrôle des droits d'accès
    if (req.user.role === 'User') {
      const isOwnPersonnel = (req.user.personnelId && req.user.personnelId.toString() === personnelId) ||
                             (personnel.userId && personnel.userId.toString() === req.user._id.toString());
      if (!isOwnPersonnel) {
        return res.status(403).json({ success: false, message: 'Accès refusé au calendrier d\'un autre agent' });
      }
    } else if (req.userRestrictedToDepartment) {
      const agentDept = personnel.activeDepartment ? personnel.activeDepartment.toString() : '';
      if (agentDept !== req.userRestrictedToDepartment.toString()) {
        return res.status(403).json({ success: false, message: 'Accès refusé aux agents hors de votre département' });
      }
    }

    const targetYear = parseInt(year, 10) || new Date().getUTCFullYear();
    let start, end;

    if (month) {
      const m = parseInt(month, 10);
      if (isNaN(m) || m < 1 || m > 12) {
        return res.status(400).json({ success: false, message: 'Mois invalide (1-12)' });
      }
      start = new Date(Date.UTC(targetYear, m - 1, 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(targetYear, m, 0, 23, 59, 59, 999));
    } else {
      start = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
    }

    const attendances = await Attendance.find({
      personnelId,
      date: { $gte: start, $lte: end }
    })
      .sort({ date: 1 })
      .populate('detailsMotif.formationDocumentId', 'label reference dateDocument')
      .lean();

    return res.json({
      success: true,
      personnelId,
      year: targetYear,
      month: month ? parseInt(month, 10) : null,
      count: attendances.length,
      data: attendances
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculer le solde de congés d'un agent pour une année donnée
// @route   GET /api/attendance/balance/:personnelId
// @access  Private (Agent concerné, Chef de dépt, Admin/AdminRH)
const getPersonnelBalance = async (req, res, next) => {
  try {
    const { personnelId } = req.params;
    const { year } = req.query;

    const personnel = await Personnel.findById(personnelId).lean();
    if (!personnel) {
      return res.status(404).json({ success: false, message: 'Personnel introuvable' });
    }

    // Contrôle des droits
    if (req.user.role === 'User') {
      const isOwnPersonnel = (req.user.personnelId && req.user.personnelId.toString() === personnelId) ||
                             (personnel.userId && personnel.userId.toString() === req.user._id.toString());
      if (!isOwnPersonnel) {
        return res.status(403).json({ success: false, message: 'Accès refusé au solde d\'un autre agent' });
      }
    } else if (req.userRestrictedToDepartment) {
      const agentDept = personnel.activeDepartment ? personnel.activeDepartment.toString() : '';
      if (agentDept !== req.userRestrictedToDepartment.toString()) {
        return res.status(403).json({ success: false, message: 'Accès refusé' });
      }
    }

    const targetYear = parseInt(year, 10) || new Date().getUTCFullYear();

    let settings = await PresenceSettings.findOne({ annee: targetYear }).lean();
    if (!settings) {
      settings = {
        soldeAnnuelDefaut: 45,
        motifsDeductibles: DEFAULT_DEDUCTIBLE_MOTIFS
      };
    }

    const start = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));

    // 1. Récupérer les LeaveReason avec impacteSolde = true ET isActive = true
    const activeDeductibleReasons = await LeaveReason.find({
      impacteSolde: true,
      isActive: true
    }).lean();

    // 2. Construire une liste de codes déductibles
    const deductibleCodesSet = new Set(activeDeductibleReasons.map(r => r.code));

    // 3. Ajouter en fallback les codes depuis PresenceSettings.motifsDeductibles (pour rétrocompatibilité)
    const fallbackMotifs = settings.motifsDeductibles || DEFAULT_DEDUCTIBLE_MOTIFS;
    fallbackMotifs.forEach(code => deductibleCodesSet.add(code));
    const codesDeductibles = Array.from(deductibleCodesSet);

    // 4. Compter les Attendance avec : statut = 'absent', impacteSolde = true, motif dans la liste des codes déductibles
    const deductedAttendances = await Attendance.find({
      personnelId,
      date: { $gte: start, $lte: end },
      statut: 'absent',
      impacteSolde: true,
      motif: { $in: codesDeductibles }
    }).lean();

    const totalDays = settings.soldeAnnuelDefaut || 45;
    const usedDays = deductedAttendances.length;
    const remainingDays = totalDays - usedDays;

    // Répartition par motif déductible
    const byMotif = {
      conge_annuel: 0,
      absence_injustifiee: 0,
      recuperation: 0,
      conge_exceptionnel: 0
    };

    deductedAttendances.forEach(a => {
      if (a.motif) {
        byMotif[a.motif] = (byMotif[a.motif] || 0) + 1;
      }
    });

    return res.json({
      success: true,
      data: {
        personnelId,
        year: targetYear,
        totalDays,
        usedDays,
        remainingDays,
        byMotif
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les données du rapport journalier (présents, absents, non-saisis)
// @route   GET /api/attendance/report/daily
// @access  Private (Admin, SuperAdmin, AdminDepartment)
const getDailyReport = async (req, res, next) => {
  try {
    const { date, departmentId } = req.query;

    let targetDate;
    try {
      targetDate = parseDateToUTCStartOfDay(date);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Date invalide' });
    }

    const { start, end } = getUTCDayRange(targetDate);

    let effectiveDepartmentId = departmentId;
    if (req.userRestrictedToDepartment) {
      effectiveDepartmentId = req.userRestrictedToDepartment;
    }

    const personnelFilter = { statut: { $ne: 'inactif' } };
    if (effectiveDepartmentId) {
      personnelFilter.activeDepartment = effectiveDepartmentId;
    }

    const personnels = await Personnel.find(personnelFilter)
      .select('nom prenom cin poste activeDepartment photo')
      .populate('activeDepartment', 'name code')
      .sort({ nom: 1, prenom: 1 })
      .lean();

    const personnelIds = personnels.map(p => p._id);

    const attendances = await Attendance.find({
      personnelId: { $in: personnelIds },
      date: { $gte: start, $lte: end }
    }).lean();

    const attendanceMap = new Map();
    attendances.forEach(a => attendanceMap.set(a.personnelId.toString(), a));

    const presents = [];
    const absents = [];
    const nonSaisis = [];

    personnels.forEach(p => {
      const att = attendanceMap.get(p._id.toString());
      if (!att) {
        nonSaisis.push({ personnel: p });
      } else if (att.statut === 'present') {
        presents.push({ personnel: p, attendance: att });
      } else {
        absents.push({ personnel: p, attendance: att });
      }
    });

    return res.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        departmentId: effectiveDepartmentId || null,
        totalCount: personnels.length,
        presentsCount: presents.length,
        absentsCount: absents.length,
        nonSaisisCount: nonSaisis.length,
        presents,
        absents,
        nonSaisis
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les données du rapport mensuel (récapitulatif par agent)
// @route   GET /api/attendance/report/monthly
// @access  Private (Admin, SuperAdmin, AdminDepartment)
const getMonthlyReport = async (req, res, next) => {
  try {
    const { year, month, departmentId } = req.query;

    const targetYear = parseInt(year, 10) || new Date().getUTCFullYear();
    const targetMonth = parseInt(month, 10) || (new Date().getUTCMonth() + 1);

    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ success: false, message: 'Mois invalide (1-12)' });
    }

    const start = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    let effectiveDepartmentId = departmentId;
    if (req.userRestrictedToDepartment) {
      effectiveDepartmentId = req.userRestrictedToDepartment;
    }

    const personnelFilter = { statut: { $ne: 'inactif' } };
    if (effectiveDepartmentId) {
      personnelFilter.activeDepartment = effectiveDepartmentId;
    }

    const personnels = await Personnel.find(personnelFilter)
      .select('nom prenom cin poste activeDepartment')
      .populate('activeDepartment', 'name code')
      .sort({ nom: 1, prenom: 1 })
      .lean();

    const personnelIds = personnels.map(p => p._id);

    const attendances = await Attendance.find({
      personnelId: { $in: personnelIds },
      date: { $gte: start, $lte: end }
    }).lean();

    // Grouper les présences par agent
    const attendancesByPersonnel = new Map();
    attendances.forEach(a => {
      const key = a.personnelId.toString();
      if (!attendancesByPersonnel.has(key)) {
        attendancesByPersonnel.set(key, []);
      }
      attendancesByPersonnel.get(key).push(a);
    });

    const records = personnels.map(p => {
      const list = attendancesByPersonnel.get(p._id.toString()) || [];
      let joursPresents = 0;
      let joursAbsents = 0;
      const parMotif = {};

      list.forEach(a => {
        if (a.statut === 'present') {
          joursPresents++;
        } else {
          joursAbsents++;
          if (a.motif) {
            parMotif[a.motif] = (parMotif[a.motif] || 0) + 1;
          }
        }
      });

      return {
        personnel: p,
        joursPresents,
        joursAbsents,
        parMotif
      };
    });

    return res.json({
      success: true,
      data: {
        year: targetYear,
        month: targetMonth,
        departmentId: effectiveDepartmentId || null,
        totalPersonnel: personnels.length,
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les données du rapport annuel (solde, consommations, motifs)
// @route   GET /api/attendance/report/yearly
// @access  Private (Admin, SuperAdmin, AdminDepartment)
const getYearlyReport = async (req, res, next) => {
  try {
    const { year, departmentId } = req.query;

    const targetYear = parseInt(year, 10) || new Date().getUTCFullYear();

    let settings = await PresenceSettings.findOne({ annee: targetYear }).lean();
    const soldeAnnuelDefaut = settings?.soldeAnnuelDefaut || 45;

    const start = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));

    let effectiveDepartmentId = departmentId;
    if (req.userRestrictedToDepartment) {
      effectiveDepartmentId = req.userRestrictedToDepartment;
    }

    const personnelFilter = { statut: { $ne: 'inactif' } };
    if (effectiveDepartmentId) {
      personnelFilter.activeDepartment = effectiveDepartmentId;
    }

    const personnels = await Personnel.find(personnelFilter)
      .select('nom prenom cin poste activeDepartment')
      .populate('activeDepartment', 'name code')
      .sort({ nom: 1, prenom: 1 })
      .lean();

    const personnelIds = personnels.map(p => p._id);

    const attendances = await Attendance.find({
      personnelId: { $in: personnelIds },
      date: { $gte: start, $lte: end }
    }).lean();

    const attendancesByPersonnel = new Map();
    attendances.forEach(a => {
      const key = a.personnelId.toString();
      if (!attendancesByPersonnel.has(key)) {
        attendancesByPersonnel.set(key, []);
      }
      attendancesByPersonnel.get(key).push(a);
    });

    const records = personnels.map(p => {
      const list = attendancesByPersonnel.get(p._id.toString()) || [];
      let joursPresents = 0;
      let joursAbsents = 0;
      let joursDeduits = 0;
      const parMotif = {};

      list.forEach(a => {
        if (a.statut === 'present') {
          joursPresents++;
        } else {
          joursAbsents++;
          if (a.impacteSolde) {
            joursDeduits++;
          }
          if (a.motif) {
            parMotif[a.motif] = (parMotif[a.motif] || 0) + 1;
          }
        }
      });

      const soldeInitial = soldeAnnuelDefaut;
      const soldeRestant = soldeInitial - joursDeduits;

      return {
        personnel: p,
        soldeInitial,
        joursDeduits,
        soldeRestant,
        joursPresents,
        joursAbsents,
        parMotif
      };
    });

    return res.json({
      success: true,
      data: {
        year: targetYear,
        departmentId: effectiveDepartmentId || null,
        soldeAnnuelDefaut,
        totalPersonnel: personnels.length,
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir la configuration des présences pour une année
// @route   GET /api/attendance/settings
// @access  Private (Tous les utilisateurs authentifiés)
const getSettings = async (req, res, next) => {
  try {
    const targetYear = parseInt(req.query.year, 10) || new Date().getUTCFullYear();

    let settings = await PresenceSettings.findOne({ annee: targetYear });

    // Si aucune configuration n'existe pour l'année, initialiser avec les valeurs par défaut
    if (!settings) {
      settings = await PresenceSettings.create({
        annee: targetYear,
        soldeAnnuelDefaut: 45,
        motifsDeductibles: DEFAULT_DEDUCTIBLE_MOTIFS,
        joursWeekend: [0, 6],
        joursFeries: [],
        autoriserSaisieFuture: true,
        autoriserSaisieRetroactive: true
      });
    }

    return res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour la configuration des présences
// @route   PUT /api/attendance/settings
// @access  Private (Admin, SuperAdmin, AdminRH)
const updateSettings = async (req, res, next) => {
  try {
    // Seul Admin, SuperAdmin ou AdminDepartment rattaché au RH peut modifier
    if (!req.isAdminRH && req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'Administrateur RH peut modifier les paramètres de présence'
      });
    }

    const {
      year,
      soldeAnnuelDefaut,
      motifsDeductibles,
      joursWeekend,
      joursFeries,
      autoriserSaisieFuture,
      autoriserSaisieRetroactive
    } = req.body;

    const targetYear = parseInt(year, 10) || new Date().getUTCFullYear();

    let settings = await PresenceSettings.findOne({ annee: targetYear });

    const oldBalance = settings ? settings.soldeAnnuelDefaut : 45;
    const newBalance = soldeAnnuelDefaut !== undefined ? Number(soldeAnnuelDefaut) : oldBalance;

    // Si le solde change en cours d'année, consigner obligatoirement dans AuditLog
    if (settings && oldBalance !== newBalance) {
      await logAuditAction(
        'presence_settings_balance_change',
        'PresenceSettings',
        targetYear.toString(),
        req.user._id,
        req.user,
        {
          year: targetYear,
          oldBalance,
          newBalance,
          comment: 'Modification du solde annuel de base des présences'
        }
      );
    }

    const updateData = {
      modifiePar: req.user._id
    };

    if (soldeAnnuelDefaut !== undefined) updateData.soldeAnnuelDefaut = Number(soldeAnnuelDefaut);
    if (motifsDeductibles !== undefined && Array.isArray(motifsDeductibles)) updateData.motifsDeductibles = motifsDeductibles;
    if (joursWeekend !== undefined && Array.isArray(joursWeekend)) updateData.joursWeekend = joursWeekend;
    if (joursFeries !== undefined && Array.isArray(joursFeries)) updateData.joursFeries = joursFeries;
    if (autoriserSaisieFuture !== undefined) updateData.autoriserSaisieFuture = Boolean(autoriserSaisieFuture);
    if (autoriserSaisieRetroactive !== undefined) updateData.autoriserSaisieRetroactive = Boolean(autoriserSaisieRetroactive);

    settings = await PresenceSettings.findOneAndUpdate(
      { annee: targetYear },
      { $set: updateData },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return res.json({
      success: true,
      message: 'Paramètres de présence mis à jour avec succès',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDailyAttendance,
  saveBatchAttendance,
  getPersonnelCalendar,
  getPersonnelBalance,
  getDailyReport,
  getMonthlyReport,
  getYearlyReport,
  getSettings,
  updateSettings
};
