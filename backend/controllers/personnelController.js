const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Personnel = require('../models/Personnel');
const Department = require('../models/Department');
const PersonnelDocument = require('../models/PersonnelDocument');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const User = require('../models/User');
const OrganizationSettings = require('../models/OrganizationSettings');
const { sanitizeSearchQuery } = require('../utils/regexUtils');
const { logAuditAction } = require('../utils/auditLogger');
const { extractId } = require('../utils/rhAuthHelper');
const {
  seedInitialAffectationIfEmpty,
  recordCareerTransition
} = require('../utils/personnelCareerHelper');

// Helper pour vérifier si l'utilisateur est un chef de département non-RH
const isNonRHAdminDepartment = async (user) => {
  if (!user || user.role !== 'AdminDepartment') return false;
  const settings = await OrganizationSettings.findOne();
  const rhDeptId = settings?.rhDepartmentId?.toString();
  const userDeptId = (user.activeDepartment?._id || user.activeDepartment)?.toString();
  if (rhDeptId && userDeptId && rhDeptId === userDeptId) {
    return false; // Chef de département RH
  }
  return true; // Chef d'un autre département (non-RH)
};

// @desc    Créer une nouvelle fiche de personnel
// @route   POST /api/hr/personnel
// @access  Private (Admin, Director, AdminDepartment)
exports.createPersonnel = async (req, res, next) => {
  try {
    const {
      nom,
      prenom,
      dateNaissance,
      lieuNaissance,
      sexe,
      cin,
      adresse,
      telephone,
      emailPersonnel,
      poste,
      activeDepartment,
      departments,
      dateEmbauche,
      notes,
      photo,
      // Groupe A — Identité étendue
      nomPere,
      nomMere,
      nomGrandPere,
      groupeSanguin,
      // Groupe B — Situation administrative
      dateEmissionCin,
      numeroUnite,
      numeroArmee,
      dateEngagement,
      dateRecrutement,
      typeEngagement,
      origineEngagement,
      niveauEtude,
      diplomeBase,
      specialite,
      arme,
      posteActuel,
      fonction,
      // Groupe C — Situation familiale
      etatCivil,
      nomConjoint,
      dateMariage,
      nombreEnfants,
      enfants,
      // Groupe D — Passeport
      numeroPasseport,
      dateValiditePasseport,
      // Groupe E — 3 personnes à prévenir
      personnesAPrevenir
    } = req.body;

    if (!nom || !prenom) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et le prénom sont obligatoires'
      });
    }

    // Validation du département principal s'il est fourni
    let deptExists = null;
    if (activeDepartment) {
      if (!mongoose.Types.ObjectId.isValid(activeDepartment)) {
        return res.status(400).json({
          success: false,
          message: 'Identifiant de département invalide'
        });
      }
      deptExists = await Department.findById(activeDepartment);
      if (!deptExists) {
        return res.status(404).json({
          success: false,
          message: 'Le département spécifié est introuvable'
        });
      }
    }

    // Validation d'unicité de l'email professionnel (si non vide)
    const normalizedEmail = typeof emailPersonnel === 'string'
      ? emailPersonnel.trim().toLowerCase()
      : '';
    if (normalizedEmail) {
      const existingEmailPersonnel = await Personnel.findOne({
        emailPersonnel: normalizedEmail,
        isDeleted: { $ne: true }
      });
      if (existingEmailPersonnel) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_EMAIL',
          message: 'Un agent avec cet email professionnel existe déjà.'
        });
      }
    }

    // Validation croisée (CIN ↔ Username) : vérifier si le CIN correspond au username d'un User existant
    if (cin && cin.trim()) {
      const trimmedCin = cin.trim();
      const existingUserWithUsername = await User.findOne({
        username: trimmedCin,
        isDeleted: { $ne: true }
      });
      if (existingUserWithUsername) {
        return res.status(400).json({
          success: false,
          message: "Ce CIN correspond déjà à un nom d'utilisateur existant dans le système."
        });
      }
    }

    const resolvedPoste =
      (typeof posteActuel === 'string' && posteActuel.trim()) ||
      (typeof poste === 'string' && poste.trim()) ||
      (typeof fonction === 'string' && fonction.trim()) ||
      '';

    const initialDepartments = Array.isArray(departments) ? [...departments] : [];
    if (activeDepartment) {
      const activeDeptStr = activeDepartment.toString();
      if (!initialDepartments.some(d => extractId(d) === activeDeptStr)) {
        initialDepartments.push(activeDepartment);
      }
    }

    const initialHistory = [];
    if (activeDepartment || resolvedPoste) {
      initialHistory.push({
        poste: resolvedPoste,
        departement: activeDepartment || null,
        departementName: deptExists?.name ? String(deptExists.name).trim() : '',
        dateDebut: dateEngagement || dateEmbauche || dateRecrutement || new Date(),
        dateFin: null,
        reference: '',
        observations: '',
        isCurrent: true
      });
    }

    // Création de la fiche avec statut initial 'en_attente' et userId null
    const personnelData = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      dateNaissance: dateNaissance || null,
      lieuNaissance: lieuNaissance ? lieuNaissance.trim() : '',
      sexe: sexe || undefined,
      cin: cin && cin.trim() ? cin.trim() : undefined,
      adresse: adresse ? adresse.trim() : '',
      telephone: telephone ? telephone.trim() : '',
      emailPersonnel: normalizedEmail,
      poste: typeof poste === 'string' && poste.trim() ? poste.trim() : resolvedPoste,
      activeDepartment: activeDepartment || null,
      departments: initialDepartments,
      dateEmbauche: dateEmbauche || null,
      statut: 'en_attente',
      userId: null,
      notes: notes ? notes.trim() : '',
      photo: photo ? photo.trim() : '',
      // Groupe A — Identité étendue
      nomPere: nomPere ? nomPere.trim() : '',
      nomMere: nomMere ? nomMere.trim() : '',
      nomGrandPere: nomGrandPere ? nomGrandPere.trim() : '',
      groupeSanguin: groupeSanguin || '',
      // Groupe B — Situation administrative
      dateEmissionCin: dateEmissionCin || null,
      numeroUnite: numeroUnite ? numeroUnite.trim() : '',
      numeroArmee: numeroArmee ? numeroArmee.trim() : '',
      dateEngagement: dateEngagement || null,
      typeEngagement: typeEngagement ? typeEngagement.trim() : '',
      origineEngagement: origineEngagement ? origineEngagement.trim() : '',
      niveauEtude: niveauEtude ? niveauEtude.trim() : '',
      diplomeBase: diplomeBase ? diplomeBase.trim() : '',
      specialite: specialite ? specialite.trim() : '',
      arme: arme ? arme.trim() : '',
      posteActuel: typeof posteActuel === 'string' && posteActuel.trim() ? posteActuel.trim() : resolvedPoste,
      // Groupe C — Situation familiale
      etatCivil: etatCivil || '',
      nomConjoint: nomConjoint ? nomConjoint.trim() : '',
      dateMariage: dateMariage || null,
      nombreEnfants: nombreEnfants !== undefined ? Number(nombreEnfants) : 0,
      enfants: enfants !== undefined ? Number(enfants) : (nombreEnfants !== undefined ? Number(nombreEnfants) : 0),
      // Groupe D — Passeport
      numeroPasseport: numeroPasseport ? numeroPasseport.trim() : '',
      dateValiditePasseport: dateValiditePasseport || null,
      // Groupe E — 3 personnes à prévenir
      personnesAPrevenir: Array.isArray(personnesAPrevenir) ? personnesAPrevenir : [],
      // Historique automatique des affectations
      historiqueAffectations: initialHistory,
      createdBy: req.user ? (req.user._id || req.user.id) : null
    };

    const personnel = await Personnel.create(personnelData);

    // Synchronisation du département vers le User s'il est lié à la création
    if (personnel.userId && personnel.activeDepartment) {
      try {
        const user = await User.findOne({ _id: personnel.userId, isDeleted: { $ne: true } });
        if (user) {
          if (user.role !== 'AdminTuningDesk') {
            user.activeDepartment = personnel.activeDepartment;
            const newDeptId = personnel.activeDepartment.toString();
            const deptExists = (user.departments || []).some(
              d => (d._id || d).toString() === newDeptId
            );
            if (!deptExists) {
              user.departments = user.departments || [];
              user.departments.push(personnel.activeDepartment);
            }
          } else {
            user.departments = [];
            user.activeDepartment = null;
          }
          await user.save();
        }
      } catch (syncErr) {
        console.warn('Erreur lors de la synchronisation département à la création du personnel:', syncErr.message);
      }
    }

    await logAuditAction(
      'personnel_create',
      'Personnel',
      personnel._id.toString(),
      req.user?._id || req.user?.id,
      req.user,
      { nom: personnel.nom, prenom: personnel.prenom, activeDepartment: personnel.activeDepartment },
      req.ip
    );

    res.status(201).json({
      success: true,
      data: personnel
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.emailPersonnel) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_EMAIL',
          message: 'Un agent avec cet email professionnel existe déjà.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Un agent avec ce CIN existe déjà.'
      });
    }
    next(error);
  }
};

