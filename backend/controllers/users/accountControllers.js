
const User = require('../../models/User');
const Personnel = require('../../models/Personnel');
const ErrorResponse = require('../../utils/errorResponse');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { extractId, isRHAdminDepartment } = require('../../utils/rhAuthHelper');

// @desc    Deactivate user (soft delete)
// @route   PUT /api/users/:id/deactivate
// @access  Private/Admin/AdminDepartment
exports.deactivateUser = async (req, res, next) => {
  try {
    // Validate that id is provided and is a valid ObjectId format
    if (!req.params.id || req.params.id === 'undefined') {
      return next(
        new ErrorResponse('User ID is required and must be valid', 400)
      );
    }
    
    let user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).populate('departments');
    
    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Enhanced authorization: Admin OR RH AdminDepartment (cannot mutate Admin accounts)
    if (req.user.role === 'Admin') {
      console.log(`Admin user - can deactivate any user`);
    } else if (req.user.role === 'AdminDepartment') {
      const isRH = await isRHAdminDepartment(req.user);
      if (!isRH) {
        return next(
          new ErrorResponse('Accès réservé à l\'administrateur ou au responsable RH', 403)
        );
      }
      if (user.role === 'Admin') {
        return next(
          new ErrorResponse('Le responsable RH ne peut pas modifier le statut d\'un compte Admin', 403)
        );
      }
    } else {
      return next(
        new ErrorResponse('Not authorized to deactivate users', 403)
      );
    }
    
    // Prevent deactivating Director user
    if (user.role === 'Director' && req.body.isActive === false) {
      return next(
        new ErrorResponse('Impossible de désactiver le compte Directeur', 400)
      );
    }

    // Update user activation status based on request
    const newStatus = req.body.isActive !== undefined ? Boolean(req.body.isActive) : false;

    // Prevent deactivating the last active Admin user
    if (user.role === 'Admin' && newStatus === false) {
      const activeAdminCount = await User.countDocuments({
        role: 'Admin',
        isActive: true,
        isDeleted: { $ne: true }
      });

      if (activeAdminCount <= 1) {
        return next(
          new ErrorResponse('Cannot deactivate the last active Admin user', 400)
        );
      }
    }

    const originalPersonnelId = user.personnelId;
    // Préserver impérativement le lien User.personnelId <-> Personnel.userId lors de la désactivation / réactivation
    const userUpdateFields = { isActive: newStatus };

    user = await User.findByIdAndUpdate(
      req.params.id,
      userUpdateFields,
      { new: true }
    ).populate('departments')
     .populate('activeDepartment')
     .populate('createdBy', 'username');

    try {
      if (originalPersonnelId || user?._id) {
        const personnelFilter = originalPersonnelId
          ? { $or: [{ userId: user._id }, { _id: originalPersonnelId }], isDeleted: { $ne: true } }
          : { userId: user._id, isDeleted: { $ne: true } };

        if (newStatus === false) {
          await Personnel.updateMany(
            personnelFilter,
            { $set: { statut: 'inactif' } }
          );
        } else {
          await Personnel.updateMany(
            personnelFilter,
            { $set: { statut: 'actif' } }
          );
        }
      }
    } catch (syncErr) {
      console.warn('Erreur lors de la synchronisation du statut Personnel pour utilisateur désactivé/réactivé:', syncErr.message);
    }

    console.log(`User ${newStatus ? 'activated' : 'deactivated'} successfully: ${user.username}`);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Deactivate user error:', err);
    next(err);
  }
};

// @desc    Reset user password
// @route   PUT /api/users/:id/resetpassword
// @access  Private/Admin/AdminDepartment
exports.resetPassword = async (req, res, next) => {
  try {
    // Validate that id is provided and is a valid ObjectId format
    if (!req.params.id || req.params.id === 'undefined') {
      return next(
        new ErrorResponse('User ID is required and must be valid', 400)
      );
    }
    
    const user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).populate('departments');
    
    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Enhanced authorization for Admin and AdminDepartment
    if (req.user.role === 'Admin') {
      console.log(`Admin user - can reset password for any user`);
      // Admin can reset password for any user
    } else if (req.user.role === 'AdminDepartment') {
      // Verify the user belongs to the AdminDepartment's active department
      const activeDeptId = extractId(req.user.activeDepartment);
      if (!activeDeptId) {
        return next(new ErrorResponse('No active department selected', 400));
      }
      
      const userDeptIds = (user.departments || []).map(dept => extractId(dept));
      const hasAccess = userDeptIds.includes(activeDeptId);
      
      if (!hasAccess) {
        return next(
          new ErrorResponse(`Not authorized to reset password for this user`, 403)
        );
      }
    } else {
      return next(
        new ErrorResponse('Not authorized to reset passwords', 403)
      );
    }
    
    // Set new password (randomly generated strong password or from request)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    let newPassword = req.body.newPassword;
    
    if (newPassword) {
      if (!passwordRegex.test(newPassword)) {
        return next(
          new ErrorResponse('Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.', 400)
        );
      }
    } else {
      // Génération aléatoire d'un mot de passe fort
      newPassword = crypto.randomBytes(4).toString('hex') + 'Aa1!';
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user with new password
    await User.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword },
      { new: true }
    );
    
    console.log(`Password reset successfully for user: ${user.username}`);
    
    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      newPassword: newPassword // Include the new password in response for admin reference
    });
  } catch (err) {
    console.error('Reset password error:', err);
    next(err);
  }
};
