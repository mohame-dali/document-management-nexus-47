
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin/AdminDepartment
exports.getUsers = async (req, res, next) => {
  try {
    let query;
    
    // Check if this is a messaging route request
    const isMessagingRoute = req.originalUrl.includes('/messaging');
    
    if (isMessagingRoute) {
      // For messaging routes, allow all authenticated users to see active users for messaging
      console.log(`Messaging route: ${req.user.role} (${req.user.username}) requesting users for messaging`);
      
      // Get all active users for messaging purposes - exclude the current user
      query = User.find({ 
        isActive: true,
        _id: { $ne: req.user.id }
      });
    }
    // Regular user management routes with role-based access
    else if (req.user.role === 'AdminDepartment') {
      // If no active department selected
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected. Please contact administrator.', 400));
      }
      
      // Get users that belong to the AdminDepartment's active department
      // Include both active and inactive users for management purposes
      query = User.find({ 
        departments: req.user.activeDepartment._id,
        role: { $in: ['User'] }, // AdminDepartment can only manage User role
        _id: { $ne: req.user.id } // Exclude the current AdminDepartment user
      });
      
      console.log(`AdminDepartment ${req.user.username} requesting users for department: ${req.user.activeDepartment.name}`);
    } 
    // If SuperAdmin or Admin, get all users (both active and inactive)
    else if (req.user.role === 'SuperAdmin' || req.user.role === 'Admin') {
      query = User.find(); // Remove isActive filter to show all users
      console.log(`${req.user.role} ${req.user.username} requesting all users`);
    }
    // If AdminTuningDesk, they can see all users except Admin (both active and inactive)
    else if (req.user.role === 'AdminTuningDesk') {
      query = User.find({ role: { $ne: 'Admin' } }); // Remove isActive filter
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