// @desc    Obtenir la liste du personnel avec pagination et filtres
// @route   GET /api/hr/personnel
// @access  Private (Admin, Director, AdminDepartment)
exports.getPersonnelList = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { isDeleted: { $ne: true } };

    const isAdminOrDirector = Boolean(req.user && ['Admin', 'Director'].includes(req.user.role));
    let isRH = false;

    if (req.user && req.user.role === 'AdminDepartment') {
      const settings = await OrganizationSettings.findOne();
      const rhDeptId = settings?.rhDepartmentId?.toString();
      const userDeptId = (req.user.activeDepartment?._id || req.user.activeDepartment)?.toString();
      isRH = Boolean(rhDeptId && userDeptId && userDeptId === rhDeptId);
    }

    const hasFullHRAccess = isAdminOrDirector || isRH;

    // Si l'utilisateur n'est pas Admin/Director/RH : restreindre à son département actif
    if (!hasFullHRAccess) {
      const userActiveDept = req.user?.activeDepartment?._id || req.user?.activeDepartment;
      if (userActiveDept) {
        query.activeDepartment = userActiveDept;
      } else {
        // Aucun département rattaché (ex: AdminTuningDesk) : aucun accès aux fiches personnelles
        query._id = null;
      }
    } else if (req.query.activeDepartment) {
      query.activeDepartment = req.query.activeDepartment;
    }

    // Filtre de recherche textuelle (CIN réservé aux utilisateurs Admin/Director/RH)
    if (req.query.search) {
      const safeSearch = sanitizeSearchQuery(req.query.search);
      if (safeSearch) {
        const searchRegex = new RegExp(safeSearch, 'i');
        query.$or = hasFullHRAccess
          ? [
              { nom: searchRegex },
              { prenom: searchRegex },
              { cin: searchRegex }
            ]
          : [
              { nom: searchRegex },
              { prenom: searchRegex }
            ];
      }
    }

    // Filtre par statut
    if (req.query.statut) {
      query.statut = req.query.statut;
    }

    const total = await Personnel.countDocuments(query);
    const pages = Math.ceil(total / limit) || 1;

    // Projection minimale hors Admin/Director/RH : masquer strictement cin, groupeSanguin, numeroPasseport, personnesAPrevenir et autres PII
    const personnelQuery = Personnel.find(query);
    if (!hasFullHRAccess) {
      personnelQuery.select('_id nom prenom activeDepartment poste posteActuel');
    } else {
      personnelQuery.populate({
        path: 'userId',
        select: 'username email role isActive isDeleted',
        match: { isDeleted: { $ne: true } }
      });
    }

    const personnelList = await personnelQuery
      .populate('activeDepartment', 'name code description')
      .populate('departments', 'name code')
      .populate('historiqueAffectations.departement', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Filtrer tout lien fantôme ou utilisateur supprimé
    if (hasFullHRAccess) {
      personnelList.forEach((doc) => {
        if (doc.userId && (typeof doc.userId !== 'object' || doc.userId.isDeleted)) {
          doc.userId = null;
        }
      });
    }

    res.status(200).json({
      success: true,
      data: personnelList,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    next(error);
  }
};

// Alias pour compatibilité
exports.getPersonnel = exports.getPersonnelList;

// @desc    Obtenir une fiche de personnel par son ID
// @route   GET /api/hr/personnel/:id
// @access  Private (Admin, Director, AdminDepartment)
exports.getPersonnelById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de personnel invalide'
      });
    }

    const personnel = await Personnel.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('activeDepartment', 'name description')
      .populate('departments', 'name')
      .populate('historiqueAffectations.departement', 'name')
      .populate({
        path: 'userId',
        select: 'username email role isActive isDeleted',
        match: { isDeleted: { $ne: true } }
      });

    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Fiche de personnel introuvable'
      });
    }

    if (personnel.userId && (typeof personnel.userId !== 'object' || personnel.userId.isDeleted)) {
      personnel.userId = null;
    }

    res.status(200).json({
      success: true,
      data: personnel
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour une fiche de personnel (sauf statut et userId)
// @route   PUT /api/hr/personnel/:id
// @access  Private (Admin, Director, AdminDepartment)
exports.updatePersonnel = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de personnel invalide'
      });
    }

    const personnel = await Personnel.findOne({ _id: id, isDeleted: { $ne: true } });

    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Fiche de personnel introuvable'
      });
    }

    // Vérifier si la fiche est liée à un compte Admin purement technique
    let linkedUser = null;
    if (personnel.userId) {
      linkedUser = await User.findOne({ _id: personnel.userId, isDeleted: { $ne: true } });
      if (linkedUser && linkedUser.role === 'Admin') {
        return res.status(403).json({
          success: false,
          code: 'ADMIN_TECHNICAL_ONLY',
          message: 'Les comptes Admin sont purement techniques et ne peuvent pas être gérés ou mutés via un dossier du personnel.'
        });
      }
    }

    const prevDeptId = extractId(personnel.activeDepartment);
    const prevPoste = (personnel.posteActuel || personnel.poste || '').trim();

    // Validation emailPersonnel unique avant application (si modifié et non vide)
    if (req.body.emailPersonnel !== undefined) {
      const normalizedEmail = typeof req.body.emailPersonnel === 'string'
        ? req.body.emailPersonnel.trim().toLowerCase()
        : '';
      if (normalizedEmail) {
        const existingEmailPersonnel = await Personnel.findOne({
          _id: { $ne: personnel._id },
          emailPersonnel: normalizedEmail,
          isDeleted: { $ne: true }
        });
        if (existingEmailPersonnel) {
          return res.status(409).json({
            success: false,
            code: 'DUPLICATE_EMAIL',
            message: 'Un agent avec cet email professionnel existe déjà.'
          });
        }
      }
    }

    // Validation activeDepartment si mis à jour
    let newDeptDoc = null;
    if (req.body.activeDepartment !== undefined) {
      if (req.body.activeDepartment === null || req.body.activeDepartment === '' || req.body.activeDepartment === 'NONE') {
        req.body.activeDepartment = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(req.body.activeDepartment)) {
          return res.status(400).json({
            success: false,
            message: 'Identifiant de département invalide'
          });
        }
        newDeptDoc = await Department.findById(req.body.activeDepartment);
        if (!newDeptDoc) {
          return res.status(404).json({
            success: false,
            message: 'Le département spécifié est introuvable'
          });
        }
      }
    }

    // Validation croisée (CIN ↔ Username) si le CIN est mis à jour
    if (req.body.cin && typeof req.body.cin === 'string' && req.body.cin.trim()) {
      const trimmedCin = req.body.cin.trim();
      const existingUserWithUsername = await User.findOne({
        username: trimmedCin,
        isDeleted: { $ne: true }
      });
      if (existingUserWithUsername && (!personnel.userId || existingUserWithUsername._id.toString() !== personnel.userId.toString())) {
        return res.status(400).json({
          success: false,
          message: "Ce CIN correspond déjà à un nom d'utilisateur existant dans le système."
        });
      }
    }

    // Champs modifiables autorisés (statut et userId sont strictement exclus)
    const allowedFields = [
      'nom',
      'prenom',
      'dateNaissance',
      'lieuNaissance',
      'sexe',
      'cin',
      'adresse',
      'telephone',
      'emailPersonnel',
      'poste',
      'activeDepartment',
      'departments',
      'dateEmbauche',
      'notes',
      'photo',
      // Groupe A — Identité étendue
      'nomPere',
      'nomMere',
      'nomGrandPere',
      'groupeSanguin',
      // Groupe B — Situation administrative
      'dateEmissionCin',
      'numeroUnite',
      'numeroArmee',
      'dateEngagement',
      'typeEngagement',
      'origineEngagement',
      'niveauEtude',
      'diplomeBase',
      'specialite',
      'arme',
      'posteActuel',
      // Groupe C — Situation familiale
      'etatCivil',
      'nomConjoint',
      'dateMariage',
      'nombreEnfants',
      'enfants',
      // Groupe D — Passeport
      'numeroPasseport',
      'dateValiditePasseport',
      // Groupe E — 3 personnes à prévenir
      'personnesAPrevenir'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'cin') {
          personnel.cin = req.body.cin && req.body.cin.trim() ? req.body.cin.trim() : undefined;
        } else if (field === 'nom' || field === 'prenom') {
          if (req.body[field] && req.body[field].trim()) {
            personnel[field] = req.body[field].trim();
          }
        } else if (field === 'emailPersonnel') {
          personnel[field] = req.body[field] ? req.body[field].trim().toLowerCase() : '';
        } else if (typeof req.body[field] === 'string') {
          personnel[field] = req.body[field].trim();
        } else {
          personnel[field] = req.body[field];
        }
      }
    });

    // Tolérer req.body.fonction comme alias et garder poste/posteActuel cohérents
    if (typeof req.body.fonction === 'string') {
      const trimmedFonction = req.body.fonction.trim();
      if (req.body.posteActuel === undefined) {
        personnel.posteActuel = trimmedFonction;
      }
      if (req.body.poste === undefined) {
        personnel.poste = trimmedFonction;
      }
    } else {
      if (req.body.posteActuel !== undefined && req.body.poste === undefined) {
        personnel.poste = personnel.posteActuel;
      } else if (req.body.poste !== undefined && req.body.posteActuel === undefined) {
        personnel.posteActuel = personnel.poste;
      }
    }

    const newDeptId = extractId(personnel.activeDepartment);
    const newPoste = (personnel.posteActuel || personnel.poste || '').trim();
    const deptChanged = newDeptId !== prevDeptId;
    const posteChanged = newPoste !== prevPoste;

    if (deptChanged || posteChanged) {
      await recordCareerTransition(personnel, {
        prevDeptId,
        prevPoste,
        newDeptId,
        newDeptName: newDeptDoc?.name ? String(newDeptDoc.name).trim() : '',
        newPoste,
        reference: typeof req.body.referenceAffectation === 'string' ? req.body.referenceAffectation.trim() : '',
        observations: typeof req.body.observationsAffectation === 'string' ? req.body.observationsAffectation.trim() : ''
      });

      // Maintenir personnel.departments synchronisé si non fourni explicitement
      if (req.body.departments === undefined && deptChanged) {
        const currentDepts = Array.isArray(personnel.departments) ? [...personnel.departments] : [];
        const filtered = prevDeptId
          ? currentDepts.filter(d => extractId(d) !== prevDeptId)
          : currentDepts;
        if (newDeptId && !filtered.some(d => extractId(d) === newDeptId)) {
          filtered.push(personnel.activeDepartment);
        }
        personnel.departments = filtered;
      }
    }

    await personnel.save();

    // Synchronisation du département (Personnel → User) sans laisser d'accès obsolète à l'ancien département
    if (personnel.userId) {
      try {
        const user = linkedUser || await User.findOne({ _id: personnel.userId, isDeleted: { $ne: true } });
        if (user && user.role !== 'Admin') {
          if (user.role !== 'AdminTuningDesk') {
            if (deptChanged || (newDeptId && extractId(user.activeDepartment) !== newDeptId)) {
              const userCurrentDepts = Array.isArray(user.departments) ? [...user.departments] : [];
              const cleanedDepts = prevDeptId
                ? userCurrentDepts.filter(d => extractId(d) !== prevDeptId)
                : userCurrentDepts;

              if (newDeptId && !cleanedDepts.some(d => extractId(d) === newDeptId)) {
                cleanedDepts.push(personnel.activeDepartment);
              }
              user.departments = cleanedDepts;
              user.activeDepartment = personnel.activeDepartment || cleanedDepts[0] || null;
              await user.save();
            }
          } else {
            user.departments = [];
            user.activeDepartment = null;
            await user.save();
          }
        }
      } catch (syncErr) {
        console.warn('Erreur lors de la synchronisation département vers le User:', syncErr.message);
      }
    }

    const updatedPersonnel = await Personnel.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('activeDepartment', 'name description')
      .populate('departments', 'name')
      .populate('historiqueAffectations.departement', 'name');

    await logAuditAction(
      'personnel_update',
      'Personnel',
      personnel._id.toString(),
      req.user?._id || req.user?.id,
      req.user,
      { nom: personnel.nom, prenom: personnel.prenom, activeDepartment: personnel.activeDepartment, poste: newPoste },
      req.ip
    );

    res.status(200).json({
      success: true,
      data: updatedPersonnel
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.emailPersonnel) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_EMAIL',
          message: 'Un agent avec cet email professionnel existe déjà.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Un agent avec ce CIN existe déjà.'
      });
    }
    next(error);
  }
};

