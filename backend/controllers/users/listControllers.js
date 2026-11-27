
const mongoose = require('mongoose');
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');

function extractObjectId(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    return mongoose.Types.ObjectId.isValid(value) ? value : null;
  }
  if (value._id) {
    return extractObjectId(value._id);
  }
  if (typeof value.toString === 'function') {
    const str = value.toString();
    return mongoose.Types.ObjectId.isValid(str) ? str : null;
  }
  return null;
}

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin/AdminDepartment
exports.getUsers = async (req, res, next) => {
  try {
    let query;
    
    // Check if this is a messaging route request (/api/users/messaging)
    const isMessagingRoute = req.path === '/messaging' || (req.baseUrl + req.path) === '/api/users/messaging';
    
    if (isMessagingRoute) {
      // For messaging routes, allow all authenticated users to see active users for messaging
      console.log(`Messaging route: ${req.user.role} (${req.user.username}) requesting users for messaging`);
      
      // Get all active users for messaging purposes - exclude current user and deleted users
      query = User.find({ 
        isActive: true,
        isDeleted: { $ne: true },
        _id: { $ne: req.user.id }
      });
    }
    // Regular user management routes with role-based access
    else if (req.user.role === 'AdminDepartment') {
      const activeDeptId =
        extractObjectId(req.user.activeDepartment) ||
        (Array.isArray(req.user.departments) && req.user.departments.length > 0
          ? extractObjectId(req.user.departments[0])
          : null);

      // If no active department selected
      if (!activeDeptId) {
        return next(new ErrorResponse('No active department selected. Please contact administrator.', 400));
      }
      
      // Get users that belong to the AdminDepartment's active department
      // Include both active and inactive users for management purposes, excluding deleted users
      query = User.find({ 
        $or: [{ departments: activeDeptId }, { activeDepartment: activeDeptId }],
        role: { $in: ['User'] }, // AdminDepartment can only manage User role
        _id: { $ne: req.user.id }, // Exclude the current AdminDepartment user
        isDeleted: { $ne: true }
      });
      
      console.log(`AdminDepartment ${req.user.username} requesting users for department: ${req.user.activeDepartment?.name || activeDeptId}`);
    } 
    // If Director or Admin, get all non-deleted users (or include deleted for Admin when requested)
    else if (req.user.role === 'Director' || req.user.role === 'Admin') {
      const includeDeleted = req.user.role === 'Admin' && req.query.includeDeleted === 'true';
      const filter = includeDeleted ? {} : { isDeleted: { $ne: true } };
      query = User.find(filter);
      console.log(
        `${req.user.role} ${req.user.username} requesting ${includeDeleted ? 'all users (including deleted)' : 'all non-deleted users'}`
      );
    }
    // If AdminTuningDesk, they can see all users except Admin (both active and inactive, not deleted)
    else if (req.user.role === 'AdminTuningDesk') {
      query = User.find({ role: { $ne: 'Admin' }, isDeleted: { $ne: true } });
      console.log(`AdminTuningDesk ${req.user.username} requesting users (excluding Admin)`);
    }
    else {
      return next(
        new ErrorResponse('Not authorized to access this resource', 403)
      );
    }
    
    // Execute query with populated fields
    const users = await query
      .populate('departments')
      .populate('activeDepartment')
      .populate('personnelId', 'nom prenom poste')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${users.length} users for ${req.user.role} user ${req.user.username}`);
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    console.error('Error in getUsers:', err);
    next(err);
  }
};

// @desc    Get active assignable users for document responsible assignment
// @route   GET /api/users/assignable
// @access  Private/Admin/AdminDepartment/Director
exports.getAssignableUsers = async (req, res, next) => {
  try {
    const filter = {
      isActive: true,
      isDeleted: { $ne: true },
      role: { $nin: ['Admin', 'AdminTuningDesk'] }
    };

    if (req.user.role === 'AdminDepartment') {
      const activeDeptId =
        extractObjectId(req.user.activeDepartment) ||
        (Array.isArray(req.user.departments) && req.user.departments.length > 0
          ? extractObjectId(req.user.departments[0])
          : null);

      if (!activeDeptId) {
        return next(new ErrorResponse('No active department selected. Please contact administrator.', 400));
      }

      filter.$or = [{ departments: activeDeptId }, { activeDepartment: activeDeptId }];
    } else if (req.user.role === 'Admin' || req.user.role === 'Director') {
      const rawDeptParam = typeof req.query.departmentId === 'string' ? req.query.departmentId.trim() : '';
      if (rawDeptParam && rawDeptParam !== 'all') {
        const deptIds = rawDeptParam
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);

        const invalidId = deptIds.find((id) => !mongoose.Types.ObjectId.isValid(id));
        if (invalidId) {
          return next(new ErrorResponse(`Invalid department ID: ${invalidId}`, 400));
        }

        if (deptIds.length > 0) {
          filter.$or = [
            { departments: { $in: deptIds } },
            { activeDepartment: { $in: deptIds } }
          ];
        }
      }
    } else {
      return next(new ErrorResponse('Not authorized to access assignable users', 403));
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('departments')
      .populate('activeDepartment')
      .populate('personnelId', 'nom prenom poste')
      .sort({ username: 1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    console.error('Error in getAssignableUsers:', err);
    next(err);
  }
};
