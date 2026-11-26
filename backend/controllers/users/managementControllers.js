
const mongoose = require('mongoose');
const User = require('../../models/User');
const Personnel = require('../../models/Personnel');
const ErrorResponse = require('../../utils/errorResponse');
const bcrypt = require('bcryptjs');
const { extractId, isRHAdminDepartment } = require('../../utils/rhAuthHelper');
const {
  seedInitialAffectationIfEmpty,
  recordCareerTransition
} = require('../../utils/personnelCareerHelper');

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin/AdminDepartment
exports.createUser = async (req, res, next) => {
  try {
    console.log(`User creation request from ${req.user.role} user: ${req.user.username}`);

    let targetRole = req.body.role;
    let targetDepartments = Array.isArray(req.body.departments) ? req.body.departments : [];
    let targetActiveDepartment = req.body.activeDepartment;
    const requestedPersonnelId = req.body.personnelId || null;

    if (req.user.role === 'AdminDepartment') {
      const isRH = await isRHAdminDepartment(req.user);
      if (!isRH) {
        return next(
          new ErrorResponse('Accès réservé à l\'administrateur ou au responsable RH', 403)
        );
      }

      if (targetRole === 'Admin') {
        return next(
          new ErrorResponse('Le responsable RH ne peut pas créer un compte Admin', 403)
        );
      }

      if (!targetRole) {
        targetRole = 'User';
      }

      const rhAllowedRoles = ['Director', 'AdminDepartment', 'AdminTuningDesk', 'User'];
      if (!rhAllowedRoles.includes(targetRole)) {
        return next(new ErrorResponse('Rôle spécifié invalide', 400));
      }
    } else if (req.user.role === 'Admin') {
      const validRoles = ['Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk', 'User'];
      if (!validRoles.includes(targetRole)) {
        return next(new ErrorResponse('Rôle spécifié invalide', 400));
      }
    } else {
      return next(new ErrorResponse('Not authorized to create users', 403));
    }

    // Garde RBAC : Admin est purement technique et ne peut pas être lié à un Personnel
    if (targetRole === 'Admin' && requestedPersonnelId) {
      return res.status(403).json({
        success: false,
        code: 'ADMIN_TECHNICAL_ONLY',
        message: 'Les comptes Admin sont purement techniques et ne peuvent pas être liés à un dossier du personnel.'
      });
    }

    // Validation personnelId s'il est fourni
    let targetPersonnel = null;
    if (requestedPersonnelId) {
      if (!mongoose.Types.ObjectId.isValid(requestedPersonnelId)) {
        return next(new ErrorResponse('Identifiant de fiche Personnel invalide', 400));
      }
      targetPersonnel = await Personnel.findOne({
        _id: requestedPersonnelId,
        isDeleted: { $ne: true }
      });
      if (!targetPersonnel) {
        return next(new ErrorResponse('Fiche de personnel introuvable', 404));
      }

      // Nettoyer d'éventuels liens orphelins sur comptes supprimés
      await User.updateMany(
        { personnelId: targetPersonnel._id, isDeleted: true },
        { $set: { personnelId: null } }
      );

      const existingPersonnelAccount = await User.findOne({
        personnelId: targetPersonnel._id,
        isDeleted: { $ne: true }
      });
      if (existingPersonnelAccount) {
        return res.status(409).json({
          success: false,
          code: 'PERSONNEL_ALREADY_HAS_ACCOUNT',
          error: 'Ce personnel possède déjà un compte utilisateur',
          message: 'Ce personnel possède déjà un compte utilisateur'
        });
      }

      if (targetPersonnel.userId) {
        const linkedUser = await User.findById(targetPersonnel.userId).select('_id isDeleted personnelId').lean();
        if (linkedUser && linkedUser.isDeleted !== true && extractId(linkedUser.personnelId) === extractId(targetPersonnel._id)) {
          return res.status(409).json({
            success: false,
            code: 'PERSONNEL_ALREADY_LINKED',
            error: 'Ce personnel possède déjà un compte utilisateur',
            message: 'Ce personnel possède déjà un compte utilisateur'
          });
        }
      }
    }

    // Director : only 1 allowed per system
    if (targetRole === 'Director') {
      const existingDirector = await User.findOne({ role: 'Director', isDeleted: { $ne: true } });
      if (existingDirector) {
        return next(new ErrorResponse('Un seul Directeur est autorisé dans le système', 400));
      }
    }

    // AdminTuningDesk : no departments
    if (targetRole === 'AdminTuningDesk') {
      targetDepartments = [];
      targetActiveDepartment = null;
    } else if (targetRole === 'AdminDepartment') {
      if (targetDepartments.length === 0 && targetActiveDepartment) {
        targetDepartments = [targetActiveDepartment];
      } else if (targetDepartments.length === 0 && targetPersonnel?.activeDepartment) {
        targetDepartments = [targetPersonnel.activeDepartment];
        targetActiveDepartment = targetPersonnel.activeDepartment;
      }

      if (!targetDepartments || targetDepartments.length === 0) {
        return next(new ErrorResponse('Chef de département : au moins un département requis', 400));
      }

      if (targetActiveDepartment) {
        const activeId = extractId(targetActiveDepartment);
        const deptIds = targetDepartments.map(d => extractId(d));
        if (!deptIds.includes(activeId)) {
          return next(new ErrorResponse('activeDepartment doit être dans les départements assignés', 400));
        }
      } else {
        targetActiveDepartment = targetDepartments[0];
      }
    } else if (targetRole === 'User' || targetRole === 'Director') {
      if (targetDepartments.length === 0 && targetActiveDepartment) {
        targetDepartments = [targetActiveDepartment];
      } else if (targetDepartments.length === 0 && targetPersonnel?.activeDepartment) {
        targetDepartments = [targetPersonnel.activeDepartment];
        targetActiveDepartment = targetPersonnel.activeDepartment;
      }
    }

    // Validate required fields
    if (typeof req.body.username !== 'string' || !req.body.username.trim() || typeof req.body.password !== 'string' || !req.body.password) {
      return next(new ErrorResponse('Username and password are required', 400));
    }

    // Validate password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(req.body.password)) {
      return next(new ErrorResponse('Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.', 400));
    }

    // Validation croisée (CIN ↔ Username) : vérifier si le username correspond au CIN d'un Personnel existant
    const trimmedUsername = req.body.username.trim();
    const existingPersonnelWithCin = await Personnel.findOne({
      cin: trimmedUsername,
      isDeleted: { $ne: true }
    });
    if (existingPersonnelWithCin) {
      return res.status(400).json({
        success: false,
        message: "Ce nom d'utilisateur correspond déjà au CIN d'un agent existant. Veuillez d'abord lier ce compte."
      });
    }

    const userPayload = {
      username: trimmedUsername,
      password: req.body.password,
      role: targetRole,
      departments: targetDepartments,
      createdBy: req.user.id || req.user._id
    };

    if (targetActiveDepartment !== undefined) {
      userPayload.activeDepartment = targetActiveDepartment;
    }
    if (req.body.personnelId !== undefined) {
      userPayload.personnelId = req.body.personnelId || null;
    }
    if (typeof req.body.photo === 'string' || req.body.photo === null) {
      userPayload.photo = req.body.photo;
    }
    if (req.user.role === 'Admin' || req.user.role === 'AdminDepartment') {
      if (typeof req.body.isActive === 'boolean') {
        userPayload.isActive = req.body.isActive;
      }
      if (typeof req.body.mustChangePassword === 'boolean') {
        userPayload.mustChangePassword = req.body.mustChangePassword;
      }
    }

    // Create user with explicit whitelist
    const user = await User.create(userPayload);

    // Synchronisation atomique User -> Personnel si personnelId fourni
    if (user.personnelId && targetPersonnel) {
      const prevDeptId = extractId(targetPersonnel.activeDepartment);
      const prevPoste = (targetPersonnel.posteActuel || targetPersonnel.poste || '').trim();
      const userDeptId = extractId(user.activeDepartment);

      targetPersonnel.userId = user._id;
      targetPersonnel.statut = user.isActive === false ? 'inactif' : 'actif';

      if (user.role !== 'AdminTuningDesk' && userDeptId && userDeptId !== prevDeptId) {
        await recordCareerTransition(targetPersonnel, {
          prevDeptId,
          prevPoste,
          newDeptId: userDeptId,
          newPoste: prevPoste
        });
        targetPersonnel.activeDepartment = user.activeDepartment;
        const persDepts = Array.isArray(targetPersonnel.departments) ? [...targetPersonnel.departments] : [];
        const cleanedDepts = prevDeptId ? persDepts.filter(d => extractId(d) !== prevDeptId) : persDepts;
        if (!cleanedDepts.some(d => extractId(d) === userDeptId)) {
          cleanedDepts.push(user.activeDepartment);
        }
        targetPersonnel.departments = cleanedDepts;
      } else {
        await seedInitialAffectationIfEmpty(targetPersonnel);
      }

      await targetPersonnel.save();
    }

    // Populate the created user
    const populatedUser = await User.findById(user._id)
      .populate('departments')
      .populate('activeDepartment')
      .populate('createdBy', 'username');

    // Remove password from response
    populatedUser.password = undefined;

    console.log(`User created successfully: ${user.username} with role: ${user.role}`);

    res.status(201).json({
      success: true,
      data: populatedUser
    });
  } catch (err) {
    console.error('Error creating user:', err);
    // Handle duplicate key (personnelId or username)
    if (err.code === 11000) {
      if (err.keyPattern?.personnelId) {
        return res.status(409).json({
          success: false,
          code: 'PERSONNEL_ALREADY_HAS_ACCOUNT',
          error: 'Ce personnel possède déjà un compte utilisateur',
          message: 'Ce personnel possède déjà un compte utilisateur'
        });
      }
      return next(new ErrorResponse('Username already exists', 400));
    }
    next(err);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin/AdminDepartment
exports.updateUser = async (req, res, next) => {
  try {
    console.log(`User update request from ${req.user.role} user: ${req.user.username} for user ID: ${req.params.id}`);

    let user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).populate('departments');

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    console.log(`Found user to update: ${user.username} with role: ${user.role}`);

    const updateData = {};
    const prevPersonnelId = extractId(user.personnelId);
    const prevActiveDeptId = extractId(user.activeDepartment);
    const prevIsActive = user.isActive;

    const isAdmin = req.user.role === 'Admin';
    let isRHManager = false;
    if (req.user.role === 'AdminDepartment') {
      isRHManager = await isRHAdminDepartment(req.user);
      if (!isRHManager) {
        return next(
          new ErrorResponse('Accès réservé à l\'administrateur ou au responsable RH', 403)
        );
      }
      if (user.role === 'Admin' || req.body.role === 'Admin') {
        return next(
          new ErrorResponse('Le responsable RH ne peut pas modifier un compte Admin ou attribuer le rôle Admin', 403)
        );
      }
    } else if (!isAdmin) {
      return next(
        new ErrorResponse('Not authorized to update users', 403)
      );
    }

    const targetRole = req.body.role || user.role;
    if (req.body.role !== undefined) {
      const validRoles = isAdmin
        ? ['Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk', 'User']
        : ['Director', 'AdminDepartment', 'AdminTuningDesk', 'User'];
      if (!validRoles.includes(req.body.role)) {
        return next(new ErrorResponse('Rôle spécifié invalide', 400));
      }
      updateData.role = req.body.role;
    }

    // If changing role to Director, verify only 1 exists
    if (req.body.role === 'Director' && user.role !== 'Director') {
      const existingDirector = await User.findOne({ role: 'Director', isDeleted: { $ne: true } });
      if (existingDirector) {
        return next(new ErrorResponse('Un seul Directeur est autorisé dans le système', 400));
      }
    }

    if (targetRole === 'AdminTuningDesk') {
      updateData.departments = [];
      updateData.activeDepartment = null;
    } else {
      if (req.body.departments !== undefined) {
        if (!Array.isArray(req.body.departments)) {
          return next(new ErrorResponse('departments doit être un tableau', 400));
        }
        if (targetRole === 'AdminDepartment' && req.body.departments.length === 0) {
          return next(new ErrorResponse('Chef de département : au moins un département requis', 400));
        }
        updateData.departments = req.body.departments;
      }

      if (req.body.activeDepartment !== undefined) {
        if (targetRole === 'AdminDepartment' && updateData.departments) {
          const activeId = extractId(req.body.activeDepartment);
          const deptIds = updateData.departments.map(d => extractId(d));
          if (!activeId || !deptIds.includes(activeId)) {
            return next(new ErrorResponse('activeDepartment doit être dans les départements assignés', 400));
          }
        }
        updateData.activeDepartment = req.body.activeDepartment;
      } else if (targetRole === 'AdminDepartment' && updateData.departments && updateData.departments.length > 0) {
        updateData.activeDepartment = updateData.departments[0];
      }
    }

    if (typeof req.body.mustChangePassword === 'boolean') {
      updateData.mustChangePassword = req.body.mustChangePassword;
    }

    // Explicit whitelist for shared editable fields (never password, isDeleted, deletedAt, deletedBy, createdBy, lastSeen)
    if (typeof req.body.username === 'string') {
      const trimmedUsername = req.body.username.trim();
      if (!trimmedUsername) {
        return next(new ErrorResponse('Username cannot be empty', 400));
      }
      // Validation croisée (CIN ↔ Username) sur mise à jour
      const existingPersonnelWithCin = await Personnel.findOne({
        cin: trimmedUsername,
        isDeleted: { $ne: true }
      });
      if (existingPersonnelWithCin) {
        return res.status(400).json({
          success: false,
          message: "Ce nom d'utilisateur correspond déjà au CIN d'un agent existant."
        });
      }
      updateData.username = trimmedUsername;
    }
    if (req.body.personnelId !== undefined) {
      updateData.personnelId = req.body.personnelId || null;
    }
    if (typeof req.body.photo === 'string' || req.body.photo === null) {
      updateData.photo = req.body.photo;
    }
    if (typeof req.body.isActive === 'boolean') {
      updateData.isActive = req.body.isActive;
    }

    // Garde RBAC : Admin est purement technique et ne peut pas être lié à un Personnel
    const effectiveRole = updateData.role || user.role;
    const effectivePersonnelId = updateData.personnelId !== undefined
      ? updateData.personnelId
      : user.personnelId;
    if (effectiveRole === 'Admin' && effectivePersonnelId) {
      return res.status(403).json({
        success: false,
        code: 'ADMIN_TECHNICAL_ONLY',
        message: 'Les comptes Admin sont purement techniques et ne peuvent pas être liés à un dossier du personnel.'
      });
    }

    // Synchronisation activeDepartment si departments est mis à jour
    if (updateData.departments !== undefined) {
      const newDeptIds = Array.isArray(updateData.departments)
        ? updateData.departments.map(d => extractId(d))
        : [];

      const currentActiveId = updateData.activeDepartment !== undefined
        ? extractId(updateData.activeDepartment)
        : extractId(user.activeDepartment);

      if (!currentActiveId || !newDeptIds.includes(currentActiveId)) {
        if (newDeptIds.length > 0) {
          updateData.activeDepartment = newDeptIds[0];
        } else {
          updateData.activeDepartment = null;
        }
      }
    }

    let newLinkedPersonnelDoc = null;
    if (updateData.personnelId) {
      if (!mongoose.Types.ObjectId.isValid(updateData.personnelId)) {
        return next(new ErrorResponse('Identifiant de fiche Personnel invalide', 400));
      }
      newLinkedPersonnelDoc = await Personnel.findOne({
        _id: updateData.personnelId,
        isDeleted: { $ne: true }
      });
      if (!newLinkedPersonnelDoc) {
        return next(new ErrorResponse('Fiche de personnel introuvable', 404));
      }

      await User.updateMany(
        { _id: { $ne: user._id }, personnelId: updateData.personnelId, isDeleted: true },
        { $set: { personnelId: null } }
      );

      const existingPersonnelAccount = await User.findOne({
        personnelId: updateData.personnelId,
        _id: { $ne: user._id },
        isDeleted: { $ne: true }
      });
      if (existingPersonnelAccount) {
        return res.status(409).json({
          success: false,
          code: 'PERSONNEL_ALREADY_HAS_ACCOUNT',
          error: 'Ce personnel possède déjà un compte utilisateur',
          message: 'Ce personnel possède déjà un compte utilisateur'
        });
      }

      if (
        newLinkedPersonnelDoc.userId &&
        extractId(newLinkedPersonnelDoc.userId) !== extractId(user._id)
      ) {
        const otherLinkedUser = await User.findById(newLinkedPersonnelDoc.userId)
          .select('_id isDeleted personnelId')
          .lean();
        if (
          otherLinkedUser &&
          otherLinkedUser.isDeleted !== true &&
          extractId(otherLinkedUser.personnelId) === extractId(newLinkedPersonnelDoc._id)
        ) {
          return res.status(409).json({
            success: false,
            code: 'PERSONNEL_ALREADY_LINKED',
            error: 'Ce personnel possède déjà un compte utilisateur',
            message: 'Ce personnel possède déjà un compte utilisateur'
          });
        }
      }
    }

    // Appliquer les modifications et sauvegarder avec user.save() pour déclencher les hooks
    Object.assign(user, updateData);
    await user.save();

    // Synchronisation bidirectionnelle User -> Personnel
    const newPersonnelId = extractId(user.personnelId);
    const newActiveDeptId = extractId(user.activeDepartment);

    if (prevPersonnelId !== newPersonnelId) {
      if (prevPersonnelId) {
        await Personnel.updateMany(
          { _id: prevPersonnelId, userId: user._id },
          { $set: { userId: null, statut: 'en_attente' } }
        );
      }
      if (newPersonnelId && newLinkedPersonnelDoc) {
        const persPrevDeptId = extractId(newLinkedPersonnelDoc.activeDepartment);
        const persPrevPoste = (newLinkedPersonnelDoc.posteActuel || newLinkedPersonnelDoc.poste || '').trim();
        newLinkedPersonnelDoc.userId = user._id;
        newLinkedPersonnelDoc.statut = user.isActive === false ? 'inactif' : 'actif';

        if (user.role !== 'AdminTuningDesk' && newActiveDeptId && newActiveDeptId !== persPrevDeptId) {
          await recordCareerTransition(newLinkedPersonnelDoc, {
            prevDeptId: persPrevDeptId,
            prevPoste: persPrevPoste,
            newDeptId: newActiveDeptId,
            newPoste: persPrevPoste
          });
          newLinkedPersonnelDoc.activeDepartment = user.activeDepartment;
          const persDepts = Array.isArray(newLinkedPersonnelDoc.departments) ? [...newLinkedPersonnelDoc.departments] : [];
          const cleanedDepts = persPrevDeptId ? persDepts.filter(d => extractId(d) !== persPrevDeptId) : persDepts;
          if (!cleanedDepts.some(d => extractId(d) === newActiveDeptId)) {
            cleanedDepts.push(user.activeDepartment);
          }
          newLinkedPersonnelDoc.departments = cleanedDepts;
        } else {
          await seedInitialAffectationIfEmpty(newLinkedPersonnelDoc);
        }
        await newLinkedPersonnelDoc.save();
      }
    } else if (newPersonnelId) {
      const linkedPersonnel = newLinkedPersonnelDoc || await Personnel.findOne({
        _id: newPersonnelId,
        isDeleted: { $ne: true }
      });
      if (linkedPersonnel) {
        let modified = false;
        if (typeof req.body.isActive === 'boolean' || user.isActive !== prevIsActive) {
          linkedPersonnel.statut = user.isActive === false ? 'inactif' : 'actif';
          modified = true;
        }
        if (user.role !== 'AdminTuningDesk' && newActiveDeptId !== prevActiveDeptId) {
          const persPrevDeptId = extractId(linkedPersonnel.activeDepartment);
          const persPrevPoste = (linkedPersonnel.posteActuel || linkedPersonnel.poste || '').trim();
          if (newActiveDeptId !== persPrevDeptId) {
            await recordCareerTransition(linkedPersonnel, {
              prevDeptId: persPrevDeptId,
              prevPoste: persPrevPoste,
              newDeptId: newActiveDeptId,
              newPoste: persPrevPoste
            });
            linkedPersonnel.activeDepartment = user.activeDepartment || null;
            const persDepts = Array.isArray(linkedPersonnel.departments) ? [...linkedPersonnel.departments] : [];
            const cleanedDepts = persPrevDeptId ? persDepts.filter(d => extractId(d) !== persPrevDeptId) : persDepts;
            if (newActiveDeptId && !cleanedDepts.some(d => extractId(d) === newActiveDeptId)) {
              cleanedDepts.push(user.activeDepartment);
            }
            linkedPersonnel.departments = cleanedDepts;
            modified = true;
          }
        }
        if (modified) {
          await linkedPersonnel.save();
        }
      }
    }

    // Recharger avec les relations peuplées
    user = await User.findById(user._id)
      .populate('departments')
      .populate('activeDepartment')
      .populate('createdBy', 'username');

    console.log(`User updated successfully: ${user.username}`);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error updating user:', err);
    // Handle duplicate key (personnelId or username)
    if (err.code === 11000) {
      if (err.keyPattern?.personnelId) {
        return res.status(409).json({
          success: false,
          code: 'PERSONNEL_ALREADY_HAS_ACCOUNT',
          error: 'Ce personnel possède déjà un compte utilisateur',
          message: 'Ce personnel possède déjà un compte utilisateur'
        });
      }
      return next(new ErrorResponse('Username already exists', 400));
    }
    next(err);
  }
};

