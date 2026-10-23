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
      typeEngagement,
      origineEngagement,
      niveauEtude,
      diplomeBase,
      specialite,
      arme,
      posteActuel,
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
    if (activeDepartment) {
      if (!mongoose.Types.ObjectId.isValid(activeDepartment)) {
        return res.status(400).json({
          success: false,
          message: 'Identifiant de département invalide'
        });
      }
      const deptExists = await Department.findById(activeDepartment);
      if (!deptExists) {
        return res.status(404).json({
          success: false,
          message: 'Le département spécifié est introuvable'
        });
      }
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
      emailPersonnel: emailPersonnel ? emailPersonnel.trim().toLowerCase() : '',
      poste: poste ? poste.trim() : '',
      activeDepartment: activeDepartment || null,
      departments: Array.isArray(departments) ? departments : [],
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
      posteActuel: posteActuel ? posteActuel.trim() : '',
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
      createdBy: req.user ? (req.user._id || req.user.id) : null
    };

    const personnel = await Personnel.create(personnelData);

    res.status(201).json({
      success: true,
      data: personnel
    });
  } catch (error) {
    if (error.code === 11000) {
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

    // Filtrer par département si l'utilisateur est AdminDept non-RH
    if (req.user && req.user.role === 'AdminDepartment') {
      // Vérifier si RH
      const settings = await OrganizationSettings.findOne();
      const rhDeptId = settings?.rhDepartmentId?.toString();
      const userDeptId = (req.user.activeDepartment?._id || req.user.activeDepartment)?.toString();

      const isRH = Boolean(rhDeptId && userDeptId && userDeptId === rhDeptId);

      if (!isRH) {
        // AdminDept non-RH : filtrer par SON département
        query.activeDepartment = req.user.activeDepartment?._id || req.user.activeDepartment;
      } else if (req.query.activeDepartment) {
        // Si RH avec filtre spécifique
        query.activeDepartment = req.query.activeDepartment;
      }
    } else if (req.query.activeDepartment) {
      // Admin et Director : pas de filtre par défaut → voit tout, sauf si req.query.activeDepartment
      query.activeDepartment = req.query.activeDepartment;
    }

    // Filtre de recherche textuelle (nom, prenom, cin)
    if (req.query.search) {
      const safeSearch = sanitizeSearchQuery(req.query.search);
      if (safeSearch) {
        const searchRegex = new RegExp(safeSearch, 'i');
        query.$or = [
          { nom: searchRegex },
          { prenom: searchRegex },
          { cin: searchRegex }
        ];
      }
    }

    // Filtre par statut
    if (req.query.statut) {
      query.statut = req.query.statut;
    }

    const total = await Personnel.countDocuments(query);
    const pages = Math.ceil(total / limit) || 1;

    // Pas de populate sur userId ici pour préserver les performances
    const personnelList = await Personnel.find(query)
      .populate('activeDepartment', 'name code description')
      .populate('departments', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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
      .populate('userId', 'username email role isActive');

    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Fiche de personnel introuvable'
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

    // Validation activeDepartment si mis à jour
    if (req.body.activeDepartment) {
      if (!mongoose.Types.ObjectId.isValid(req.body.activeDepartment)) {
        return res.status(400).json({
          success: false,
          message: 'Identifiant de département invalide'
        });
      }
    }

    await personnel.save();

    const updatedPersonnel = await Personnel.findById(id)
      .populate('activeDepartment', 'name description')
      .populate('departments', 'name');

    res.status(200).json({
      success: true,
      data: updatedPersonnel
    });
  } catch (error) {
    if (error.code === 11000) {
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
      personnel = await Personnel.findById(req.user.personnelId)
        .populate('activeDepartment', 'name description')
        .populate('departments', 'name');
    }

    // 2. Recherche par userId au cas où personnelId n'est pas encore synchronisé sur req.user
    if (!personnel && req.user) {
      const userId = req.user._id || req.user.id;
      personnel = await Personnel.findOne({ userId })
        .populate('activeDepartment', 'name description')
        .populate('departments', 'name');
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
      personnel = await Personnel.findById(req.user.personnelId);
    }

    // 2. Recherche par userId en fallback
    if (!personnel && req.user) {
      const userId = req.user._id || req.user.id;
      personnel = await Personnel.findOne({ userId });
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
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable'
      });
    }

    // d. Vérifier que la fiche Personnel n'est pas déjà liée à un AUTRE compte
    if (personnel.userId && personnel.userId.toString() !== userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cette fiche Personnel est déjà associée à un autre compte utilisateur'
      });
    }

    // e. Vérifier que le User n'est pas déjà lié à une AUTRE fiche Personnel
    if (user.personnelId && user.personnelId.toString() !== personnelId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cet utilisateur est déjà associé à une autre fiche Personnel'
      });
    }

    // f. Mettre à jour :
    // • Personnel.userId = userId
    // • Personnel.statut = 'actif'
    // • User.personnelId = personnelId
    personnel.userId = user._id;
    personnel.statut = 'actif';
    user.personnelId = personnel._id;

    // g. Sauvegarder les deux documents
    await personnel.save();
    await user.save();

    // h. Retourner { success: true, data: { personnel, user } }
    res.status(200).json({
      success: true,
      data: {
        personnel,
        user
      }
    });
  } catch (error) {
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


