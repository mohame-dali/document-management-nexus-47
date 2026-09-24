const mongoose = require('mongoose');
const AttendanceDeclaration = require('../models/AttendanceDeclaration');
const Attendance = require('../models/Attendance');
const Personnel = require('../models/Personnel');
const LeaveReason = require('../models/LeaveReason');
const OrganizationSettings = require('../models/OrganizationSettings');

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

/**
 * Détermine si l'utilisateur peut voir/gérer tous les départements
 */
const canUserSeeAllDepartments = async (req) => {
  if (!req.user) return false;
  const role = req.user.role;
  if (role === 'Admin' || role === 'Director') {
    return true;
  }
  if (role === 'AdminDepartment') {
    try {
      const settings = await OrganizationSettings.findOne();
      const rhDeptId = settings?.rhDepartmentId?.toString();
      const userDept = req.user.activeDepartment;
      const userDeptId = (userDept?._id || userDept)?.toString();
      const isRH = Boolean(rhDeptId && userDeptId && userDeptId === rhDeptId);

      if (isRH) {
        return true;
      }
    } catch (e) {
      // Ignorer erreur de lecture settings
    }
  }
  return false;
};

// @desc    Déclarer sa présence ou absence
// @route   POST /api/attendance/declarations
// @access  Private (Personnel / Utilisateur connecté)
exports.declareAttendance = async (req, res) => {
  try {
    const { date, statut, motif, leaveReasonId, detailsMotif, heureArrivee } = req.body;

    if (!date || !statut) {
      return res.status(400).json({
        success: false,
        message: 'La date et le statut (present/absent) sont obligatoires'
      });
    }

    if (!['present', 'absent'].includes(statut)) {
      return res.status(400).json({
        success: false,
        message: 'Le statut doit être "present" ou "absent"'
      });
    }

    // Récupérer le personnelId via req.user.personnelId OU Personnel.findOne({ userId: req.user._id })
    let personnel = null;
    if (req.user.personnelId) {
      personnel = await Personnel.findById(req.user.personnelId);
    }
    if (!personnel) {
      personnel = await Personnel.findOne({ userId: req.user._id });
    }

    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Aucune fiche de personnel associée à cet utilisateur'
      });
    }

    const startOfDay = parseDateToUTCStartOfDay(date);
    const { start, end } = getUTCDayRange(date);

    // Vérifier qu'aucune déclaration en_attente n'existe pour cette date
    const existingDeclaration = await AttendanceDeclaration.findOne({
      personnelId: personnel._id,
      date: { $gte: start, $lte: end },
      validationStatus: 'en_attente'
    });

    if (existingDeclaration) {
      return res.status(400).json({
        success: false,
        message: 'Une déclaration en attente existe déjà pour cette date'
      });
    }

    // Récupérer le département effectif
    const departmentId = personnel.activeDepartment || req.user.activeDepartment?._id || req.user.activeDepartment || null;

    // Créer la déclaration
    const declaration = await AttendanceDeclaration.create({
      personnelId: personnel._id,
      userId: req.user._id,
      departmentId,
      date: startOfDay,
      statut,
      motif: motif || '',
      leaveReasonId: leaveReasonId || null,
      detailsMotif: detailsMotif || {},
      heureArrivee: heureArrivee || '',
      validationStatus: 'en_attente'
    });

    res.status(201).json({
      success: true,
      data: declaration
    });
  } catch (error) {
    console.error('Erreur declareAttendance:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la déclaration de présence/absence'
    });
  }
};

// @desc    Consulter les déclarations du personnel connecté
// @route   GET /api/attendance/declarations/me
// @access  Private (Personnel connecté)
exports.getMyDeclarations = async (req, res) => {
  try {
    let personnelId = req.user.personnelId;
    if (!personnelId) {
      const p = await Personnel.findOne({ userId: req.user._id }).select('_id');
      if (p) personnelId = p._id;
    }

    if (!personnelId) {
      return res.status(404).json({
        success: false,
        message: 'Aucune fiche de personnel trouvée pour cet utilisateur'
      });
    }

    const query = { personnelId };

    if (req.query.validationStatus) {
      query.validationStatus = req.query.validationStatus;
    }

    if (req.query.from || req.query.to) {
      query.date = {};
      if (req.query.from) {
        query.date.$gte = parseDateToUTCStartOfDay(req.query.from);
      }
      if (req.query.to) {
        query.date.$lte = getUTCDayRange(req.query.to).end;
      }
    }

    const declarations = await AttendanceDeclaration.find(query)
      .populate('leaveReasonId', 'nom code categorie impacteSolde')
      .populate('validatedBy', 'username')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: declarations.length,
      data: declarations
    });
  } catch (error) {
    console.error('Erreur getMyDeclarations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération de vos déclarations'
    });
  }
};

