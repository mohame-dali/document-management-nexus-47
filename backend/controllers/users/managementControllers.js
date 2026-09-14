
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
    
    // SuperAdmin and Admin role validations
    if (req.user.role === 'SuperAdmin' || req.user.role === 'Admin') {
      // Prevent creation of SuperAdmin users except by Admin
      if (req.body.role === 'SuperAdmin' && req.user.role !== 'Admin') {
        return next(
          new ErrorResponse('Only Admin can create other SuperAdmin users', 403)
        );
      }
      // Prevent creation of Admin users except by SuperAdmin or Admin
      if (req.body.role === 'Admin' && req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
        return next(
          new ErrorResponse('Only SuperAdmin and Admin can create other Admin users', 403)
        );
      }
      
      // Handle AdminTuningDesk and SuperAdmin roles - should not have departments
      if (req.body.role === 'AdminTuningDesk' || req.body.role === 'SuperAdmin') {
        req.body.departments = [];
        console.log(`${req.body.role} role - clearing departments`);
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
    
    let user = await User.findById(req.params.id).populate('departments');
    
    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }
    
    console.log(`Found user to update: ${user.username} with role: ${user.role}`);
    
    // Enhanced authorization for SuperAdmin and Admin - can edit any user
    if (req.user.role === 'SuperAdmin' || req.user.role === 'Admin') {
      console.log(`${req.user.role} user - can edit any user`);
      // SuperAdmin and Admin can edit any user without restrictions
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
    
    console.log('Update data (password removed):', updateData);
    
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

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Only SuperAdmin and Admin can permanently delete users
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
      return next(
        new ErrorResponse('Not authorized to delete users. Only SuperAdmin and Admin can permanently delete users.', 403)
      );
    }
    
    // Prevent deleting the last Admin user
    if (user.role === 'Admin') {
      const adminCount = await User.countDocuments({ role: 'Admin', isActive: true });
      if (adminCount <= 1) {
        return next(
          new ErrorResponse('Cannot delete the last Admin user', 400)
        );
      }
    }
    
    await user.deleteOne();
    
    console.log(`User deleted successfully: ${user.username}`);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    next(err);
  }
};
