const mongoose = require('mongoose');
const RHStage = require('../../models/RHStage');

// ============================================================
// STAGES RH (RHStage)
// ============================================================

// @desc    Obtenir la liste de tous les stages avec filtres et pagination
// @route   GET /api/hr/stages
// @access  Private
exports.getAllStages = async (req, res, next) => {
  try {
    const filter = { isDeleted: { $ne: true } };

    if (req.query.personnelId) {
      if (mongoose.Types.ObjectId.isValid(req.query.personnelId)) {
        filter.personnelId = req.query.personnelId;
      }
    }

    if (req.query.localisation) {
      filter.localisation = req.query.localisation;
    }

    if (req.query.statut) {
      filter.statut = req.query.statut;
    }

    if (req.query.annee) {
      const year = parseInt(req.query.annee, 10);
      if (!isNaN(year)) {
        filter.dateDebut = {
          $gte: new Date(year, 0, 1),
          $lte: new Date(year, 11, 31, 23, 59, 59, 999)
        };
      }
    }

    if (req.query.search) {
      const regex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { sujetStage: regex },
        { lieuStage: regex }
      ];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const total = await RHStage.countDocuments(filter);
    const stages = await RHStage.find(filter)
      .populate('personnelId', 'nom prenom cin matricule poste')
      .populate('ecoleId', 'nom nomAr pays ville type')
      .populate('typeFormationId', 'code nom nomAr categorie')
      .populate('sourceDocumentId', 'serialNumber year correspondenceNumber subject')
      .populate('createdBy', 'username email')
      .sort({ dateDebut: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: stages.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: stages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir le détail d'un stage par son ID
// @route   GET /api/hr/stages/:id
// @access  Private
exports.getStageById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de stage invalide'
      });
    }

    const stage = await RHStage.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('personnelId', 'nom prenom cin matricule poste activeDepartment')
      .populate('ecoleId', 'nom nomAr pays ville type telephone email description')
      .populate('typeFormationId', 'code nom nomAr categorie dureeReference description')
      .populate('sourceDocumentId', 'serialNumber year correspondenceNumber correspondenceDate subject source')
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email');

    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage introuvable'
      });
    }

    res.status(200).json({
      success: true,
      data: stage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer un stage (Cas A : via document source, ou Cas B : historique manuel)
// @route   POST /api/hr/stages
// @access  Private (Admin, Director, AdminDepartment)
exports.createStage = async (req, res, next) => {
  try {
    const {
      personnelId,
      sessionFormationId,
      sourceDocumentId,
      localisation,
      pays,
      lieuStage,
      sujetStage,
      typeFormationId,
      ecoleId,
      dateDebut,
      dateFin,
      numeroRoute,
      numeroStage,
      statut,
      resultat,
      mention,
      documents,
      observations
    } = req.body;

    // Validation des champs requis
    if (!personnelId || !lieuStage || !sujetStage || !dateDebut || !dateFin) {
      return res.status(400).json({
        success: false,
        message: 'Les champs personnelId, lieuStage, sujetStage, dateDebut et dateFin sont obligatoires'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant personnel invalide'
      });
    }

    const loc = localisation || 'tunisie';

    const stageData = {
      personnelId,
      sessionFormationId: sessionFormationId && mongoose.Types.ObjectId.isValid(sessionFormationId) ? sessionFormationId : null,
      sourceDocumentId: sourceDocumentId && mongoose.Types.ObjectId.isValid(sourceDocumentId) ? sourceDocumentId : null,
      localisation: loc,
      pays: pays !== undefined ? pays.trim() : (loc === 'tunisie' ? 'تونس' : ''),
      lieuStage: lieuStage.trim(),
      sujetStage: sujetStage.trim(),
      typeFormationId: typeFormationId && mongoose.Types.ObjectId.isValid(typeFormationId) ? typeFormationId : null,
      ecoleId: ecoleId && mongoose.Types.ObjectId.isValid(ecoleId) ? ecoleId : null,
      dateDebut: new Date(dateDebut),
      dateFin: new Date(dateFin),
      numeroRoute: numeroRoute !== undefined ? numeroRoute.trim() : '',
      numeroStage: numeroStage !== undefined ? numeroStage.trim() : '',
      statut: statut || 'acheve',
      resultat: resultat !== undefined ? resultat : '',
      mention: mention !== undefined ? mention.trim() : '',
      documents: Array.isArray(documents) ? documents : [],
      observations: observations !== undefined ? observations.trim() : '',
      createdBy: req.user ? req.user._id : null,
      updatedBy: req.user ? req.user._id : null
    };

    const newStage = await RHStage.create(stageData);

    const populatedStage = await RHStage.findById(newStage._id)
      .populate('personnelId', 'nom prenom cin matricule')
      .populate('ecoleId', 'nom nomAr pays ville')
      .populate('typeFormationId', 'code nom nomAr')
      .populate('sourceDocumentId', 'serialNumber year subject');

    res.status(201).json({
      success: true,
      data: populatedStage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour un stage existant
// @route   PUT /api/hr/stages/:id
// @access  Private (Admin, Director, AdminDepartment)
exports.updateStage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de stage invalide'
      });
    }

    const stage = await RHStage.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage introuvable'
      });
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user ? req.user._id : null
    };

    // Protection des champs système
    delete updateData.isDeleted;
    delete updateData.createdBy;

    // Normalisation des dates si présentes
    if (updateData.dateDebut) updateData.dateDebut = new Date(updateData.dateDebut);
    if (updateData.dateFin) updateData.dateFin = new Date(updateData.dateFin);

    const updatedStage = await RHStage.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('personnelId', 'nom prenom cin matricule')
      .populate('ecoleId', 'nom nomAr pays ville')
      .populate('typeFormationId', 'code nom nomAr')
      .populate('sourceDocumentId', 'serialNumber year subject');

    res.status(200).json({
      success: true,
      data: updatedStage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer un stage (Soft delete)
// @route   DELETE /api/hr/stages/:id
// @access  Private (Admin, Director, AdminDepartment)
exports.deleteStage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de stage invalide'
      });
    }

    const stage = await RHStage.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage introuvable'
      });
    }

    let warning = null;
    if (stage.sessionFormationId) {
      warning = 'Attention : ce stage était associé à une session de formation planifiée';
    }

    stage.isDeleted = true;
    stage.updatedBy = req.user ? req.user._id : null;
    await stage.save();

    res.status(200).json({
      success: true,
      message: 'Stage supprimé avec succès',
      ...(warning && { warning })
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir la liste des stages d'un personnel groupés par localisation
// @route   GET /api/hr/personnel/:personnelId/stages
// @access  Private
exports.getStagesByPersonnel = async (req, res, next) => {
  try {
    const { personnelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de personnel invalide'
      });
    }

    const stages = await RHStage.find({
      personnelId,
      isDeleted: { $ne: true }
    })
      .populate('ecoleId', 'nom nomAr pays ville type')
      .populate('typeFormationId', 'code nom nomAr categorie')
      .populate('sourceDocumentId', 'serialNumber year correspondenceNumber subject')
      .sort({ dateDebut: -1 });

    const grouped = {
      tunisie: stages.filter(s => s.localisation === 'tunisie'),
      etranger: stages.filter(s => s.localisation === 'etranger')
    };

    res.status(200).json({
      success: true,
      count: stages.length,
      data: grouped
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir la liste des stages liés à une session
// @route   GET /api/hr/sessions/:sessionId/stages
// @access  Private
exports.getStagesBySession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de session invalide'
      });
    }

    const stages = await RHStage.find({
      sessionFormationId: sessionId,
      isDeleted: { $ne: true }
    })
      .populate('personnelId', 'nom prenom cin matricule poste')
      .populate('ecoleId', 'nom nomAr')
      .populate('typeFormationId', 'code nom nomAr')
      .sort({ dateDebut: -1 });

    res.status(200).json({
      success: true,
      count: stages.length,
      data: stages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Statistiques des stages
// @route   GET /api/hr/stages/stats
// @access  Private
exports.getStagesStats = async (req, res, next) => {
  try {
    const filter = { isDeleted: { $ne: true } };

    if (req.query.annee) {
      const year = parseInt(req.query.annee, 10);
      if (!isNaN(year)) {
        filter.dateDebut = {
          $gte: new Date(year, 0, 1),
          $lte: new Date(year, 11, 31, 23, 59, 59, 999)
        };
      }
    }

    const total = await RHStage.countDocuments(filter);
    const tunisieCount = await RHStage.countDocuments({ ...filter, localisation: 'tunisie' });
    const etrangerCount = await RHStage.countDocuments({ ...filter, localisation: 'etranger' });

    const statuts = ['inscrit', 'en_cours', 'acheve', 'suspendu', 'abandonne'];
    const parStatut = {};
    for (const st of statuts) {
      parStatut[st] = await RHStage.countDocuments({ ...filter, statut: st });
    }

    const resultats = ['admis', 'refuse', 'en_attente'];
    const parResultat = {};
    for (const resItem of resultats) {
      parResultat[resItem] = await RHStage.countDocuments({ ...filter, resultat: resItem });
    }

    res.status(200).json({
      success: true,
      data: {
        total,
        parLocalisation: {
          tunisie: tunisieCount,
          etranger: etrangerCount
        },
        parStatut,
        parResultat
      }
    });
  } catch (error) {
    next(error);
  }
};