// @desc    Supprimer une fiche de personnel (Soft delete - uniquement si non liée à un compte utilisateur)
// @route   DELETE /api/hr/personnel/:id
// @access  Private (Admin, Director uniquement)
exports.deletePersonnel = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de personnel invalide'
      });
    }

    const personnel = await Personnel.findOne({ _id: id, isDeleted: { $ne: true } });

    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Fiche de personnel introuvable'
      });
    }

    // Interdiction absolue de supprimer si un compte utilisateur est lié
    if (personnel.userId) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une fiche de personnel associée à un compte utilisateur'
      });
    }

    personnel.isDeleted = true;
    personnel.deletedAt = new Date();
    personnel.deletedBy = req.user ? (req.user._id || req.user.id) : null;
    await personnel.save();

    await logAuditAction(
      'personnel_delete',
      'Personnel',
      personnel._id.toString(),
      req.user?._id || req.user?.id,
      req.user,
      { nom: personnel.nom, prenom: personnel.prenom },
      req.ip
    );

    res.status(200).json({
      success: true,
      data: {},
      message: 'Fiche de personnel supprimée avec succès'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restaurer une fiche de personnel supprimée
// @route   PUT /api/hr/personnel/:id/restore
// @access  Private (Admin, Director uniquement)
exports.restorePersonnel = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de personnel invalide'
      });
    }

    const personnel = await Personnel.findOne({ _id: id, isDeleted: true });

    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Fiche de personnel supprimée introuvable'
      });
    }

    personnel.isDeleted = false;
    personnel.deletedAt = null;
    personnel.deletedBy = null;
    await personnel.save();

    await logAuditAction(
      'personnel_restore',
      'Personnel',
      personnel._id.toString(),
      req.user?._id || req.user?.id,
      req.user,
      { nom: personnel.nom, prenom: personnel.prenom },
      req.ip
    );

    res.status(200).json({
      success: true,
      data: personnel,
      message: 'Fiche de personnel restaurée avec succès'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lister les fiches de personnel en attente de compte utilisateur
// @route   GET /api/hr/personnel/en-attente
// @access  Private (Admin, Director, AdminDepartment)
exports.getPersonnelEnAttente = async (req, res, next) => {
  try {
    const personnelEnAttente = await Personnel.find({
      statut: 'en_attente',
      userId: null,
      isDeleted: { $ne: true }
    })
      .populate('activeDepartment', 'name description')
      .populate('departments', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: personnelEnAttente.length,
      data: personnelEnAttente
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir la fiche de personnel de l'utilisateur connecté
// @route   GET /api/hr/my-profile
// @access  Private (Tous les utilisateurs authentifiés)
exports.getMyProfile = async (req, res, next) => {
  try {
    let personnel = null;

    // 1. Recherche par personnelId présent sur le modèle User connecté
    if (req.user && req.user.personnelId) {
      personnel = await Personnel.findOne({
        _id: req.user.personnelId,
        isDeleted: { $ne: true }
      })
        .populate('activeDepartment', 'name description')
        .populate('departments', 'name')
        .populate('historiqueAffectations.departement', 'name');
    }

    // 2. Recherche par userId au cas où personnelId n'est pas encore synchronisé sur req.user
    if (!personnel && req.user) {
      const userId = req.user._id || req.user.id;
      personnel = await Personnel.findOne({ userId, isDeleted: { $ne: true } })
        .populate('activeDepartment', 'name description')
        .populate('departments', 'name')
        .populate('historiqueAffectations.departement', 'name');
    }

    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Aucune fiche de personnel associée à votre compte utilisateur'
      });
    }

    res.status(200).json({
      success: true,
      data: personnel
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les documents associés à la fiche de personnel de l'utilisateur connecté
// @route   GET /api/hr/my-documents
// @access  Private (Tous les utilisateurs authentifiés)
exports.getMyDocuments = async (req, res, next) => {
  try {
    let personnel = null;

    // 1. Recherche par personnelId
    if (req.user && req.user.personnelId) {
      personnel = await Personnel.findOne({
        _id: req.user.personnelId,
        isDeleted: { $ne: true }
      });
    }

    // 2. Recherche par userId en fallback
    if (!personnel && req.user) {
      const userId = req.user._id || req.user.id;
      personnel = await Personnel.findOne({ userId, isDeleted: { $ne: true } });
    }

    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Aucune fiche de personnel associée à votre compte'
      });
    }

    // Récupérer toutes les associations PersonnelDocument pour ce personnel
    const associations = await PersonnelDocument.find({ personnelId: personnel._id })
      .populate('associePar', 'username email')
      .sort({ dateAssociation: -1 });

    const incomingIds = [];
    const outgoingIds = [];

    associations.forEach((assoc) => {
      if (assoc.documentType === 'IncomingDocument') {
        incomingIds.push(assoc.documentId);
      } else if (assoc.documentType === 'OutgoingDocument') {
        outgoingIds.push(assoc.documentId);
      }
    });

    const [incomingDocs, outgoingDocs] = await Promise.all([
      incomingIds.length > 0
        ? IncomingDocument.find({ _id: { $in: incomingIds } }).lean()
        : [],
      outgoingIds.length > 0
        ? OutgoingDocument.find({ _id: { $in: outgoingIds } }).lean()
        : []
    ]);

    const docsMap = new Map();
    incomingDocs.forEach((doc) => docsMap.set(doc._id.toString(), doc));
    outgoingDocs.forEach((doc) => docsMap.set(doc._id.toString(), doc));

    const formattedData = associations.map((assoc) => {
      const doc = docsMap.get(assoc.documentId.toString()) || null;
      return {
        _id: assoc._id,
        personnelId: assoc.personnelId,
        typeAssociation: assoc.typeAssociation,
        documentType: assoc.documentType,
        documentId: assoc.documentId,
        document: doc,
        commentaire: assoc.commentaire,
        dateAssociation: assoc.dateAssociation,
        associePar: assoc.associePar,
        createdAt: assoc.createdAt
      };
    });

    res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lier un compte utilisateur à une fiche de personnel
// @route   POST /api/hr/personnel/:personnelId/link-user
// @access  Private (Admin, Director, AdminDepartment)
exports.linkUserToPersonnel = async (req, res, next) => {
  try {
    const { personnelId } = req.params;
    const { userId } = req.body;

    // a. Valider le format ObjectId de personnelId et userId
    if (!personnelId || !mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de fiche Personnel invalide'
      });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant d\'utilisateur invalide ou manquant'
      });
    }

    // b. Récupérer la fiche Personnel → si introuvable → 404
    const personnel = await Personnel.findOne({ _id: personnelId, isDeleted: { $ne: true } });
    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Fiche de personnel introuvable'
      });
    }

    // c. Récupérer le User → si introuvable → 404
    const user = await User.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable'
      });
    }

    // c-bis. Garde RBAC : Admin est purement technique et ne peut jamais être lié à un dossier Personnel
    if (user.role === 'Admin') {
      return res.status(403).json({
        success: false,
        code: 'ADMIN_TECHNICAL_ONLY',
        message: 'Les comptes Admin sont purement techniques et ne peuvent pas être liés à un dossier du personnel.'
      });
    }

    // d. Nettoyer les liens orphelins / supprimés bloquants dans la base avant vérification
    await User.updateMany(
      { _id: { $ne: user._id }, personnelId: personnel._id, isDeleted: true },
      { $set: { personnelId: null } }
    );
    await Personnel.updateMany(
      { _id: { $ne: personnel._id }, userId: user._id, isDeleted: true },
      { $set: { userId: null } }
    );

    // e. Vérifier/nettoyer personnel.userId s'il pointe vers un autre compte
    if (personnel.userId && personnel.userId.toString() !== userId.toString()) {
      const existingLinkedUser = await User.findById(personnel.userId)
        .select('_id isDeleted personnelId')
        .lean();

      const isStalePersonnelLink =
        !existingLinkedUser ||
        existingLinkedUser.isDeleted === true ||
        !existingLinkedUser.personnelId ||
        existingLinkedUser.personnelId.toString() !== personnel._id.toString();

      if (isStalePersonnelLink) {
        personnel.userId = null;
      } else {
        return res.status(409).json({
          success: false,
          code: 'PERSONNEL_ALREADY_LINKED',
          message: 'Cette fiche Personnel est déjà associée à un autre compte utilisateur'
        });
      }
    }

    // f. Vérifier/nettoyer user.personnelId s'il pointe vers une autre fiche Personnel
    if (user.personnelId && user.personnelId.toString() !== personnelId.toString()) {
      const existingLinkedPersonnel = await Personnel.findById(user.personnelId)
        .select('_id isDeleted userId')
        .lean();

      const isStaleUserLink =
        !existingLinkedPersonnel ||
        existingLinkedPersonnel.isDeleted === true ||
        !existingLinkedPersonnel.userId ||
        existingLinkedPersonnel.userId.toString() !== user._id.toString();

      if (isStaleUserLink) {
        user.personnelId = null;
      } else {
        return res.status(409).json({
          success: false,
          code: 'USER_ALREADY_LINKED',
          message: 'Cet utilisateur est déjà associé à une autre fiche Personnel'
        });
      }
    }

    // Sauvegarder l'état initial pour le pattern de compensation
    const originalPersonnelUserId = personnel.userId;
    const originalPersonnelStatut = personnel.statut;
    const originalUserPersonnelId = user.personnelId;

    // g. Mettre à jour les références
    personnel.userId = user._id;
    personnel.statut = user.isActive === false ? 'inactif' : 'actif';
    user.personnelId = personnel._id;

    // Initialiser l'historique d'affectation si vide (compatibilité anciens dossiers)
    await seedInitialAffectationIfEmpty(personnel);

    // Synchronisation du département lors de la liaison (non applicable à AdminTuningDesk)
    if (user.role !== 'AdminTuningDesk' && personnel.activeDepartment) {
      user.activeDepartment = personnel.activeDepartment;
      const deptIdStr = personnel.activeDepartment.toString();
      if (user.role === 'User' || user.role === 'Director') {
        user.departments = [personnel.activeDepartment];
      } else {
        const deptExists = (user.departments || []).some(
          d => (d._id || d).toString() === deptIdStr
        );
        if (!deptExists) {
          user.departments = user.departments || [];
          user.departments.push(personnel.activeDepartment);
        }
      }
    } else if (user.role === 'AdminTuningDesk') {
      user.departments = [];
      user.activeDepartment = null;
    }

    // h. Sauvegarde atomique avec Transaction Mongoose et Fallback par compensation
    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      await personnel.save({ session });
      await user.save({ session });
      await session.commitTransaction();
    } catch (txError) {
      if (session) {
        await session.abortTransaction().catch(() => {});
      }

      const isStandalone = txError.message && (
        txError.message.includes('replica set') ||
        txError.message.includes('Transaction numbers are only allowed') ||
        txError.code === 20 ||
        txError.codeName === 'IllegalOperation'
      );

      if (isStandalone) {
        // Fallback par compensation pour les instances MongoDB standalone
        await personnel.save();
        try {
          await user.save();
        } catch (userSaveErr) {
          // Annulation atomique directe de la première sauvegarde
          await Personnel.updateOne(
            { _id: personnel._id },
            { $set: { userId: originalPersonnelUserId || null, statut: originalPersonnelStatut } }
          ).catch(() => {});
          personnel.userId = originalPersonnelUserId;
          personnel.statut = originalPersonnelStatut;
          user.personnelId = originalUserPersonnelId;
          throw userSaveErr;
        }
      } else {
        throw txError;
      }
    } finally {
      if (session) {
        session.endSession().catch(() => {});
      }
    }

    await logAuditAction(
      'personnel_link_user',
      'Personnel',
      personnel._id.toString(),
      req.user?._id || req.user?.id,
      req.user,
      { linkedUserId: user._id.toString(), username: user.username },
      req.ip
    );

    // i. Retourner { success: true, data: { personnel, user } }
    res.status(200).json({
      success: true,
      data: {
        personnel,
        user
      }
    });
  } catch (error) {
    if (error && (error.code === 11000 || (typeof error.message === 'string' && error.message.includes('E11000')))) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_KEY_E11000',
        message: 'Cet employé est déjà lié à un autre compte, ou un ancien compte supprimé bloque la liaison. Veuillez vérifier la base de données.'
      });
    }
    next(error);
  }
};

