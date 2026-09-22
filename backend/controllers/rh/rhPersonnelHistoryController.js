const mongoose = require('mongoose');
const Personnel = require('../../models/Personnel');
const RHPromotion = require('../../models/rh/RHPromotion');
const RHPoste = require('../../models/rh/RHPoste');
const RHDiplome = require('../../models/rh/RHDiplome');
const RHSanction = require('../../models/rh/RHSanction');

// ============================================================
// 1. PROMOTIONS (الترقيات)
// ============================================================

// @desc    Obtenir les promotions d'un personnel
// @route   GET /api/hr/personnel/:personnelId/promotions
// @access  Private
exports.getPromotionsByPersonnel = async (req, res, next) => {
  try {
    const { personnelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant du personnel invalide'
      });
    }

    const promotions = await RHPromotion.find({ personnelId })
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .sort({ datePromotion: -1 });

    res.status(200).json({
      success: true,
      count: promotions.length,
      data: promotions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer une promotion pour un personnel
// @route   POST /api/hr/personnel/:personnelId/promotions
// @access  Private (Admin, SuperAdmin, AdminDepartment)
exports.createPromotion = async (req, res, next) => {
  try {
    const { personnelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant du personnel invalide'
      });
    }

    const personnel = await Personnel.findById(personnelId);
    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Fiche du personnel introuvable'
      });
    }

    const {
      gradePrecedent,
      gradeNouveau,
      datePromotion,
      reference,
      motif,
      observations
    } = req.body;

    if (!gradeNouveau || !datePromotion) {
      return res.status(400).json({
        success: false,
        message: 'Les champs gradeNouveau et datePromotion sont obligatoires'
      });
    }

    const newPromotion = await RHPromotion.create({
      personnelId,
      gradePrecedent: gradePrecedent || '',
      gradeNouveau: gradeNouveau.trim(),
      datePromotion,
      reference: reference || '',
      motif: motif || '',
      observations: observations || '',
      createdBy: req.user ? req.user._id : null,
      updatedBy: req.user ? req.user._id : null
    });

    res.status(201).json({
      success: true,
      message: 'Promotion créée avec succès',
      data: newPromotion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour une promotion
// @route   PUT /api/hr/promotions/:id
// @access  Private (Admin, SuperAdmin, AdminDepartment)
exports.updatePromotion = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de promotion invalide'
      });
    }

    const updateData = { ...req.body };
    if (req.user) {
      updateData.updatedBy = req.user._id;
    }

    const promotion = await RHPromotion.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion introuvable'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Promotion mise à jour avec succès',
      data: promotion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer une promotion
// @route   DELETE /api/hr/promotions/:id
// @access  Private (Admin, SuperAdmin, AdminDepartment)
exports.deletePromotion = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de promotion invalide'
      });
    }

    const promotion = await RHPromotion.findByIdAndDelete(id);
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion introuvable'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Promotion supprimée avec succès'
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. POSTES (الخطط)
// ============================================================