// @desc    Delete user (Soft delete)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    
    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Admin OR RH AdminDepartment (cannot delete Admin accounts)
    if (req.user.role === 'AdminDepartment') {
      const isRH = await isRHAdminDepartment(req.user);
      if (!isRH) {
        return next(
          new ErrorResponse('Accès réservé à l\'administrateur ou au responsable RH', 403)
        );
      }
      if (user.role === 'Admin') {
        return next(
          new ErrorResponse('Le responsable RH ne peut pas supprimer un compte Admin', 403)
        );
      }
    } else if (req.user.role !== 'Admin') {
      return next(
        new ErrorResponse('Not authorized to delete users.', 403)
      );
    }
    
    // Prevent deleting the Director user
    if (user.role === 'Director') {
      return next(
        new ErrorResponse('Impossible de supprimer le compte Directeur', 400)
      );
    }

    // Prevent deleting the last Admin user
    if (user.role === 'Admin') {
      const adminCount = await User.countDocuments({ role: 'Admin', isActive: true, isDeleted: { $ne: true } });
      if (adminCount <= 1) {
        return next(
          new ErrorResponse('Cannot delete the last Admin user', 400)
        );
      }
    }
    
    const updateResult = await User.updateOne(
      { _id: user._id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: req.user ? (req.user.id || req.user._id) : null, personnelId: null } }
    );

    if (updateResult.modifiedCount !== 1) {
      return next(new ErrorResponse('Échec de la suppression (aucune modification en base)', 500));
    }

    // Dissocier les fiches Personnel liées et rétablir le statut en_attente
    try {
      const personnelFilter = user.personnelId
        ? { $or: [{ userId: user._id }, { _id: user.personnelId }] }
        : { userId: user._id };
      const statusesFilter = user.isActive === false ? { $in: ['actif', 'inactif'] } : 'actif';
      await Personnel.updateMany(
        { ...personnelFilter, statut: statusesFilter },
        { $set: { userId: null, statut: 'en_attente' } }
      );
      await Personnel.updateMany(
        personnelFilter,
        { $set: { userId: null } }
      );
      console.log(`Personnel unlinked and reverted to en_attente for deleted user: ${user.username}`);
    } catch (unlinkErr) {
      console.warn('Erreur lors de la dissociation du Personnel pour l\'utilisateur supprimé:', unlinkErr.message);
    }
    
    console.log(`User soft deleted successfully: ${user.username}`);
    
    res.status(200).json({
      success: true,
      data: {},
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    next(err);
  }
};