// @desc    Consulter toutes les déclarations (Admin / RH / Chef de département)
// @route   GET /api/attendance/declarations
// @access  Private (Admin, Director, AdminDepartment)
exports.getAllDeclarations = async (req, res) => {
  try {
    const query = {};

    // Filtre par validationStatus : par défaut 'en_attente' si non spécifié ou si 'all' pour tout voir
    if (req.query.validationStatus && req.query.validationStatus !== 'all') {
      query.validationStatus = req.query.validationStatus;
    } else if (!req.query.validationStatus) {
      query.validationStatus = 'en_attente';
    }

    // Filtrage par date
    if (req.query.date) {
      const { start, end } = getUTCDayRange(req.query.date);
      query.date = { $gte: start, $lte: end };
    } else if (req.query.from || req.query.to) {
      query.date = {};
      if (req.query.from) query.date.$gte = parseDateToUTCStartOfDay(req.query.from);
      if (req.query.to) query.date.$lte = getUTCDayRange(req.query.to).end;
    }

    // Filtrage par département
    const canSeeAll = await canUserSeeAllDepartments(req);
    if (!canSeeAll) {
      // AdminDepartment non-RH : restreint strictement à son département
      const userDeptId = req.user.activeDepartment?._id || req.user.activeDepartment;
      if (!userDeptId) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      query.departmentId = userDeptId;
    } else if (req.query.departmentId && req.query.departmentId !== 'all') {
      query.departmentId = req.query.departmentId;
    }

    const declarations = await AttendanceDeclaration.find(query)
      .populate('personnelId', 'nom prenom matricule activeDepartment telephone photo')
      .populate('leaveReasonId', 'nom code categorie impacteSolde')
      .populate('userId', 'username photo')
      .populate('departmentId', 'name code')
      .populate('validatedBy', 'username')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: declarations.length,
      data: declarations
    });
  } catch (error) {
    console.error('Erreur getAllDeclarations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des déclarations'
    });
  }
};

