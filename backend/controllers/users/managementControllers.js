
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');
const bcrypt = require('bcryptjs');

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin/AdminDepartment
exports.createUser = async (req, res, next) => {
  try {
    console.log(`User creation request from ${req.user.role} user: ${req.user.username}`);
    console.log('Request body:', req.body);
    
    // Handle departments based on role
    if (req.user.role === 'AdminDepartment') {
      // AdminDepartment can only create users for their active department
      if (!req.user.activeDepartment) {
        console.log('AdminDepartment has no active department');
        return next(new ErrorResponse('No active department selected. Please select an active department.', 400));
      }
      
      console.log(`AdminDepartment active department: ${req.user.activeDepartment.name}`);
      
      // Force departments to be the AdminDepartment's active department
      req.body.departments = [req.user.activeDepartment._id];
      console.log('Forced departments to active department:', req.body.departments);
      
      // AdminDepartment can only create User accounts
      if (req.body.role && req.body.role !== 'User') {
        console.log(`AdminDepartment attempting to create ${req.body.role} role - not allowed`);
        return next(
          new ErrorResponse('AdminDepartment can only create User accounts within their department', 403)
        );
      }
      
      // Force role to be User
      req.body.role = 'User';
    }
    
    // Admin role validations
    if (req.user.role === 'Admin') {
      const validRoles = ['Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk', 'User'];
      if (!validRoles.includes(req.body.role)) {
        return next(new ErrorResponse('Rôle spécifié invalide', 400));
      }

      // Director : only 1 allowed per system
      if (req.body.role === 'Director') {
        const existingDirector = await User.findOne({ role: 'Director', isDeleted: { $ne: true } });
        if (existingDirector) {
          return next(new ErrorResponse('Un seul Directeur est autorisé dans le système', 400));
        }
      }

      // AdminTuningDesk : no departments
      if (req.body.role === 'AdminTuningDesk') {
        req.body.departments = [];
        req.body.activeDepartment = null;
        console.log(`${req.body.role} role - clearing departments and activeDepartment`);
      }

      // AdminDepartment : at least one department required
      if (req.body.role === 'AdminDepartment') {
        if (!req.body.departments || req.body.departments.length === 0) {
          return next(new ErrorResponse('Chef de département : au moins un département requis', 400));
        }
        // activeDepartment must be within departments[]
        if (req.body.activeDepartment) {
          const activeId = req.body.activeDepartment.toString();
          const deptIds = req.body.departments.map(d => d.toString());
          if (!deptIds.includes(activeId)) {
            return next(new ErrorResponse('activeDepartment doit être dans les départements assignés', 400));
          }
        } else {
          // Default to first department
          req.body.activeDepartment = req.body.departments[0];
        }
      }
    }
    
    // Validate required fields
    if (!req.body.username || !req.body.password) {
      return next(new ErrorResponse('Username and password are required', 400));
    }
    
    // Add createdBy field
    req.body.createdBy = req.user.id;
    
    console.log('Final user data before creation:', {
      username: req.body.username,
      role: req.body.role,
      departments: req.body.departments,
      createdBy: req.body.createdBy
    });
    
    // Create user
    const user = await User.create(req.body);
    
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
    // Handle duplicate username
    if (err.code === 11000) {
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
    
    // Enhanced authorization for Admin - can edit any user
    if (req.user.role === 'Admin') {
      console.log(`Admin user - can edit any user`);
      // Admin can edit any user without restrictions

      // Validate role and department constraints if role or departments are updated
      const targetRole = req.body.role || user.role;
      if (req.body.role) {
        const validRoles = ['Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk', 'User'];
        if (!validRoles.includes(req.body.role)) {
          return next(new ErrorResponse('Rôle spécifié invalide', 400));
        }
      }

      // If changing role to Director, verify only 1 exists
      if (req.body.role === 'Director' && user.role !== 'Director') {
        const existingDirector = await User.findOne({ role: 'Director', isDeleted: { $ne: true } });
        if (existingDirector) {
          return next(new ErrorResponse('Un seul Directeur est autorisé dans le système', 400));
        }
      }

      if (targetRole === 'AdminTuningDesk') {
        req.body.departments = [];
        req.body.activeDepartment = null;
      } else if (targetRole === 'AdminDepartment' && req.body.departments) {
        if (!Array.isArray(req.body.departments) || req.body.departments.length === 0) {
          return next(new ErrorResponse('Chef de département : au moins un département requis', 400));
        }
        if (req.body.activeDepartment) {
          const activeId = req.body.activeDepartment.toString();
          const deptIds = req.body.departments.map(d => d.toString());
          if (!deptIds.includes(activeId)) {
            return next(new ErrorResponse('activeDepartment doit être dans les départements assignés', 400));
          }
        } else {
          req.body.activeDepartment = req.body.departments[0];
        }
      }
    } else if (req.user.role === 'AdminDepartment') {
      // Verify the user belongs to the AdminDepartment's active department
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected', 400));
      }
      
      const userDeptIds = user.departments.map(dept => dept._id.toString());
      const hasAccess = userDeptIds.includes(req.user.activeDepartment._id.toString());
      
      console.log('User departments:', userDeptIds);
      console.log('AdminDepartment active department:', req.user.activeDepartment._id.toString());
      console.log('Has access:', hasAccess);
      
      if (!hasAccess) {
        return next(
          new ErrorResponse(`Not authorized to update this user. User does not belong to your active department.`, 403)
        );
      }
      
      // AdminDepartment cannot change user role
      if (req.body.role && req.body.role !== user.role) {
        return next(
          new ErrorResponse('AdminDepartment cannot change user role', 403)
        );
      }
      
      // AdminDepartment can only assign their active department
      if (req.body.departments) {
        const requestedDepts = Array.isArray(req.body.departments) 
          ? req.body.departments 
          : [req.body.departments];
        
        const hasValidDepts = requestedDepts.every(
          deptId => deptId.toString() === req.user.activeDepartment._id.toString()
        );
        
        if (!hasValidDepts) {
          return next(
            new ErrorResponse('Not authorized to assign departments outside your active department', 403)
          );
        }
      }
    } else {
      return next(
        new ErrorResponse('Not authorized to update users', 403)
      );
    }
    
    // IMPORTANT: Remove password from update data - password should be updated separately
    const updateData = { ...req.body };
    delete updateData.password;
    delete updateData.isDeleted;
    delete updateData.deletedAt;
    delete updateData.deletedBy;
    
    console.log('Update data (password and soft delete protected):', updateData);
    
    // Update user
    user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('departments')
     .populate('activeDepartment')
     .populate('createdBy', 'username');
    
    console.log(`User updated successfully: ${user.username}`);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error updating user:', err);
    // Handle duplicate username
    if (err.code === 11000) {
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
    
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.user ? (req.user.id || req.user._id) : null;
    await user.save();
    
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