// @desc    Restore user (Soft delete undo)
// @route   PUT /api/users/:id/restore
// @access  Private/Admin
exports.restoreUser = async (req, res, next) => {
  try {
    let isRH = false;
    if (req.user.role === 'AdminDepartment') {
      isRH = await isRHAdminDepartment(req.user);
      if (!isRH) {
        return next(
          new ErrorResponse('Accès réservé à l\'administrateur ou au responsable RH', 403)
        );
      }
    } else if (req.user.role !== 'Admin') {
      return next(
        new ErrorResponse('Not authorized to restore users.', 403)
      );
    }

    const user = await User.findOne({ _id: req.params.id, isDeleted: true });
    
    if (!user) {
      return next(
        new ErrorResponse(`Deleted user not found with id of ${req.params.id}`, 404)
      );
    }

    if (req.user.role === 'AdminDepartment' && user.role === 'Admin') {
      return next(
        new ErrorResponse('Le responsable RH ne peut pas restaurer un compte Admin', 403)
      );
    }

    const updateResult = await User.updateOne(
      { _id: user._id, isDeleted: true },
      { $set: { isDeleted: false, deletedAt: null, deletedBy: null } }
    );
    if (updateResult.modifiedCount !== 1) {
      return next(new ErrorResponse('Échec de la restauration (aucune modification en base)', 500));
    }

    const populatedUser = await User.findById(user._id)
      .populate('departments')
      .populate('activeDepartment')
      .populate('createdBy', 'username');

    console.log(`User restored successfully: ${user.username}`);

    res.status(200).json({
      success: true,
      data: populatedUser,
      message: 'Utilisateur restauré avec succès'
    });
  } catch (err) {
    console.error('Error restoring user:', err);
    next(err);
  }
};

