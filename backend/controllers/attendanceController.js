const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const PresenceSettings = require('../models/PresenceSettings');
const LeaveReason = require('../models/LeaveReason');
const Personnel = require('../models/Personnel');
const User = require('../models/User');
const { logAuditAction } = require('../utils/auditLogger');
const { extractId, resolveAttendanceDepartmentScope } = require('../utils/attendanceScopeHelper');

// 4 Motifs par défaut qui impactent le solde annuel de 45 jours
const DEFAULT_DEDUCTIBLE_MOTIFS = [
  'conge_annuel',
  'absence_injustifiee',
  'recuperation',
  'conge_exceptionnel'
];

const SYSTEM_MOTIFS = [
  'conge_annuel',
  'absence_injustifiee',
  'recuperation',
  'conge_exceptionnel',
  'conge_maladie',
  'conge_maternite',
  'conge_paternite',
  'formation',
  'mission',
  'service',
  'detachement_externe',
  'disponibilite',
  'greve',
  'sans_solde'
];

const toTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * Table de correspondance detailsMotif (entrée frontend canonique ou alias legacy -> schéma canonique Attendance)
 */
const normalizeDetailsMotif = (raw, fallbackComment = '') => {
  const safeRaw = raw && typeof raw === 'object' ? raw : {};
  let formationDocId = safeRaw.formationDocumentId || null;
  if (formationDocId && typeof formationDocId === 'object' && formationDocId._id) {
    formationDocId = formationDocId._id;
  }
  if (!formationDocId || !mongoose.Types.ObjectId.isValid(String(formationDocId))) {
    formationDocId = null;
  }

  return {
    serviceNom: toTrimmedString(safeRaw.serviceNom ?? safeRaw.nomService),
    missionLieu: toTrimmedString(safeRaw.missionLieu ?? safeRaw.lieuMission),
    missionObjet: toTrimmedString(safeRaw.missionObjet ?? safeRaw.objetMission),
    formationIntitule: toTrimmedString(safeRaw.formationIntitule ?? safeRaw.intituleFormation),
    formationOrganisme: toTrimmedString(safeRaw.formationOrganisme ?? safeRaw.organismeFormation),
    formationDuree: toTrimmedString(safeRaw.formationDuree ?? safeRaw.dureeFormation),
    formationDocumentId: formationDocId,
    commentaire: toTrimmedString(safeRaw.commentaire ?? safeRaw.notes ?? safeRaw.remarks ?? fallbackComment)
  };
};

/**
 * Enrichit detailsMotif en lecture avec les alias attendus par les vues calendrier / rapports
 */
const withDetailsMotifAliases = (attendance) => {
  if (!attendance || !attendance.detailsMotif || typeof attendance.detailsMotif !== 'object') {
    return attendance;
  }
  const d = attendance.detailsMotif;
  const serviceNom = d.serviceNom ?? d.nomService ?? '';
  const missionLieu = d.missionLieu ?? d.lieuMission ?? '';
  const missionObjet = d.missionObjet ?? d.objetMission ?? '';
  const formationIntitule = d.formationIntitule ?? d.intituleFormation ?? '';
  const formationOrganisme = d.formationOrganisme ?? d.organismeFormation ?? '';
  const formationDuree = d.formationDuree ?? d.dureeFormation ?? '';

  return {
    ...attendance,
    detailsMotif: {
      ...d,
      serviceNom,
      missionLieu,
      missionObjet,
      formationIntitule,
      formationOrganisme,
      formationDuree,
      nomService: serviceNom,
      lieuMission: missionLieu,
      objetMission: missionObjet,
      intituleFormation: formationIntitule,
      organismeFormation: formationOrganisme,
      dureeFormation: formationDuree
    }
  };
};

/**
 * Normalise une date au début de journée UTC (00:00:00.000)
 */
const parseDateToUTCStartOfDay = (dateInput) => {
  if (!dateInput) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  }
  const str = String(dateInput).trim();
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    if (
      d.getUTCFullYear() !== year ||
      d.getUTCMonth() !== month - 1 ||
      d.getUTCDate() !== day
    ) {
      throw new Error('Format de date invalide');
    }
    return d;
  }
  const d = new Date(str);
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

/**
 * Construit un Set de dates ISO (YYYY-MM-DD) pour les jours fériés configurés
 */
