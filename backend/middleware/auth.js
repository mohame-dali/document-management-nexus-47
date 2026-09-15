
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const OrganizationSettings = require('../models/OrganizationSettings');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  } 
  // Check for token in cookies as fallback
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    console.log('No token provided');
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Check if JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return next(new ErrorResponse('Server configuration error', 500));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('Token decoded successfully:', decoded.id);

    // Find the user and populate departments
    const user = await User.findById(decoded.id).populate('departments activeDepartment');

    if (!user) {
      console.log('User not found for id:', decoded.id);
      return next(new ErrorResponse('User not found', 404));
    }

    if (!user.isActive) {
      console.log('User account is deactivated:', decoded.id);
      return next(new ErrorResponse('Your account has been deactivated', 403));
    }

    // Set the user on the request object
    req.user = user;
    console.log('User authenticated successfully:', user.username);
    console.log('User role:', user.role);
    console.log('User departments:', user.departments?.map(d => ({ id: d._id, name: d.name })));
    console.log('User active department:', user.activeDepartment ? { id: user.activeDepartment._id, name: user.activeDepartment.name } : 'None');
    
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    
    // Clear any invalid tokens to force re-login
    if (err.name === 'JsonWebTokenError') {
      console.log('Invalid token detected - clearing client storage recommended');
      return next(new ErrorResponse('Invalid token - please login again', 401));
    } else if (err.name === 'TokenExpiredError') {
      console.log('Token expired - clearing client storage recommended');
      return next(new ErrorResponse('Token expired - please login again', 401));
    }
    
    // For any other JWT errors, recommend clearing storage
    console.log('JWT verification failed - client should clear storage and re-login');
    return next(new ErrorResponse('Authentication failed - please login again', 401));
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Enhanced messaging route detection - allow all authenticated users access to messaging
    const isMessagingRoute = req.originalUrl.includes('/messaging') || 
                           req.originalUrl.includes('/messages') ||
                           req.originalUrl.includes('/api/messages') ||
                           req.originalUrl.includes('/api/users/messaging');
    
    if (isMessagingRoute) {
      console.log(`Messaging route access granted for ${req.user.role} (${req.user.username}) to: ${req.originalUrl}`);
      return next();
    }
    
    if (!roles.includes(req.user.role)) {
      console.log(`Access denied for ${req.user.role} to route: ${req.originalUrl}`);
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    
    console.log(`Role-based access granted for ${req.user.role} to: ${req.originalUrl}`);
    next();
  };
};

// Check if user has access to the department
exports.checkDepartmentAccess = (checkActiveDepartment = true) => {
  return async (req, res, next) => {
    // SuperAdmin, Admin and AdminTuningDesk have access to all departments
    if (req.user.role === 'SuperAdmin' || req.user.role === 'Admin' || req.user.role === 'AdminTuningDesk') {
      console.log(`${req.user.role} has full access to all departments`);
      return next();
    }

    // For AdminDepartment and User roles, check department access
    const departmentId = req.params.departmentId || req.body.departmentId;
    
    if (!departmentId && checkActiveDepartment) {
      // Check if user has an active department
      if (!req.user.activeDepartment) {
        console.log(`User ${req.user.username} has no active department`);
        return next(
          new ErrorResponse('No active department selected. Please contact your administrator to assign you to a department.', 403)
        );
      }
      console.log(`User ${req.user.username} is using active department: ${req.user.activeDepartment._id}`);
      return next();
    }

    // Enhanced skip logic for messaging routes - allow cross-role messaging for ALL users
    const skipDepartmentCheck = [
      '/api/incoming-documents',
      '/api/outgoing-documents',
      '/api/folders',
      '/api/messages',
      '/api/users/messaging'
    ];
    
    // Check if the current route should skip department validation
    if (skipDepartmentCheck.some(route => req.originalUrl.startsWith(route))) {
      console.log(`Skipping department check for cross-role messaging route: ${req.originalUrl} (User: ${req.user.role})`);
      return next();
    }

    // If we have a departmentId to check, verify user has access to it
    if (departmentId) {
      // Check if user has access to the department
      const hasDepartmentAccess = req.user.departments.some(
        (dept) => dept._id.toString() === departmentId
      );

      if (!hasDepartmentAccess) {
        console.log(`User ${req.user.username} does not have access to department: ${departmentId}`);
        return next(
          new ErrorResponse('Not authorized to access this department', 403)
        );
      }
      
      console.log(`User ${req.user.username} has access to department: ${departmentId}`);
    }

    next();
  };
};

// Check if user has access to HR module
exports.checkRHAccess = async (req, res, next) => {
  try {
    // a. Vérifier que req.user existe (sinon 401)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non autorisé à accéder à cette ressource'
      });
    }

    const { role } = req.user;

    // b. Si role === 'Admin' → next() (accès autorisé)
    if (role === 'Admin') {
      return next();
    }

    // c. Si role === 'SuperAdmin' → next() (accès autorisé, conserve son comportement actuel)
    if (role === 'SuperAdmin') {
      return next();
    }

    // d. Si role === 'AdminDepartment' :
    if (role === 'AdminDepartment') {
      const settings = await OrganizationSettings.findOne();
      if (!settings || !settings.rhDepartmentId) {
        return res.status(403).json({
          success: false,
          message: "Le département RH n'est pas encore configuré"
        });
      }

      const rhDeptId = settings.rhDepartmentId.toString();
      const userActiveDept = req.user.activeDepartment;
      const userActiveDeptId = userActiveDept
        ? (userActiveDept._id ? userActiveDept._id.toString() : userActiveDept.toString())
        : null;

      if (userActiveDeptId && userActiveDeptId === rhDeptId) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Accès réservé au département RH'
      });
    }

    // e. Sinon → 403 "Accès refusé"
    return res.status(403).json({
      success: false,
      message: 'Accès refusé'
    });
  } catch (error) {
    next(error);
  }
};

