
const Folder = require('../../../models/Folder');
const ErrorResponse = require('../../../utils/errorResponse');

// @desc    Create new folder
// @route   POST /api/folders
// @access  Private/AdminDepartment
exports.createFolder = async (req, res, next) => {
  try {
    // Get folder data
    const { name, parentId, department, createdBy } = req.body;
    
    if (!name) {
      return next(
        new ErrorResponse('Please provide a folder name', 400)
      );
    }
    
    // Use department from request body if provided, otherwise use active department
    const targetDepartment = department || req.user.activeDepartment._id;
    
    if (!targetDepartment) {
      return next(
        new ErrorResponse('Department is required', 400)
      );
    }
    
    // Validate parent folder if provided
    if (parentId) {
      const parentFolder = await Folder.findById(parentId);
      
      if (!parentFolder) {
        return next(
          new ErrorResponse(`Parent folder not found`, 404)
        );
      }
      
      // Check if parent folder belongs to the same department
      if (parentFolder.department.toString() !== targetDepartment.toString()) {
        return next(
          new ErrorResponse(`Parent folder must belong to the same department`, 403)
        );
      }
    }
    
    // Check for duplicate folder names within the same parent/department
    const existingFolder = await Folder.findOne({
      name,
      parent: parentId || null,
      department: targetDepartment
    });
    
    if (existingFolder) {
      return next(
        new ErrorResponse('A folder with this name already exists in this location', 400)
      );
    }
    
    // Create folder
    const folder = await Folder.create({
      name,
      parent: parentId || null,
      department: targetDepartment,
      createdBy: createdBy || req.user._id
    });
    
    // Populate fields for response
    const populatedFolder = await Folder.findById(folder._id)
      .populate('department')
      .populate('parent')
      .populate('createdBy', 'username');
    
    res.status(201).json({
      success: true,
      data: populatedFolder
    });
  } catch (err) {
    next(err);
  }
};
