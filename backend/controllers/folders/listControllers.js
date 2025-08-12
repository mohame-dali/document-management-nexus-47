
const Folder = require('../../models/Folder');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get all folders
// @route   GET /api/folders
// @access  Private
exports.getFolders = async (req, res, next) => {
  try {
    let query = {};
    
    // SuperAdmin, AdminTuningDesk and Admin can see all departments' folders
    if (req.user.role === 'SuperAdmin' || req.user.role === 'AdminTuningDesk') {
      // No department filter - get all folders
      if (req.query.department) {
        query.department = req.query.department;
      }
    } 
    // Admin can also see all departments
    else if (req.user.role === 'Admin') {
      if (req.query.department) {
        query.department = req.query.department;
      }
    }
    // For AdminDepartment and User roles, restrict to their department
    else {
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('No active department selected', 403));
      }
      
      query.department = req.user.activeDepartment._id;
    }
    
    console.log(`User ${req.user.username} (${req.user.role}) fetching folders with query:`, query);
    
    const folders = await Folder.find(query)
      .populate('department')
      .populate('parent')
      .populate('createdBy', 'username');
    
    console.log(`Found ${folders.length} folders for user ${req.user.username}`);
    
    res.status(200).json({
      success: true,
      count: folders.length,
      data: folders
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get root folders (no parent)
// @route   GET /api/folders/department/:departmentId/root
// @access  Private
exports.getRootFolders = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    
    // Check if department exists
    if (departmentId) {
      // SuperAdmin, AdminTuningDesk and Admin can access any department
      if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin' && req.user.role !== 'AdminTuningDesk') {
        const hasDepartment = req.user.departments.some(
          dept => dept._id.toString() === departmentId
        );
        
        if (!hasDepartment) {
          return next(
            new ErrorResponse(`Not authorized to access this department`, 403)
          );
        }
      }
    } else {
      return next(
        new ErrorResponse(`Please provide a department ID`, 400)
      );
    }
    
    // Get root folders (no parent)
    const folders = await Folder.find({
      department: departmentId,
      parent: null
    }).populate('department')
      .populate('createdBy', 'username');
    
    res.status(200).json({
      success: true,
      count: folders.length,
      data: folders
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get subfolders of a folder
// @route   GET /api/folders/:id/subfolders
// @access  Private
exports.getSubFolders = async (req, res, next) => {
  try {
    const parentFolder = await Folder.findById(req.params.id);
    
    if (!parentFolder) {
      return next(
        new ErrorResponse(`Folder not found with id of ${req.params.id}`, 404)
      );
    }
    
    // SuperAdmin, AdminTuningDesk and Admin can access any folder
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin' && req.user.role !== 'AdminTuningDesk') {
      if (parentFolder.department.toString() !== req.user.activeDepartment._id.toString()) {
        return next(
          new ErrorResponse(`Not authorized to access this folder`, 403)
        );
      }
    }
    
    // Get subfolders
    const subfolders = await Folder.find({
      parent: req.params.id
    }).populate('department')
      .populate('createdBy', 'username');
    
    res.status(200).json({
      success: true,
      count: subfolders.length,
      data: subfolders
    });
  } catch (err) {
    next(err);
  }
};
