const mongoose = require('mongoose');
const OrganizationSettings = require('../models/OrganizationSettings');
const Department = require('../models/Department');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Obtenir les paramètres de l'organisation (singleton)
// @route   GET /api/organization-settings
// @access  Private (tous les utilisateurs authentifiés)
exports.getOrganizationSettings = async (req, res, next) => {
  try {
    let settings = await OrganizationSettings.findOne();

    if (!settings) {
      settings = await OrganizationSettings.create({
        nomAdministration: '',
        logoAdministration: '',
        rhDepartmentId: null,
        typesAssociationPersonnel: ['Stage', 'Formation', 'Diplôme', 'Autre'],
        dateInitialisation: new Date(),
        misAJourPar: null
      });
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour les paramètres de l'organisation
// @route   PUT /api/organization-settings
// @access  Private (Admin, SuperAdmin)
exports.updateOrganizationSettings = async (req, res, next) => {
  try {
    const { nomAdministration, logoAdministration, typesAssociationPersonnel } = req.body;

    let settings = await OrganizationSettings.findOne();

    if (!settings) {
      settings = new OrganizationSettings({
        nomAdministration: '',
        logoAdministration: '',
        rhDepartmentId: null,
        typesAssociationPersonnel: ['Stage', 'Formation', 'Diplôme', 'Autre'],
        dateInitialisation: new Date(),
        misAJourPar: null
      });
    }

    if (nomAdministration !== undefined) {
      settings.nomAdministration = typeof nomAdministration === 'string' ? nomAdministration.trim() : nomAdministration;
    }

    if (logoAdministration !== undefined) {
      settings.logoAdministration = logoAdministration;
    }

    if (typesAssociationPersonnel !== undefined) {
      if (!Array.isArray(typesAssociationPersonnel)) {
        return res.status(400).json({
          success: false,
          message: 'typesAssociationPersonnel doit être un tableau de chaînes de caractères'
        });
      }
      settings.typesAssociationPersonnel = typesAssociationPersonnel;
    }

    settings.misAJourPar = req.user ? (req.user._id || req.user.id) : null;

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Définir le département RH
// @route   PUT /api/organization-settings/rh-department
// @access  Private (Admin, SuperAdmin)
exports.setRhDepartment = async (req, res, next) => {
  try {
    const { rhDepartmentId } = req.body;

    if (!rhDepartmentId) {
      return res.status(400).json({
        success: false,
        message: "L'identifiant du département RH (rhDepartmentId) est requis"
      });
    }

    // Vérifier la validité du format ObjectId
    if (!mongoose.Types.ObjectId.isValid(rhDepartmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de département invalide'
      });
    }

    // Valider que le département existe dans la collection Department
    const department = await Department.findById(rhDepartmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: `Département introuvable avec l'identifiant : ${rhDepartmentId}`
      });
    }

    let settings = await OrganizationSettings.findOne();

    if (!settings) {
      settings = new OrganizationSettings({
        nomAdministration: '',
        logoAdministration: '',
        rhDepartmentId: null,
        typesAssociationPersonnel: ['Stage', 'Formation', 'Diplôme', 'Autre'],
        dateInitialisation: new Date(),
        misAJourPar: null
      });
    }

    settings.rhDepartmentId = department._id;
    settings.misAJourPar = req.user ? (req.user._id || req.user.id) : null;

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir la liste des types d'association disponibles
// @route   GET /api/organization-settings/types-association
// @access  Private (tous les utilisateurs authentifiés)
exports.getTypesAssociation = async (req, res, next) => {
  try {
    let settings = await OrganizationSettings.findOne();

    if (!settings) {
      settings = await OrganizationSettings.create({
        nomAdministration: '',
        logoAdministration: '',
        rhDepartmentId: null,
        typesAssociationPersonnel: ['Stage', 'Formation', 'Diplôme', 'Autre'],
        dateInitialisation: new Date(),
        misAJourPar: null
      });
    }

    res.status(200).json({
      success: true,
      data: settings.typesAssociationPersonnel || ['Stage', 'Formation', 'Diplôme', 'Autre']
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Définir les départements transversaux (Bureau Directeur et Bureau d'Ordre)
// @route   PUT /api/organization-settings/bureau-departments
// @access  Private (Admin, SuperAdmin)
exports.setBureauDepartments = async (req, res, next) => {
  try {
    const { bureauDirecteurDepartmentId, bureauOrdreDepartmentId } = req.body;

    // Validation bureauDirecteurDepartmentId (si fourni et non null)
    if (bureauDirecteurDepartmentId !== undefined && bureauDirecteurDepartmentId !== null) {
      if (!mongoose.Types.ObjectId.isValid(bureauDirecteurDepartmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Identifiant invalide pour bureauDirecteurDepartmentId'
        });
      }

      const bureauDirecteurDept = await Department.findById(bureauDirecteurDepartmentId);
      if (!bureauDirecteurDept) {
        return res.status(404).json({
          success: false,
          message: `Département Bureau Directeur introuvable avec l'identifiant : ${bureauDirecteurDepartmentId}`
        });
      }
    }

    // Validation bureauOrdreDepartmentId (si fourni et non null)
    if (bureauOrdreDepartmentId !== undefined && bureauOrdreDepartmentId !== null) {
      if (!mongoose.Types.ObjectId.isValid(bureauOrdreDepartmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Identifiant invalide pour bureauOrdreDepartmentId'
        });
      }

      const bureauOrdreDept = await Department.findById(bureauOrdreDepartmentId);
      if (!bureauOrdreDept) {
        return res.status(404).json({
          success: false,
          message: `Département Bureau d'Ordre introuvable avec l'identifiant : ${bureauOrdreDepartmentId}`
        });
      }
    }

    // Récupérer (ou créer) le document OrganizationSettings
    let settings = await OrganizationSettings.findOne();

    if (!settings) {
      settings = new OrganizationSettings({
        nomAdministration: '',
        logoAdministration: '',
        rhDepartmentId: null,
        bureauDirecteurDepartmentId: null,
        bureauOrdreDepartmentId: null,
        typesAssociationPersonnel: ['Stage', 'Formation', 'Diplôme', 'Autre'],
        dateInitialisation: new Date(),
        misAJourPar: null
      });
    }

    // Mettre à jour les champs (uniquement ceux fournis dans le body)
    if (bureauDirecteurDepartmentId !== undefined) {
      settings.bureauDirecteurDepartmentId = bureauDirecteurDepartmentId;
    }

    if (bureauOrdreDepartmentId !== undefined) {
      settings.bureauOrdreDepartmentId = bureauOrdreDepartmentId;
    }

    settings.misAJourPar = req.user ? (req.user._id || req.user.id) : null;

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};