const getHolidayDateStringsSet = (joursFeries = []) => {
  const set = new Set();
  if (!Array.isArray(joursFeries)) return set;
  for (const jf of joursFeries) {
    const rawDate = jf && typeof jf === 'object' && jf.date ? jf.date : jf;
    if (!rawDate) continue;
    try {
      const utcStart = parseDateToUTCStartOfDay(rawDate);
      set.add(utcStart.toISOString().split('T')[0]);
    } catch {
      // Ignorer les dates fériées invalides
    }
  }
  return set;
};

/**
 * Vérifie si une date tombe un jour de week-end (joursWeekend) ou un jour férié (joursFeries)
 */
const isWeekendOrHoliday = (dateInput, joursWeekend = [0, 6], holidayDatesSet = new Set()) => {
  if (!dateInput) return false;
  let utcStart;
  try {
    utcStart = parseDateToUTCStartOfDay(dateInput);
  } catch {
    return false;
  }
  const weekendDays = Array.isArray(joursWeekend) && joursWeekend.length > 0 ? joursWeekend : [0, 6];
  if (weekendDays.includes(utcStart.getUTCDay())) {
    return true;
  }
  const isoDay = utcStart.toISOString().split('T')[0];
  return holidayDatesSet.has(isoDay);
};

/**
 * Construit le filtre MongoDB sur Personnel.activeDepartment selon le périmètre de l'utilisateur connecté.
 * Retourne { errorStatus, errorMessage, effectiveDepartmentId, personnelFilter, scope }
 */
const applyScopedDepartmentFilter = async (req, requestedDepartmentId) => {
  const scope = await resolveAttendanceDepartmentScope(req);
  const personnelFilter = { isDeleted: { $ne: true } };
  let effectiveDepartmentId = null;

  const hasRequestedDept = Boolean(requestedDepartmentId && requestedDepartmentId !== 'all');

  if (hasRequestedDept) {
    if (!mongoose.Types.ObjectId.isValid(String(requestedDepartmentId))) {
      return {
        errorStatus: 400,
        errorMessage: 'Identifiant de département invalide',
        scope,
      };
    }
    const reqDeptStr = String(requestedDepartmentId);
    if (!scope.isUnrestricted && !scope.allowedDepartmentIds.includes(reqDeptStr)) {
      return {
        errorStatus: 403,
        errorMessage: 'Accès refusé à ce département',
        scope,
      };
    }
    effectiveDepartmentId = reqDeptStr;
    personnelFilter.activeDepartment = reqDeptStr;
  } else if (!scope.isUnrestricted) {
    personnelFilter.activeDepartment =
      scope.allowedDepartmentIds.length > 0
        ? { $in: scope.allowedDepartmentIds }
        : { $in: [] };
  }

  return {
    errorStatus: null,
    errorMessage: null,
    effectiveDepartmentId,
    personnelFilter,
    scope,
  };
};

// @desc    Obtenir la feuille de présence quotidienne (collectif)
// @route   GET /api/attendance/daily
// @access  Private (Admin, Director, AdminDepartment)
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

    const {
      errorStatus,
      errorMessage,
      effectiveDepartmentId,
      personnelFilter,
    } = await applyScopedDepartmentFilter(req, departmentId);

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
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
      attendanceMap.set(a.personnelId.toString(), withDetailsMotifAliases(a));
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

const getDefaultHHMM = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