// @desc    Obtenir les affectations/postes d'un personnel
// @route   GET /api/hr/personnel/:personnelId/postes
// @access  Private
exports.getPostesByPersonnel = async (req, res, next) => {
  try {
    const { personnelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant du personnel invalide'
      });
    }

    const postes = await RHPoste.find({ personnelId })
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .sort({ dateDebut: -1 });

    res.status(200).json({
      success: true,
      count: postes.length,
      data: postes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer un poste/affectation pour un personnel
// @route   POST /api/hr/personnel/:personnelId/postes
// @access  Private (Admin, SuperAdmin, AdminDepartment)
exports.createPoste = async (req, res, next) => {
  try {
    const { personnelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant du personnel invalide'
      });
    }

    const personnel = await Personnel.findById(personnelId);
    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Fiche du personnel introuvable'
      });
    }

    const {
      poste,
      dateDebut,
      dateFin,
      reference,
      lieu,
      observations
    } = req.body;

    if (!poste || !dateDebut) {
      return res.status(400).json({
        success: false,
        message: 'Les champs poste et dateDebut sont obligatoires'
      });
    }

    const newPoste = await RHPoste.create({
      personnelId,
      poste: poste.trim(),
      dateDebut,
      dateFin: dateFin || null,
      reference: reference || '',
      lieu: lieu || '',
      observations: observations || '',
      createdBy: req.user ? req.user._id : null,
      updatedBy: req.user ? req.user._id : null
    });

    res.status(201).json({
      success: true,
      message: 'Poste créé avec succès',
      data: newPoste
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour un poste
// @route   PUT /api/hr/postes/:id
// @access  Private (Admin, SuperAdmin, AdminDepartment)
exports.updatePoste = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de poste invalide'
      });
    }

    const updateData = { ...req.body };
    if (req.user) {
      updateData.updatedBy = req.user._id;
    }

    const poste = await RHPoste.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!poste) {
      return res.status(404).json({
        success: false,
        message: 'Poste introuvable'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Poste mis à jour avec succès',
      data: poste
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer un poste
// @route   DELETE /api/hr/postes/:id
// @access  Private (Admin, SuperAdmin, AdminDepartment)
exports.deletePoste = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de poste invalide'
      });
    }

    const poste = await RHPoste.findByIdAndDelete(id);
    if (!poste) {
      return res.status(404).json({
        success: false,
        message: 'Poste introuvable'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Poste supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. DIPLOMES (الشهادات)
// ============================================================

// @desc    Obtenir les diplômes d'un personnel
// @route   GET /api/hr/personnel/:personnelId/diplomes
// @access  Private
exports.getDiplomesByPersonnel = async (req, res, next) => {
  try {
    const { personnelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant du personnel invalide'
      });
    }

    const diplomes = await RHDiplome.find({ personnelId })
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .sort({ dateObtention: -1 });

    res.status(200).json({
      success: true,
      count: diplomes.length,
      data: diplomes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer un diplôme pour un personnel
// @route   POST /api/hr/personnel/:personnelId/diplomes
// @access  Private (Admin, SuperAdmin, AdminDepartment)
exports.createDiplome = async (req, res, next) => {
  try {
    const { personnelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant du personnel invalide'
      });
    }

    const personnel = await Personnel.findById(personnelId);
    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Fiche du personnel introuvable'
      });
    }

    const {
      typeDiplome,
      sujetDiplome,
      dateObtention,
      etablissement,
      reference,
      niveau,
      observations
    } = req.body;

    if (!typeDiplome || !sujetDiplome || !dateObtention) {
      return res.status(400).json({
        success: false,
        message: 'Les champs typeDiplome, sujetDiplome et dateObtention sont obligatoires'
      });
    }

    const newDiplome = await RHDiplome.create({
      personnelId,
      typeDiplome: typeDiplome.trim(),
      sujetDiplome: sujetDiplome.trim(),
      dateObtention,
      etablissement: etablissement || '',
      reference: reference || '',
      niveau: niveau || '',
      observations: observations || '',
      createdBy: req.user ? req.user._id : null,
      updatedBy: req.user ? req.user._id : null
    });

    res.status(201).json({
      success: true,
      message: 'Diplôme créé avec succès',
      data: newDiplome
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour un diplôme
// @route   PUT /api/hr/diplomes/:id
// @access  Private (Admin, SuperAdmin, AdminDepartment)
exports.updateDiplome = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de diplôme invalide'
      });
    }

    const updateData = { ...req.body };
    if (req.user) {
      updateData.updatedBy = req.user._id;
    }

    const diplome = await RHDiplome.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!diplome) {
      return res.status(404).json({
        success: false,
        message: 'Diplôme introuvable'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Diplôme mis à jour avec succès',
      data: diplome
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer un diplôme
// @route   DELETE /api/hr/diplomes/:id
// @access  Private (Admin, SuperAdmin, AdminDepartment)
exports.deleteDiplome = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de diplôme invalide'
      });
    }

    const diplome = await RHDiplome.findByIdAndDelete(id);
    if (!diplome) {
      return res.status(404).json({
        success: false,
        message: 'Diplôme introuvable'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Diplôme supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. SANCTIONS (العقوبات)
// ============================================================

// @desc    Obtenir les sanctions d'un personnel
// @route   GET /api/hr/personnel/:personnelId/sanctions
// @access  Private
exports.getSanctionsByPersonnel = async (req, res, next) => {
  try {
    const { personnelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant du personnel invalide'
      });
    }

    const sanctions = await RHSanction.find({ personnelId })
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .sort({ dateSanction: -1 });

    res.status(200).json({
      success: true,
      count: sanctions.length,
      data: sanctions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer une sanction pour un personnel
// @route   POST /api/hr/personnel/:personnelId/sanctions
// @access  Private (Admin, SuperAdmin, AdminDepartment)
exports.createSanction = async (req, res, next) => {
  try {
    const { personnelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant du personnel invalide'
      });
    }

    const personnel = await Personnel.findById(personnelId);
    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Fiche du personnel introuvable'
      });
    }

    const {
      dateSanction,
      nombreJours,
      raison,
      typeSanction,
      reference,
      observations
    } = req.body;

    if (!dateSanction || !raison) {
      return res.status(400).json({
        success: false,
        message: 'Les champs dateSanction et raison sont obligatoires'
      });
    }

    const newSanction = await RHSanction.create({
      personnelId,
      dateSanction,
      nombreJours: Number(nombreJours) || 0,
      raison: raison.trim(),
      typeSanction: typeSanction || '',
      reference: reference || '',
      observations: observations || '',
      createdBy: req.user ? req.user._id : null,
      updatedBy: req.user ? req.user._id : null
    });

    res.status(201).json({
      success: true,
      message: 'Sanction créée avec succès',
      data: newSanction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour une sanction
// @route   PUT /api/hr/sanctions/:id
// @access  Private (Admin, SuperAdmin, AdminDepartment)
exports.updateSanction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de sanction invalide'
      });
    }

    const updateData = { ...req.body };
    if (updateData.nombreJours !== undefined) {
      updateData.nombreJours = Number(updateData.nombreJours) || 0;
    }
    if (req.user) {
      updateData.updatedBy = req.user._id;
    }

    const sanction = await RHSanction.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!sanction) {
      return res.status(404).json({
        success: false,
        message: 'Sanction introuvable'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Sanction mise à jour avec succès',
      data: sanction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer une sanction
// @route   DELETE /api/hr/sanctions/:id
// @access  Private (Admin, SuperAdmin, AdminDepartment)
exports.deleteSanction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de sanction invalide'
      });
    }

    const sanction = await RHSanction.findByIdAndDelete(id);
    if (!sanction) {
      return res.status(404).json({
        success: false,
        message: 'Sanction introuvable'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Sanction supprimée avec succès'
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 5. FONCTION AGRÉGÉE (FULL HISTORY)
// ============================================================

// @desc    Obtenir l'historique complet d'un personnel (promotions, postes, diplômes, sanctions)
// @route   GET /api/hr/personnel/:personnelId/full-history
// @access  Private
exports.getFullPersonnelHistory = async (req, res, next) => {
  try {
    const { personnelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant du personnel invalide'
      });
    }

    const [promotions, postes, diplomes, sanctions] = await Promise.all([
      RHPromotion.find({ personnelId })
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email')
        .sort({ datePromotion: -1 }),
      RHPoste.find({ personnelId })
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email')
        .sort({ dateDebut: -1 }),
      RHDiplome.find({ personnelId })
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email')
        .sort({ dateObtention: -1 }),
      RHSanction.find({ personnelId })
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email')
        .sort({ dateSanction: -1 })
    ]);

    res.status(200).json({
      success: true,
      data: {
        promotions,
        postes,
        diplomes,
        sanctions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir l'historique complet de MON propre profil
// @route   GET /api/hr/my-profile/full-history
// @access  Private (User authentifié)
exports.getMyFullHistory = async (req, res, next) => {
  try {
    // 1. Trouver le personnel lié à l'utilisateur connecté
    let personnel = null;

    if (req.user && req.user.personnelId) {
      personnel = await Personnel.findById(req.user.personnelId)
        .populate('activeDepartment', 'name description')
        .populate('departments', 'name');
    }

    if (!personnel && req.user) {
      const userId = req.user._id || req.user.id;
      personnel = await Personnel.findOne({ userId })
        .populate('activeDepartment', 'name description')
        .populate('departments', 'name');
    }

    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Aucune fiche personnel liée à votre compte'
      });
    }

    // 2. Charger tous les historiques
    const RHStage = require('../../models/RHStage');
    const [promotions, postes, diplomes, sanctions, stages] =
      await Promise.all([
        RHPromotion.find({ personnelId: personnel._id }).sort({ datePromotion: -1 }),
        RHPoste.find({ personnelId: personnel._id }).sort({ dateDebut: -1 }),
        RHDiplome.find({ personnelId: personnel._id }).sort({ dateObtention: -1 }),
        RHSanction.find({ personnelId: personnel._id }).sort({ dateSanction: -1 }),
        RHStage.find({ personnelId: personnel._id, isDeleted: { $ne: true } })
          .populate('ecoleId', 'nom nomAr pays')
          .populate('typeFormationId', 'nom nomAr code')
          .sort({ dateDebut: -1 })
      ]);

    // 3. Grouper les stages par localisation
    const stagesTunisie = stages.filter(s => s.localisation === 'tunisie');
    const stagesEtranger = stages.filter(s => s.localisation === 'etranger');

    // 4. Retourner le tout
    res.status(200).json({
      success: true,
      data: {
        personnel,
        promotions: promotions || [],
        postes: postes || [],
        diplomes: diplomes || [],
        sanctions: sanctions || [],
        stagesTunisie: stagesTunisie || [],
        stagesEtranger: stagesEtranger || []
      }
    });
  } catch (error) {
    next(error);
  }
};

