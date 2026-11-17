const mongoose = require('mongoose');
const RHEcole = require('../../models/RHEcole');
const RHTypeFormation = require('../../models/RHTypeFormation');

// ============================================================
// ÉCOLES DE FORMATION (RHEcole)
// ============================================================

// @desc    Obtenir la liste des écoles de formation
// @route   GET /api/hr/references/ecoles
// @access  Private
exports.getEcoles = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.pays) {
      filter.pays = req.query.pays;
    }

    const ecoles = await RHEcole.find(filter)
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: ecoles.length,
      data: ecoles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir une école par son ID
// @route   GET /api/hr/references/ecoles/:id
// @access  Private
exports.getEcoleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant d\'école invalide'
      });
    }

    const ecole = await RHEcole.findById(id)
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email');

    if (!ecole) {
      return res.status(404).json({
        success: false,
        message: 'École introuvable'
      });
    }

    res.status(200).json({
      success: true,
      data: ecole
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer une nouvelle école de formation
// @route   POST /api/hr/references/ecoles
// @access  Private (Admin, Director, AdminDepartment)
exports.createEcole = async (req, res, next) => {
  try {
    const {
      nom,
      nomAr,
      pays,
      ville,
      adresse,
      telephone,
      email,
      type,
      description,
      isActive
    } = req.body;

    if (typeof nom !== 'string' || !nom.trim() || typeof nomAr !== 'string' || !nomAr.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Les champs nom et nomAr sont obligatoires'
      });
    }

    const cleanNom = nom.trim();
    const existing = await RHEcole.findOne({ nom: cleanNom });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Une école avec le nom '${cleanNom}' existe déjà`
      });
    }

    const newEcole = await RHEcole.create({
      nom: cleanNom,
      nomAr: nomAr.trim(),
      pays: typeof pays === 'string' ? pays.trim() : 'تونس',
      ville: typeof ville === 'string' ? ville.trim() : '',
      adresse: typeof adresse === 'string' ? adresse.trim() : '',
      telephone: typeof telephone === 'string' ? telephone.trim() : '',
      email: typeof email === 'string' ? email.trim().toLowerCase() : '',
      type: type || 'militaire',
      description: typeof description === 'string' ? description.trim() : '',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: req.user ? req.user._id : null,
      updatedBy: req.user ? req.user._id : null
    });

    res.status(201).json({
      success: true,
      data: newEcole
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour une école de formation
// @route   PUT /api/hr/references/ecoles/:id
// @access  Private (Admin, Director, AdminDepartment)
exports.updateEcole = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant d\'école invalide'
      });
    }

    const ecole = await RHEcole.findById(id);
    if (!ecole) {
      return res.status(404).json({
        success: false,
        message: 'École introuvable'
      });
    }

    // Vérifier unicité du nom si modifié
    if (typeof req.body.nom === 'string' && req.body.nom.trim() && req.body.nom.trim() !== ecole.nom) {
      const cleanNom = req.body.nom.trim();
      const existing = await RHEcole.findOne({ nom: cleanNom, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Une école avec le nom '${cleanNom}' existe déjà`
        });
      }
    }

    const updateData = {
      updatedBy: req.user ? req.user._id : null
    };

    const trimmedStringFields = ['nom', 'nomAr', 'pays', 'ville', 'adresse', 'telephone', 'description'];
    for (const field of trimmedStringFields) {
      if (typeof req.body[field] === 'string') {
        updateData[field] = req.body[field].trim();
      }
    }
    if (typeof req.body.email === 'string') {
      updateData.email = req.body.email.trim().toLowerCase();
    }
    if (typeof req.body.type === 'string') {
      updateData.type = req.body.type;
    }
    if (typeof req.body.isActive === 'boolean') {
      updateData.isActive = req.body.isActive;
    }

    const updatedEcole = await RHEcole.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedEcole
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer (soft delete) une école de formation
// @route   DELETE /api/hr/references/ecoles/:id
// @access  Private (Admin, Director, AdminDepartment)
exports.deleteEcole = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant d\'école invalide'
      });
    }

    const ecole = await RHEcole.findById(id);
    if (!ecole) {
      return res.status(404).json({
        success: false,
        message: 'École introuvable'
      });
    }

    // Soft delete: isActive = false
    ecole.isActive = false;
    ecole.updatedBy = req.user ? req.user._id : null;
    await ecole.save();

    res.status(200).json({
      success: true,
      message: 'École désactivée avec succès'
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// TYPES DE FORMATION (RHTypeFormation)
// ============================================================

// @desc    Obtenir la liste des types de formation
// @route   GET /api/hr/references/types-formation
// @access  Private
exports.getTypesFormation = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    if (req.query.categorie) {
      filter.categorie = req.query.categorie;
    }

    const types = await RHTypeFormation.find(filter)
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: types.length,
      data: types
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir un type de formation par son ID
// @route   GET /api/hr/references/types-formation/:id
// @access  Private
exports.getTypeFormationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de type de formation invalide'
      });
    }

    const typeFormation = await RHTypeFormation.findById(id)
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email');

    if (!typeFormation) {
      return res.status(404).json({
        success: false,
        message: 'Type de formation introuvable'
      });
    }

    res.status(200).json({
      success: true,
      data: typeFormation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer un nouveau type de formation
// @route   POST /api/hr/references/types-formation
// @access  Private (Admin, Director, AdminDepartment)
exports.createTypeFormation = async (req, res, next) => {
  try {
    const {
      code,
      nom,
      nomAr,
      categorie,
      dureeReference,
      description,
      isActive
    } = req.body;

    if (
      typeof code !== 'string' || !code.trim() ||
      typeof nom !== 'string' || !nom.trim() ||
      typeof nomAr !== 'string' || !nomAr.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Les champs code, nom et nomAr sont obligatoires'
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await RHTypeFormation.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Un type de formation avec le code '${cleanCode}' existe déjà`
      });
    }

    const newType = await RHTypeFormation.create({
      code: cleanCode,
      nom: nom.trim(),
      nomAr: nomAr.trim(),
      categorie: categorie || 'autre',
      dureeReference: dureeReference !== undefined ? Number(dureeReference) : 0,
      description: typeof description === 'string' ? description.trim() : '',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: req.user ? req.user._id : null,
      updatedBy: req.user ? req.user._id : null
    });

    res.status(201).json({
      success: true,
      data: newType
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour un type de formation
// @route   PUT /api/hr/references/types-formation/:id
// @access  Private (Admin, Director, AdminDepartment)
exports.updateTypeFormation = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de type de formation invalide'
      });
    }

    const typeFormation = await RHTypeFormation.findById(id);
    if (!typeFormation) {
      return res.status(404).json({
        success: false,
        message: 'Type de formation introuvable'
      });
    }

    // Vérifier unicité du code si modifié
    if (typeof req.body.code === 'string' && req.body.code.trim() && req.body.code.trim().toUpperCase() !== typeFormation.code) {
      const cleanCode = req.body.code.trim().toUpperCase();
      const existing = await RHTypeFormation.findOne({ code: cleanCode, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Un type de formation avec le code '${cleanCode}' existe déjà`
        });
      }
    }

    const updateData = {
      updatedBy: req.user ? req.user._id : null
    };

    if (typeof req.body.code === 'string' && req.body.code.trim()) {
      updateData.code = req.body.code.trim().toUpperCase();
    }
    const trimmedStringFields = ['nom', 'nomAr', 'description'];
    for (const field of trimmedStringFields) {
      if (typeof req.body[field] === 'string') {
        updateData[field] = req.body[field].trim();
      }
    }
    if (typeof req.body.categorie === 'string') {
      updateData.categorie = req.body.categorie;
    }
    if (req.body.dureeReference !== undefined) {
      updateData.dureeReference = Number(req.body.dureeReference) || 0;
    }
    if (typeof req.body.isActive === 'boolean') {
      updateData.isActive = req.body.isActive;
    }

    const updatedType = await RHTypeFormation.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedType
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer (soft delete) un type de formation
// @route   DELETE /api/hr/references/types-formation/:id
// @access  Private (Admin, Director, AdminDepartment)
exports.deleteTypeFormation = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de type de formation invalide'
      });
    }

    const typeFormation = await RHTypeFormation.findById(id);
    if (!typeFormation) {
      return res.status(404).json({
        success: false,
        message: 'Type de formation introuvable'
      });
    }

    // Soft delete: isActive = false
    typeFormation.isActive = false;
    typeFormation.updatedBy = req.user ? req.user._id : null;
    await typeFormation.save();

    res.status(200).json({
      success: true,
      message: 'Type de formation désactivé avec succès'
    });
  } catch (error) {
    next(error);
  }
};