// @desc    Approuver une déclaration et l'intégrer automatiquement dans Attendance
// @route   PUT /api/attendance/declarations/:id/approve
// @access  Private (Admin, Director, AdminDepartment)
exports.approveDeclaration = async (req, res) => {
  try {
    const declaration = await AttendanceDeclaration.findById(req.params.id);
    if (!declaration) {
      return res.status(404).json({
        success: false,
        message: 'Déclaration introuvable'
      });
    }

    if (declaration.validationStatus === 'approuvee') {
      return res.status(400).json({
        success: false,
        message: 'Cette déclaration est déjà approuvée'
      });
    }

    // Vérification des droits sur le département
    const canSeeAll = await canUserSeeAllDepartments(req);
    if (!canSeeAll) {
      const userDeptId = (req.user.activeDepartment?._id || req.user.activeDepartment || '').toString();
      const declDeptId = (declaration.departmentId || '').toString();
      if (userDeptId !== declDeptId) {
        return res.status(403).json({
          success: false,
          message: 'Non autorisé à valider les déclarations d’un autre département'
        });
      }
    }

    const isPresent = declaration.statut === 'present';
    let impacteSolde = false;
    let leaveReasonId = declaration.leaveReasonId || null;

    if (!isPresent && declaration.motif) {
      if (leaveReasonId) {
        const found = await LeaveReason.findById(leaveReasonId).lean();
        if (found) {
          impacteSolde = Boolean(found.impacteSolde);
        }
      } else {
        const foundByCode = await LeaveReason.findOne({ code: declaration.motif }).lean();
        if (foundByCode) {
          impacteSolde = Boolean(foundByCode.impacteSolde);
          leaveReasonId = foundByCode._id;
        }
      }
    }

    const { start } = getUTCDayRange(declaration.date);

    // Mettre à jour ou insérer dans Attendance (upsert)
    const attendanceRecord = await Attendance.findOneAndUpdate(
      {
        personnelId: declaration.personnelId,
        date: start
      },
      {
        $set: {
          departmentId: declaration.departmentId,
          statut: declaration.statut,
          motif: isPresent ? null : (declaration.motif || null),
          leaveReasonId: isPresent ? null : leaveReasonId,
          impacteSolde: isPresent ? false : impacteSolde,
          detailsMotif: {
            serviceNom: declaration.detailsMotif?.nomService || '',
            missionLieu: declaration.detailsMotif?.lieuMission || '',
            missionObjet: declaration.detailsMotif?.objetMission || '',
            formationIntitule: declaration.detailsMotif?.intituleFormation || '',
            commentaire: declaration.detailsMotif?.commentaire || ''
          },
          heureArrivee: isPresent ? (declaration.heureArrivee || null) : null,
          saisiPar: req.user._id,
          modifiePar: req.user._id
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    // Mettre à jour la déclaration
    declaration.validationStatus = 'approuvee';
    declaration.validatedBy = req.user._id;
    declaration.validatedAt = new Date();
    declaration.attendanceId = attendanceRecord._id;
    if (req.body.adminComment) {
      declaration.adminComment = req.body.adminComment;
    }
    await declaration.save();

    res.status(200).json({
      success: true,
      message: 'Déclaration approuvée et présence enregistrée avec succès',
      data: declaration
    });
  } catch (error) {
    console.error('Erreur approveDeclaration:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l’approbation de la déclaration'
    });
  }
};

// @desc    Rejeter une déclaration
// @route   PUT /api/attendance/declarations/:id/reject
// @access  Private (Admin, Director, AdminDepartment)
exports.rejectDeclaration = async (req, res) => {
  try {
    const { reason, adminComment } = req.body;
    const declaration = await AttendanceDeclaration.findById(req.params.id);

    if (!declaration) {
      return res.status(404).json({
        success: false,
        message: 'Déclaration introuvable'
      });
    }

    // Vérification des droits département
    const canSeeAll = await canUserSeeAllDepartments(req);
    if (!canSeeAll) {
      const userDeptId = (req.user.activeDepartment?._id || req.user.activeDepartment || '').toString();
      const declDeptId = (declaration.departmentId || '').toString();
      if (userDeptId !== declDeptId) {
        return res.status(403).json({
          success: false,
          message: 'Non autorisé à rejeter les déclarations d’un autre département'
        });
      }
    }

    declaration.validationStatus = 'rejetee';
    declaration.validatedBy = req.user._id;
    declaration.validatedAt = new Date();
    declaration.rejectionReason = reason || req.body.rejectionReason || '';
    if (adminComment) {
      declaration.adminComment = adminComment;
    }
    await declaration.save();

    res.status(200).json({
      success: true,
      message: 'Déclaration rejetée avec succès',
      data: declaration
    });
  } catch (error) {
    console.error('Erreur rejectDeclaration:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors du rejet de la déclaration'
    });
  }
};

// @desc    Modifier une déclaration (par Admin/RH avant ou après validation)
// @route   PUT /api/attendance/declarations/:id
// @access  Private (Admin, Director, AdminDepartment)
exports.updateDeclaration = async (req, res) => {
  try {
    const declaration = await AttendanceDeclaration.findById(req.params.id);

    if (!declaration) {
      return res.status(404).json({
        success: false,
        message: 'Déclaration introuvable'
      });
    }

    // Vérification des droits département
    const canSeeAll = await canUserSeeAllDepartments(req);
    if (!canSeeAll) {
      const userDeptId = (req.user.activeDepartment?._id || req.user.activeDepartment || '').toString();
      const declDeptId = (declaration.departmentId || '').toString();
      if (userDeptId !== declDeptId) {
        return res.status(403).json({
          success: false,
          message: 'Non autorisé à modifier les déclarations d’un autre département'
        });
      }
    }

    const {
      statut,
      motif,
      leaveReasonId,
      detailsMotif,
      heureArrivee,
      adminComment,
      rejectionReason,
      date
    } = req.body;

    if (statut) declaration.statut = statut;
    if (motif !== undefined) declaration.motif = motif;
    if (leaveReasonId !== undefined) declaration.leaveReasonId = leaveReasonId;
    if (detailsMotif !== undefined) {
      declaration.detailsMotif = {
        ...declaration.detailsMotif,
        ...detailsMotif
      };
    }
    if (heureArrivee !== undefined) declaration.heureArrivee = heureArrivee;
    if (adminComment !== undefined) declaration.adminComment = adminComment;
    if (rejectionReason !== undefined) declaration.rejectionReason = rejectionReason;
    if (date) declaration.date = parseDateToUTCStartOfDay(date);

    declaration.validationStatus = 'modifiee';
    declaration.validatedBy = req.user._id;
    declaration.validatedAt = new Date();

    await declaration.save();

    res.status(200).json({
      success: true,
      message: 'Déclaration modifiée avec succès',
      data: declaration
    });
  } catch (error) {
    console.error('Erreur updateDeclaration:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la modification de la déclaration'
    });
  }
};

// @desc    Supprimer une déclaration (User : uniquement ses déclarations en_attente ; Admin : n'importe laquelle)
// @route   DELETE /api/attendance/declarations/:id
// @access  Private
exports.deleteDeclaration = async (req, res) => {
  try {
    const declaration = await AttendanceDeclaration.findById(req.params.id);

    if (!declaration) {
      return res.status(404).json({
        success: false,
        message: 'Déclaration introuvable'
      });
    }

    const isAdmin = req.user.role === 'Admin';
    const isOwner = declaration.userId && declaration.userId.toString() === req.user._id.toString();

    if (!isAdmin) {
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez supprimer que vos propres déclarations'
        });
      }
      if (declaration.validationStatus !== 'en_attente') {
        return res.status(400).json({
          success: false,
          message: 'Vous ne pouvez supprimer qu’une déclaration en attente'
        });
      }
    }

    await AttendanceDeclaration.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Déclaration supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur deleteDeclaration:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression de la déclaration'
    });
  }
};