// @desc    Permanently delete a soft-deleted user (Hard delete)
// @route   DELETE /api/users/:id/permanent
// @access  Private/Admin
exports.permanentDeleteUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ErrorResponse('Not authorized to permanently delete users.', 403));
    }

    if (req.user.role === 'AdminDepartment') {
      const isRH = await isRHAdminDepartment(req.user);
      if (!isRH) {
        return next(
          new ErrorResponse('Accès réservé à l\'administrateur ou au responsable RH', 403)
        );
      }
    } else if (req.user.role !== 'Admin') {
      return next(
        new ErrorResponse('Not authorized to permanently delete users.', 403)
      );
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`Invalid user id: ${id}`, 400));
    }

    const currentUserId = (req.user._id || req.user.id || '').toString();
    if (currentUserId && currentUserId === id.toString()) {
      return next(
        new ErrorResponse('Vous ne pouvez pas supprimer définitivement votre propre compte', 400)
      );
    }

    const user = await User.findById(id);

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${id}`, 404)
      );
    }

    if (req.user.role === 'AdminDepartment' && user.role === 'Admin') {
      return next(
        new ErrorResponse('Le responsable RH ne peut pas supprimer définitivement un compte Admin', 403)
      );
    }

    // Isolate permanent deletion strictly to already soft-deleted users
    if (user.isDeleted !== true) {
      return next(
        new ErrorResponse('Seuls les utilisateurs déjà supprimés peuvent être supprimés définitivement', 400)
      );
    }

    // Safety guard: never permanently delete Director
    if (user.role === 'Director') {
      return next(
        new ErrorResponse('Impossible de supprimer définitivement le compte Directeur', 400)
      );
    }

    // Physically delete the user document from MongoDB
    await User.findByIdAndDelete(user._id);

    // Clean up any linked Personnel references and revert active/inactive status to en_attente
    try {
      const personnelFilter = user.personnelId
        ? { $or: [{ userId: user._id }, { _id: user.personnelId }] }
        : { userId: user._id };
      const statusesFilter = user.isActive === false ? { $in: ['actif', 'inactif'] } : 'actif';
      await Personnel.updateMany(
        { ...personnelFilter, statut: statusesFilter },
        { $set: { userId: null, statut: 'en_attente' } }
      );
      await Personnel.updateMany(
        personnelFilter,
        { $set: { userId: null } }
      );
    } catch (unlinkErr) {
      console.warn('Erreur lors du nettoyage des références Personnel après suppression définitive:', unlinkErr.message);
    }

    console.log(`User permanently deleted: ${user.username} (${user._id})`);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Utilisateur supprimé définitivement avec succès'
    });
  } catch (err) {
    console.error('Error permanently deleting user:', err);
    next(err);
  }
};