// @desc    Enregistrer ou mettre à jour un lot de présences (saisie collective)
// @route   POST /api/attendance/batch
// @access  Private (Admin, Director, AdminDepartment)
const saveBatchAttendance = async (req, res, next) => {
  try {
    const { date, entries } = req.body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: 'La liste des entrées est requise' });
    }

    let targetDate = null;
    if (date) {
      try {
        targetDate = parseDateToUTCStartOfDay(date);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Format de date invalide' });
      }
    } else if (entries.some(e => !e.date)) {
      return res.status(400).json({ success: false, message: 'La date est requise' });
    }

    const settingsByYear = new Map();
    const getSettingsForYear = async (yr) => {
      if (!settingsByYear.has(yr)) {
        const s = await PresenceSettings.findOne({ annee: yr }).lean();
        settingsByYear.set(yr, s || null);
      }
      return settingsByYear.get(yr);
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const resolvedEntryDates = [];

    for (const entry of entries) {
      if (!entry || !entry.personnelId || !mongoose.Types.ObjectId.isValid(String(entry.personnelId))) {
        return res.status(400).json({
          success: false,
          message: 'Identifiant de personnel invalide dans la requête'
        });
      }

      let entryDate;
      try {
        entryDate = entry.date ? parseDateToUTCStartOfDay(entry.date) : targetDate;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: `Date invalide pour l'entrée (${entry.date})`
        });
      }

      if (!entryDate) {
        return res.status(400).json({ success: false, message: 'La date est requise' });
      }

      resolvedEntryDates.push(entryDate);

      const entryYear = entryDate.getUTCFullYear();
      const settings = await getSettingsForYear(entryYear);
      const autoriserSaisieFuture = settings ? settings.autoriserSaisieFuture !== false : true;
      const autoriserSaisieRetroactive = settings ? settings.autoriserSaisieRetroactive !== false : true;
      const entryDateStr = entryDate.toISOString().split('T')[0];

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

    // Charger les types de motifs pour correspondance dynamique par code ou ID
    const leaveReasons = await LeaveReason.find().lean();
    const leaveReasonByCode = new Map();
    const leaveReasonById = new Map();
    leaveReasons.forEach(lr => {
      if (lr.code) {
        leaveReasonByCode.set(String(lr.code).trim().toLowerCase(), lr);
      }
      if (lr._id) {
        leaveReasonById.set(lr._id.toString(), lr);
      }
    });

    // Récupérer les fiches de personnel actives (non supprimées) pour vérification des départements
    const personnelIds = entries.map(e => e.personnelId);
    const personnels = await Personnel.find({
      _id: { $in: personnelIds },
      isDeleted: { $ne: true }
    }).lean();
    const personnelMap = new Map();
    personnels.forEach(p => personnelMap.set(p._id.toString(), p));

    // Charger d'éventuels Users liés pour fallback de département si activeDepartment est null
    const linkedUsers = await User.find({
      $or: [
        { personnelId: { $in: personnelIds } },
        { _id: { $in: personnels.map(p => p.userId).filter(Boolean) } }
      ],
      isDeleted: { $ne: true }
    })
      .select('_id personnelId role activeDepartment')
      .lean();
    const linkedUserByPersonnelId = new Map();
    linkedUsers.forEach((u) => {
      if (u.personnelId) linkedUserByPersonnelId.set(u.personnelId.toString(), u);
      linkedUserByPersonnelId.set(u._id.toString(), u);
    });

    const scope = await resolveAttendanceDepartmentScope(req);

    const resolveAgentDepartmentId = (agent) => {
      const direct = extractId(agent.activeDepartment);
      if (direct) return direct;
      if (Array.isArray(agent.departments) && agent.departments.length > 0) {
        const firstDept = extractId(agent.departments[0]);
        if (firstDept) return firstDept;
      }
      const linked =
        linkedUserByPersonnelId.get(agent._id.toString()) ||
        (agent.userId ? linkedUserByPersonnelId.get(agent.userId.toString()) : null);
      if (linked) {
        const uDept = extractId(linked.activeDepartment);
        if (uDept) return uDept;
        if (linked.role === 'Director' && scope.bdDeptId) return scope.bdDeptId;
        if (linked.role === 'AdminTuningDesk' && scope.boDeptId) return scope.boDeptId;
      }
      return null;
    };

    // Vérification de sécurité stricte : respect du périmètre départemental
    for (const entry of entries) {
      const agent = personnelMap.get(entry.personnelId.toString());
      if (!agent) {
        return res.status(404).json({
          success: false,
          message: `Personnel introuvable pour l'identifiant ${entry.personnelId}`
        });
      }

      if (!scope.isUnrestricted) {
        const agentDeptStr = resolveAgentDepartmentId(agent);
        const agentDeptList = [
          agentDeptStr,
          ...(Array.isArray(agent.departments) ? agent.departments.map(extractId) : [])
        ].filter(Boolean);
        const hasAllowedDept = agentDeptList.some((dId) => scope.allowedDepartmentIds.includes(dId));
        if (!hasAllowedDept) {
          return res.status(403).json({
            success: false,
            message: 'Opération refusée : certains agents ne font pas partie des départements autorisés'
          });
        }
      }
    }

    const actorId = req.user._id || req.user.id;
    let savedCount = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const entryDate = resolvedEntryDates[i];
      const agent = personnelMap.get(entry.personnelId.toString());
      if (!agent) continue;

      const rawStatus = String(entry.statut ?? entry.status ?? '').trim().toLowerCase();
      let isPresent;
      let isLateAlias = false;

      if (rawStatus === 'present') {
        isPresent = true;
      } else if (rawStatus === 'late') {
        isPresent = true;
        isLateAlias = true;
      } else if (rawStatus === 'absent' || rawStatus === 'leave' || rawStatus === 'leave_mission') {
        isPresent = false;
      } else {
        return res.status(400).json({
          success: false,
          message: `Statut de présence invalide : ${entry.statut ?? entry.status ?? 'vide'}`
        });
      }

      const rawMotifInput = entry.motif ?? entry.leaveType ?? entry.reason ?? null;
      const rawLeaveReasonId =
        entry.leaveReasonId && mongoose.Types.ObjectId.isValid(String(entry.leaveReasonId))
          ? String(entry.leaveReasonId)
          : null;

      let normalizedMotif = !isPresent && rawMotifInput
        ? String(rawMotifInput).trim().toLowerCase()
        : null;

      if (!isPresent && !normalizedMotif && rawLeaveReasonId && leaveReasonById.has(rawLeaveReasonId)) {
        normalizedMotif = String(leaveReasonById.get(rawLeaveReasonId).code).trim().toLowerCase();
      }

      if (!isPresent && !normalizedMotif) {
        normalizedMotif = 'absence_injustifiee';
      }

      if (!isPresent && normalizedMotif) {
        const isKnownReason = leaveReasonByCode.has(normalizedMotif) || SYSTEM_MOTIFS.includes(normalizedMotif);
        if (!isKnownReason) {
          return res.status(400).json({
            success: false,
            message: `Motif d'absence inconnu : ${normalizedMotif}`
          });
        }
      }

      let impacteSolde = false;
      let leaveReasonId = null;

      if (!isPresent && normalizedMotif) {
        const foundReason = leaveReasonByCode.get(normalizedMotif);
        if (foundReason) {
          impacteSolde = Boolean(foundReason.impacteSolde);
          leaveReasonId = foundReason._id;
        } else {
          const settings = await getSettingsForYear(entryDate.getUTCFullYear());
          const motifsDeductibles = settings?.motifsDeductibles || DEFAULT_DEDUCTIBLE_MOTIFS;
          impacteSolde = motifsDeductibles.includes(normalizedMotif);
          leaveReasonId = null;
        }
      }

      const rawArrival = entry.heureArrivee ?? entry.arrivalTime ?? null;
      const trimmedArrival = typeof rawArrival === 'string' && rawArrival.trim() !== '' ? rawArrival.trim() : null;
      const heureArrivee = isPresent ? (trimmedArrival || (isLateAlias ? getDefaultHHMM() : null)) : null;

      const fallbackComment = entry.notes ?? entry.remarks ?? '';
      const presentComment = toTrimmedString(
        entry.detailsMotif?.commentaire ?? entry.detailsMotif?.notes ?? entry.detailsMotif?.remarks ?? fallbackComment
      );
      const detailsMotif = isPresent
        ? (presentComment ? { commentaire: presentComment } : {})
        : normalizeDetailsMotif(entry.detailsMotif, fallbackComment);

      const departmentId =
        resolveAgentDepartmentId(agent) ||
        scope.userDeptId ||
        extractId(req.user.activeDepartment);

      if (!departmentId || !mongoose.Types.ObjectId.isValid(String(departmentId))) {
        return res.status(400).json({
          success: false,
          message: `Aucun département assigné pour l'agent ${agent.nom} ${agent.prenom}`
        });
      }

      const updatePayload = {
        $set: {
          departmentId,
          statut: isPresent ? 'present' : 'absent',
          motif: normalizedMotif,
          leaveReasonId,
          impacteSolde,
          detailsMotif,
          heureArrivee,
          modifiePar: actorId
        },
        $setOnInsert: {
          saisiPar: actorId
        }
      };

      const filterQuery = {
        personnelId: entry.personnelId,
        date: entryDate
      };

      try {
        await Attendance.findOneAndUpdate(
          filterQuery,
          updatePayload,
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            runValidators: true
          }
        );
      } catch (upsertErr) {
        if (upsertErr && upsertErr.code === 11000) {
          await Attendance.findOneAndUpdate(
            filterQuery,
            { $set: updatePayload.$set },
            {
              upsert: false,
              new: true,
              runValidators: true
            }
          );
        } else {
          throw upsertErr;
        }
      }
      savedCount++;
    }

    const auditDateStr = (targetDate || resolvedEntryDates[0]).toISOString().split('T')[0];

    // Journalisation dans AuditLog
    await logAuditAction(
      'attendance_batch_save',
      'Attendance',
      auditDateStr,
      actorId,
      req.user,
      {
        date: auditDateStr,
        count: savedCount,
        departmentId: scope.userDeptId || null
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

    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({ success: false, message: 'Identifiant de personnel invalide' });
    }

    const personnel = await Personnel.findOne({
      _id: personnelId,
      isDeleted: { $ne: true }
    }).lean();
    if (!personnel) {
      return res.status(404).json({ success: false, message: 'Personnel introuvable' });
    }

    // Contrôle des droits d'accès :
    // 1. Si l'utilisateur consulte son propre dossier (self-service), l'accès est toujours autorisé quel que soit son rôle
    const isOwnPersonnel = Boolean(
      (req.user.personnelId && req.user.personnelId.toString() === personnelId) ||
      (personnel.userId && personnel.userId.toString() === req.user._id.toString())
    );

    if (isOwnPersonnel) {
      // Accès accordé pour son propre dossier
    } else if (req.user.role === 'User' || req.user.role === 'AdminTuningDesk') {
      // Un simple agent ou AdminTuningDesk ne peut pas consulter le calendrier d'un tiers
      return res.status(403).json({ success: false, message: 'Accès refusé au calendrier d\'un autre agent' });
    } else {
      const scope = await resolveAttendanceDepartmentScope(req);
      if (!scope.isUnrestricted) {
        const agentDept = extractId(personnel.activeDepartment);
        if (!agentDept || !scope.allowedDepartmentIds.includes(agentDept)) {
          return res.status(403).json({ success: false, message: 'Accès refusé aux agents hors de votre département' });
        }
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

    const formattedAttendances = attendances.map(withDetailsMotifAliases);

    return res.json({
      success: true,
      personnelId,
      year: targetYear,
      month: month ? parseInt(month, 10) : null,
      count: formattedAttendances.length,
      data: formattedAttendances
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

    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({ success: false, message: 'Identifiant de personnel invalide' });
    }

    const personnel = await Personnel.findOne({
      _id: personnelId,
      isDeleted: { $ne: true }
    }).lean();
    if (!personnel) {
      return res.status(404).json({ success: false, message: 'Personnel introuvable' });
    }

    // Contrôle des droits d'accès :
    // 1. Si l'utilisateur consulte son propre solde (self-service), l'accès est toujours autorisé quel que soit son rôle
    const isOwnPersonnel = Boolean(
      (req.user.personnelId && req.user.personnelId.toString() === personnelId) ||
      (personnel.userId && personnel.userId.toString() === req.user._id.toString())
    );

    if (isOwnPersonnel) {
      // Accès accordé pour son propre dossier
    } else if (req.user.role === 'User' || req.user.role === 'AdminTuningDesk') {
      // Un simple agent ou AdminTuningDesk ne peut pas consulter le solde d'un tiers
      return res.status(403).json({ success: false, message: 'Accès refusé au solde d\'un autre agent' });
    } else {
      const scope = await resolveAttendanceDepartmentScope(req);
      if (!scope.isUnrestricted) {
        const agentDept = extractId(personnel.activeDepartment);
        if (!agentDept || !scope.allowedDepartmentIds.includes(agentDept)) {
          return res.status(403).json({ success: false, message: 'Accès refusé' });
        }
      }
    }

    const targetYear = parseInt(year, 10) || new Date().getUTCFullYear();

    let settings = await PresenceSettings.findOne({ annee: targetYear }).lean();
    if (!settings) {
      settings = {
        soldeAnnuelDefaut: 45,
        motifsDeductibles: DEFAULT_DEDUCTIBLE_MOTIFS,
        joursWeekend: [0, 6],
        joursFeries: []
      };
    }

    const weekendDays = Array.isArray(settings.joursWeekend) && settings.joursWeekend.length > 0
      ? settings.joursWeekend
      : [0, 6];
    const holidayDatesSet = getHolidayDateStringsSet(settings.joursFeries);

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
    //    en excluant les jours tombant un week-end ou un jour férié
    const rawDeductedAttendances = await Attendance.find({
      personnelId,
      date: { $gte: start, $lte: end },
      statut: 'absent',
      impacteSolde: true,
      motif: { $in: codesDeductibles }
    }).lean();

    const deductedAttendances = rawDeductedAttendances.filter(
      (a) => !isWeekendOrHoliday(a.date, weekendDays, holidayDatesSet)
    );

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
// @access  Private (Admin, Director, AdminDepartment)
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

    const {
      errorStatus,
      errorMessage,
      effectiveDepartmentId,
      personnelFilter,
    } = await applyScopedDepartmentFilter(req, departmentId);

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
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
    attendances.forEach(a => attendanceMap.set(a.personnelId.toString(), withDetailsMotifAliases(a)));

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
// @access  Private (Admin, Director, AdminDepartment)
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

    const {
      errorStatus,
      errorMessage,
      effectiveDepartmentId,
      personnelFilter,
    } = await applyScopedDepartmentFilter(req, departmentId);

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }

    const totalPersonnel = await Personnel.countDocuments(personnelFilter);
    const hasPaginationParams = req.query.page !== undefined || req.query.limit !== undefined;
    const shouldPaginate = totalPersonnel > 100 || hasPaginationParams;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = shouldPaginate
      ? Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100)
      : Math.max(totalPersonnel, 1);
    const skip = shouldPaginate ? (page - 1) * limit : 0;
    const totalPages = shouldPaginate ? Math.ceil(totalPersonnel / limit) : (totalPersonnel > 0 ? 1 : 0);

    let personnelQuery = Personnel.find(personnelFilter)
      .select('nom prenom cin poste activeDepartment')
      .populate('activeDepartment', 'name code')
      .sort({ nom: 1, prenom: 1 });

    if (shouldPaginate) {
      personnelQuery = personnelQuery.skip(skip).limit(limit);
    }

    const personnels = await personnelQuery.lean();

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
        totalPersonnel,
        page,
        limit,
        totalPages,
        paginated: shouldPaginate,
        pagination: {
          total: totalPersonnel,
          page,
          limit,
          totalPages
        },
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les données du rapport annuel (solde, consommations, motifs)
// @route   GET /api/attendance/report/yearly
// @access  Private (Admin, Director, AdminDepartment)
const getYearlyReport = async (req, res, next) => {
  try {
    const { year, departmentId } = req.query;

    const targetYear = parseInt(year, 10) || new Date().getUTCFullYear();

    let settings = await PresenceSettings.findOne({ annee: targetYear }).lean();
    const soldeAnnuelDefaut = settings?.soldeAnnuelDefaut || 45;
    const weekendDays = Array.isArray(settings?.joursWeekend) && settings.joursWeekend.length > 0
      ? settings.joursWeekend
      : [0, 6];
    const holidayDatesSet = getHolidayDateStringsSet(settings?.joursFeries);

    const start = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));

    const {
      errorStatus,
      errorMessage,
      effectiveDepartmentId,
      personnelFilter,
    } = await applyScopedDepartmentFilter(req, departmentId);

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }

    const totalPersonnel = await Personnel.countDocuments(personnelFilter);
    const hasPaginationParams = req.query.page !== undefined || req.query.limit !== undefined;
    const shouldPaginate = totalPersonnel > 100 || hasPaginationParams;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = shouldPaginate
      ? Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100)
      : Math.max(totalPersonnel, 1);
    const skip = shouldPaginate ? (page - 1) * limit : 0;
    const totalPages = shouldPaginate ? Math.ceil(totalPersonnel / limit) : (totalPersonnel > 0 ? 1 : 0);

    let personnelQuery = Personnel.find(personnelFilter)
      .select('nom prenom cin poste activeDepartment')
      .populate('activeDepartment', 'name code')
      .sort({ nom: 1, prenom: 1 });

    if (shouldPaginate) {
      personnelQuery = personnelQuery.skip(skip).limit(limit);
    }

    const personnels = await personnelQuery.lean();

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
          if (a.impacteSolde && !isWeekendOrHoliday(a.date, weekendDays, holidayDatesSet)) {
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
        totalPersonnel,
        page,
        limit,
        totalPages,
        paginated: shouldPaginate,
        pagination: {
          total: totalPersonnel,
          page,
          limit,
          totalPages
        },
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
// @access  Private (Admin, AdminRH)
const updateSettings = async (req, res, next) => {
  try {
    // Seul Admin ou AdminDepartment rattaché au RH peut modifier
    if (!req.isAdminRH && req.user.role !== 'Admin') {
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
