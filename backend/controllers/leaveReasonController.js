const LeaveReason = require('../models/LeaveReason');
const Attendance = require('../models/Attendance');

// @desc    Obtenir la liste des motifs d'absence
// @route   GET /api/hr/leave-reasons
// @access  Private
exports.getLeaveReasons = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.impacteSolde !== undefined) {
      filter.impacteSolde = req.query.impacteSolde === 'true';
    }

    const reasons = await LeaveReason.find(filter).sort({ order: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: reasons.length,
      data: reasons
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir un motif d'absence par son ID
// @route   GET /api/hr/leave-reasons/:id
// @access  Private
exports.getLeaveReasonById = async (req, res, next) => {
  try {
    const reason = await LeaveReason.findById(req.params.id);
    if (!reason) {
      return res.status(404).json({
        success: false,
        message: 'Motif d\'absence non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: reason
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer un nouveau motif d'absence personnalisé
// @route   POST /api/hr/leave-reasons
// @access  Private (Admin RH)
exports.createLeaveReason = async (req, res, next) => {
  try {
    const {
      code,
      labelAr,
      labelFr,
      category,
      impacteSolde,
      description,
      requiresDocument,
      requiresServiceName,
      requiresLieu,
      requiresFormationDetails,
      color,
      icon,
      order,
      isActive
    } = req.body;

    if (!code || !labelAr || !category) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez renseigner les champs obligatoires (code, labelAr, category)'
      });
    }

    const cleanCode = code.trim().toLowerCase();
    const existing = await LeaveReason.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Le code '${cleanCode}' existe déjà`
      });
    }

    const newReason = await LeaveReason.create({
      code: cleanCode,
      labelAr: labelAr.trim(),
      labelFr: labelFr ? labelFr.trim() : '',
      category,
      impacteSolde: Boolean(impacteSolde),
      description: description ? description.trim() : '',
      requiresDocument: Boolean(requiresDocument),
      requiresServiceName: Boolean(requiresServiceName),
      requiresLieu: Boolean(requiresLieu),
      requiresFormationDetails: Boolean(requiresFormationDetails),
      color: color || '#e2e8f0',
      icon: icon || null,
      order: order !== undefined ? Number(order) : 100,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isSystem: false,
      createdBy: req.user ? req.user._id : null
    });

    res.status(201).json({
      success: true,
      data: newReason
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Modifier un motif d'absence
// @route   PUT /api/hr/leave-reasons/:id
// @access  Private (Admin RH)
exports.updateLeaveReason = async (req, res, next) => {
  try {
    const reason = await LeaveReason.findById(req.params.id);
    if (!reason) {
      return res.status(404).json({
        success: false,
        message: 'Motif d\'absence non trouvé'
      });
    }

    const {
      labelAr,
      labelFr,
      category,
      impacteSolde,
      description,
      requiresDocument,
      requiresServiceName,
      requiresLieu,
      requiresFormationDetails,
      color,
      icon,
      order,
      isActive
    } = req.body;

    if (labelAr !== undefined) reason.labelAr = labelAr.trim();
    if (labelFr !== undefined) reason.labelFr = labelFr.trim();
    if (category !== undefined) reason.category = category;
    if (impacteSolde !== undefined) reason.impacteSolde = Boolean(impacteSolde);
    if (description !== undefined) reason.description = description.trim();
    if (requiresDocument !== undefined) reason.requiresDocument = Boolean(requiresDocument);
    if (requiresServiceName !== undefined) reason.requiresServiceName = Boolean(requiresServiceName);
    if (requiresLieu !== undefined) reason.requiresLieu = Boolean(requiresLieu);
    if (requiresFormationDetails !== undefined) reason.requiresFormationDetails = Boolean(requiresFormationDetails);
    if (color !== undefined) reason.color = color;
    if (icon !== undefined) reason.icon = icon;
    if (order !== undefined) reason.order = Number(order);
    if (isActive !== undefined) reason.isActive = Boolean(isActive);

    await reason.save();

    res.status(200).json({
      success: true,
      data: reason
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Basculer l'état actif/inactif d'un motif d'absence
// @route   PUT /api/hr/leave-reasons/:id/toggle
// @access  Private (Admin RH)
exports.toggleLeaveReasonStatus = async (req, res, next) => {
  try {
    const reason = await LeaveReason.findById(req.params.id);
    if (!reason) {
      return res.status(404).json({
        success: false,
        message: 'Motif d\'absence non trouvé'
      });
    }

    reason.isActive = !reason.isActive;
    await reason.save();

    res.status(200).json({
      success: true,
      data: reason
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer un motif d'absence personnalisé
// @route   DELETE /api/hr/leave-reasons/:id
// @access  Private (Admin RH)
exports.deleteLeaveReason = async (req, res, next) => {
  try {
    const reason = await LeaveReason.findById(req.params.id);
    if (!reason) {
      return res.status(404).json({
        success: false,
        message: 'Motif d\'absence non trouvé'
      });
    }

    // 1. Protection motif système
    if (reason.isSystem) {
      return res.status(403).json({
        success: false,
        message: 'Les motifs système ne peuvent pas être supprimés.'
      });
    }

    // 2. Vérification d'utilisation dans les enregistrements Attendance
    const usageCount = await Attendance.countDocuments({ motif: reason.code });
    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Ce motif est utilisé dans ${usageCount} enregistrement(s).`
      });
    }

    await LeaveReason.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Motif supprimé'
    });
  } catch (error) {
    next(error);
  }
};