// @desc    Téléverser la photo d'un personnel
// @route   PUT /api/hr/personnel/:id/photo
// @access  Private (Admin, Director, AdminDepartment RH)
exports.uploadPersonnelPhotoFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.warn('Erreur lors du nettoyage du fichier uploadé:', unlinkErr.message);
        }
      }
      return res.status(400).json({
        success: false,
        message: 'Identifiant de personnel invalide'
      });
    }

    const personnel = await Personnel.findOne({ _id: id, isDeleted: { $ne: true } });

    if (!personnel) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.warn('Erreur lors du nettoyage du fichier uploadé:', unlinkErr.message);
        }
      }
      return res.status(404).json({
        success: false,
        message: 'Fiche de personnel introuvable'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez sélectionner un fichier image'
      });
    }

    // Supprimer l'ancienne photo physique si elle existe et n'est pas vide
    if (personnel.photo) {
      try {
        const oldPhotoPath = path.join(__dirname, '..', personnel.photo);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      } catch (unlinkErr) {
        console.warn('Erreur lors de la suppression de l\'ancienne photo:', unlinkErr.message);
      }
    }

    // Construire le chemin d'accès relatif
    const photoPath = `/uploads/personnelphoto/${req.file.filename}`;
    personnel.photo = photoPath;
    await personnel.save();

    await logAuditAction(
      'personnel_photo_upload',
      'Personnel',
      personnel._id.toString(),
      req.user?._id || req.user?.id,
      req.user,
      { photo: personnel.photo },
      req.ip
    );

    res.status(200).json({
      success: true,
      data: {
        photo: personnel.photo
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadPersonnelPhoto = exports.uploadPersonnelPhotoFile;


