
const User = require('../../models/User');
const Personnel = require('../../models/Personnel');
const ErrorResponse = require('../../utils/errorResponse');
const bcrypt = require('bcryptjs');

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin/AdminDepartment
exports.createUser = async (req, res, next) => {
  try {
    console.log(`User creation request from ${req.user.role} user: ${req.user.username}`);

    let targetRole = req.body.role;
    let targetDepartments = Array.isArray(req.body.departments) ? req.body.departments : [];
    let targetActiveDepartment = req.body.activeDepartment;

    // Handle departments based on role
    if (req.user.role === 'AdminDepartment') {
      // AdminDepartment can only create users for their active department
      if (!req.user.activeDepartment) {
        console.log('AdminDepartment has no active department');
        return next(new ErrorResponse('No active department selected. Please select an active department.', 400));
      }

      const activeDeptId = req.user.activeDepartment._id || req.user.activeDepartment;
      console.log(`AdminDepartment active department: ${req.user.activeDepartment.name}`);

      // Force departments to be the AdminDepartment's active department
      targetDepartments = [activeDeptId];
      targetActiveDepartment = activeDeptId;
      console.log('Forced departments to active department:', targetDepartments);

      // AdminDepartment can only create User accounts
      if (req.body.role && req.body.role !== 'User') {
        console.log(`AdminDepartment attempting to create ${req.body.role} role - not allowed`);
        return next(
          new ErrorResponse('AdminDepartment can only create User accounts within their department', 403)
        );
      }

      // Force role to be User
      targetRole = 'User';
    } else if (req.user.role === 'Admin') {
      const validRoles = ['Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk', 'User'];
      if (!validRoles.includes(targetRole)) {
        return next(new ErrorResponse('Rôle spécifié invalide', 400));
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
        console.log(`${targetRole} role - clearing departments and activeDepartment`);
      }

      // AdminDepartment : at least one department required
      if (targetRole === 'AdminDepartment') {
        if (!targetDepartments || targetDepartments.length === 0) {
          return next(new ErrorResponse('Chef de département : au moins un département requis', 400));
        }
        // activeDepartment must be within departments[]
        if (targetActiveDepartment) {
          const activeId = (targetActiveDepartment._id || targetActiveDepartment).toString();
          const deptIds = targetDepartments.map(d => (d && d._id ? d._id.toString() : String(d)));
          if (!deptIds.includes(activeId)) {
            return next(new ErrorResponse('activeDepartment doit être dans les départements assignés', 400));
          }
        } else {
          // Default to first department
          targetActiveDepartment = targetDepartments[0];
        }
      }
    } else {
      return next(new ErrorResponse('Not authorized to create users', 403));
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
    if (req.user.role === 'Admin') {
      if (typeof req.body.isActive === 'boolean') {
        userPayload.isActive = req.body.isActive;
      }
      if (typeof req.body.mustChangePassword === 'boolean') {
        userPayload.mustChangePassword = req.body.mustChangePassword;
      }
    }

    console.log('Final user data before creation:', {
      username: userPayload.username,
      role: userPayload.role,
      departments: userPayload.departments,
      createdBy: userPayload.createdBy
    });

    if (userPayload.personnelId) {
      const existingPersonnelAccount = await User.findOne({ personnelId: userPayload.personnelId });
      if (existingPersonnelAccount) {
        return res.status(409).json({
          success: false,
          code: 'PERSONNEL_ALREADY_HAS_ACCOUNT',
          error: 'Ce personnel possède déjà un compte utilisateur',
          message: 'Ce personnel possède déjà un compte utilisateur'
        });
      }
    }

    // Create user with explicit whitelist
    const user = await User.create(userPayload);

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

    // Enhanced authorization for Admin - can edit any user
    if (req.user.role === 'Admin') {
      console.log(`Admin user - can edit any user`);

      const targetRole = req.body.role || user.role;
      if (req.body.role !== undefined) {
        const validRoles = ['Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk', 'User'];
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
            const activeId = (req.body.activeDepartment?._id || req.body.activeDepartment || '').toString();
            const deptIds = updateData.departments.map(d => (d && d._id ? d._id.toString() : String(d)));
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
    } else if (req.user.role === 'AdminDepartment') {
      // Verify the user belongs to the AdminDepartment's active department
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected', 400));
      }

      const activeDeptId = (req.user.activeDepartment._id || req.user.activeDepartment).toString();
      const userDeptIds = user.departments.map(dept => (dept._id || dept).toString());
      const hasAccess = userDeptIds.includes(activeDeptId);

      console.log('User departments:', userDeptIds);
      console.log('AdminDepartment active department:', activeDeptId);
      console.log('Has access:', hasAccess);

      if (!hasAccess) {
        return next(
          new ErrorResponse(`Not authorized to update this user. User does not belong to your active department.`, 403)
        );
      }

      // AdminDepartment cannot change user role
      if (req.body.role !== undefined && req.body.role !== user.role) {
        return next(
          new ErrorResponse('AdminDepartment cannot change user role', 403)
        );
      }

      // AdminDepartment can only assign their active department
      if (req.body.departments !== undefined) {
        const requestedDepts = Array.isArray(req.body.departments)
          ? req.body.departments
          : [req.body.departments];

        const hasValidDepts = requestedDepts.every(
          deptId => (deptId && deptId._id ? deptId._id.toString() : String(deptId)) === activeDeptId
        );

        if (!hasValidDepts) {
          return next(
            new ErrorResponse('Not authorized to assign departments outside your active department', 403)
          );
        }

        updateData.departments = requestedDepts;
      }

      if (req.body.activeDepartment !== undefined) {
        const reqActive = req.body.activeDepartment
          ? (req.body.activeDepartment._id || req.body.activeDepartment).toString()
          : null;
        if (reqActive && reqActive !== activeDeptId) {
          return next(
            new ErrorResponse('Not authorized to assign activeDepartment outside your active department', 403)
          );
        }
        updateData.activeDepartment = req.body.activeDepartment;
      }
    } else {
      return next(
        new ErrorResponse('Not authorized to update users', 403)
      );
    }

    // Explicit whitelist for shared editable fields (never password, isDeleted, deletedAt, deletedBy, createdBy, lastSeen)
    if (typeof req.body.username === 'string') {
      const trimmedUsername = req.body.username.trim();
      if (!trimmedUsername) {
        return next(new ErrorResponse('Username cannot be empty', 400));
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

    // Synchronisation activeDepartment si departments est mis à jour
    if (updateData.departments !== undefined) {
      const newDeptIds = Array.isArray(updateData.departments)
        ? updateData.departments.map(d => (d && d._id ? d._id.toString() : String(d)))
        : [];

      const currentActiveId = updateData.activeDepartment !== undefined
        ? (updateData.activeDepartment && (updateData.activeDepartment._id || updateData.activeDepartment)?.toString())
        : (user.activeDepartment && (user.activeDepartment._id || user.activeDepartment)?.toString());

      if (!currentActiveId || !newDeptIds.includes(currentActiveId)) {
        if (newDeptIds.length > 0) {
          updateData.activeDepartment = newDeptIds[0];
        } else {
          updateData.activeDepartment = null;
        }
      }
    }

    console.log('Update data (whitelisted fields only):', Object.keys(updateData));

    if (updateData.personnelId) {
      const existingPersonnelAccount = await User.findOne({
        personnelId: updateData.personnelId,
        _id: { $ne: user._id }
      });
      if (existingPersonnelAccount) {
        return res.status(409).json({
          success: false,
          code: 'PERSONNEL_ALREADY_HAS_ACCOUNT',
          error: 'Ce personnel possède déjà un compte utilisateur',
          message: 'Ce personnel possède déjà un compte utilisateur'
        });
      }
    }

    // Appliquer les modifications et sauvegarder avec user.save() pour déclencher les hooks
    Object.assign(user, updateData);
    await user.save();

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
    
    // Only Admin can delete users
    if (req.user.role !== 'Admin') {
      return next(
        new ErrorResponse('Not authorized to delete users. Only Admin can delete users.', 403)
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
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: req.user ? (req.user.id || req.user._id) : null } }
    );

    if (updateResult.modifiedCount !== 1) {
      return next(new ErrorResponse('Échec de la suppression (aucune modification en base)', 500));
    }

    // Dissocier la fiche Personnel liée s'il y en a une pour éviter un userId orphelin
    try {
      let linkedPersonnel = null;
      if (user.personnelId) {
        linkedPersonnel = await Personnel.findById(user.personnelId);
      }
      if (!linkedPersonnel) {
        linkedPersonnel = await Personnel.findOne({ userId: user._id, isDeleted: { $ne: true } });
      }
      if (linkedPersonnel) {
        linkedPersonnel.userId = null;
        await linkedPersonnel.save();
        console.log(`Personnel unlinked successfully for deleted user: ${user.username}`);
      }
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
    // Only Admin can restore users
    if (req.user.role !== 'Admin') {
      return next(
        new ErrorResponse('Not authorized to restore users. Only Admin can restore users.', 403)
      );
    }

    const user = await User.findOne({ _id: req.params.id, isDeleted: true });
    
    if (!user) {
      return next(
        new ErrorResponse(`Deleted user not found with id of ${req.params.id}`, 404)
      );
    }

    user.isDeleted = false;
    user.deletedAt = null;
    user.deletedBy = null;
    await user.save();

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
