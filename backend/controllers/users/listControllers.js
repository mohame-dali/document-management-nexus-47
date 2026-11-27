
const mongoose = require('mongoose');
const User = require('../../models/User');
const Department = require('../../models/Department');
const OrganizationSettings = require('../../models/OrganizationSettings');
const ErrorResponse = require('../../utils/errorResponse');

function extractObjectId(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    return mongoose.Types.ObjectId.isValid(value) ? value : null;
  }
  if (value._bsontype === 'ObjectId' || value.constructor?.name === 'ObjectId') {
    const str = value.toString();
    return mongoose.Types.ObjectId.isValid(str) ? str : null;
  }
  if (typeof value === 'object' && value._id && value._id !== value) {
    return extractObjectId(value._id);
  }
  if (typeof value.toString === 'function') {
    const str = value.toString();
    return mongoose.Types.ObjectId.isValid(str) ? str : null;
  }
  return null;
}

function isBureauDirecteurDept(dept, orgSettings) {
  if (!dept) return false;
  if (
    orgSettings?.bureauDirecteurDepartmentId &&
    String(dept._id) === String(orgSettings.bureauDirecteurDepartmentId)
  ) {
    return true;
  }
  const code = typeof dept.code === 'string' ? dept.code.trim().toLowerCase() : '';
  const name = typeof dept.name === 'string' ? dept.name.trim().toLowerCase() : '';
  if (['dg', 'bd', 'dir'].includes(code)) return true;
  return (
    /^(dg|bd|dir)$/i.test(name) ||
    /bureau\s*(du\s*)?directeur/i.test(name) ||
    /^direction(\s+g[ée]n[ée]rale)?$/i.test(name) ||
    /مكتب\s*المدير/i.test(name) ||
    /المديرية/i.test(name)
  );
}

function isRhDept(dept, orgSettings) {
  if (!dept) return false;
  if (orgSettings?.rhDepartmentId && String(dept._id) === String(orgSettings.rhDepartmentId)) {
    return true;
  }
  const code = typeof dept.code === 'string' ? dept.code.trim().toLowerCase() : '';
  const name = typeof dept.name === 'string' ? dept.name.trim().toLowerCase() : '';
  if (['rh', 'hr'].includes(code)) return true;
  return (
    /\b(rh|hr)\b/i.test(name) ||
    /ressources?\s*humaines?/i.test(name) ||
    /الموارد\s*البشرية/i.test(name)
  );
}

function isBureauOrdreDept(dept, orgSettings) {
  if (!dept) return false;
  if (
    orgSettings?.bureauOrdreDepartmentId &&
    String(dept._id) === String(orgSettings.bureauOrdreDepartmentId)
  ) {
    return true;
  }
  const code = typeof dept.code === 'string' ? dept.code.trim().toLowerCase() : '';
  const name = typeof dept.name === 'string' ? dept.name.trim().toLowerCase() : '';
  if (['bo'].includes(code)) return true;
  return (
    /\bbo\b/i.test(name) ||
    /bureau\s*d['’]?\s*ordre/i.test(name) ||
    /bureau\s*ordre/i.test(name) ||
    /مكتب\s*الضبط/i.test(name) ||
    /مكتب\s*التنسيق/i.test(name)
  );
}

async function resolveAssignableDepartmentScope(baseDeptIds, activeDeptHint = null) {
  const normalizedBaseIds = (Array.isArray(baseDeptIds) ? baseDeptIds : [])
    .map((id) => extractObjectId(id))
    .filter(Boolean);

  const [allDepts, orgSettings] = await Promise.all([
    Department.find({ isActive: { $ne: false } }).lean(),
    OrganizationSettings.findOne().lean(),
  ]);

  const allowedDepartmentIds = new Set(normalizedBaseIds);

  // Always include Bureau Directeur departments for assignable scope
  for (const dept of allDepts) {
    if (isBureauDirecteurDept(dept, orgSettings)) {
      allowedDepartmentIds.add(String(dept._id));
    }
  }

  // Check if any base department (or populated hint) is RH
  const isRhScope =
    normalizedBaseIds.some((deptId) => {
      const matched = allDepts.find((d) => String(d._id) === deptId);
      return matched ? isRhDept(matched, orgSettings) : false;
    }) ||
    (activeDeptHint && typeof activeDeptHint === 'object' ? isRhDept(activeDeptHint, orgSettings) : false);

  // If manager is in RH, also include Bureau d'Ordre departments
  if (isRhScope) {
    for (const dept of allDepts) {
      if (isBureauOrdreDept(dept, orgSettings)) {
        allowedDepartmentIds.add(String(dept._id));
      }
    }
  }

  return {
    allowedDepartmentIds: Array.from(allowedDepartmentIds),
    isRhScope,
  };
}

exports.extractObjectId = extractObjectId;
exports.isBureauOrdreDept = isBureauOrdreDept;
exports.resolveAssignableDepartmentScope = resolveAssignableDepartmentScope;

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
      isActive: { $ne: false },
      isDeleted: { $ne: true },
      role: { $ne: 'Admin' }
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

      const { allowedDepartmentIds } = await resolveAssignableDepartmentScope(
        [activeDeptId],
        req.user.activeDepartment
      );

      filter.$or = [
        { departments: { $in: allowedDepartmentIds } },
        { activeDepartment: { $in: allowedDepartmentIds } }
      ];
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
          const { allowedDepartmentIds } = await resolveAssignableDepartmentScope(deptIds);
          filter.$or = [
            { departments: { $in: allowedDepartmentIds } },
            { activeDepartment: { $in: allowedDepartmentIds } }
          ];
        }
      } else {
        filter.role = { $nin: ['Admin', 'AdminTuningDesk'] };
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
