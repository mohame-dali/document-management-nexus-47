
const Folder = require('../../../models/Folder');
const ErrorResponse = require('../../../utils/errorResponse');

// @desc    Update folder
// @route   PUT /api/folders/:id
// @access  Private/AdminDepartment
exports.updateFolder = async (req, res, next) => {
  try {
    const { name, parentId } = req.body;
    
    let folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return next(
        new ErrorResponse(`Folder not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Check if folder belongs to the active department
    if (folder.department.toString() !== req.user.activeDepartment._id.toString()) {
      return next(
        new ErrorResponse(`Not authorized to update this folder`, 403)
      );
    }
    
    // Create update object
    const updateData = {};
    
    if (name) updateData.name = name;
    
    // Validate parent folder if provided
    if (parentId !== undefined) {
      if (parentId) {
        const parentFolder = await Folder.findById(parentId);
        
        if (!parentFolder) {
          return next(
            new ErrorResponse(`Parent folder not found`, 404)
          );
        }
        
        if (parentFolder.department.toString() !== req.user.activeDepartment._id.toString()) {
          return next(
            new ErrorResponse(`Parent folder does not belong to your active department`, 403)
          );
        }
        
        // Prevent circular references
        if (parentId === req.params.id) {
          return next(
            new ErrorResponse(`Folder cannot be its own parent`, 400)
          );
        }
        
        // Check if parent is a descendant of the current folder
        let isDescendant = false;
        let currentParent = parentFolder.parent;
        
        while (currentParent) {
          if (currentParent.toString() === req.params.id) {
            isDescendant = true;
            break;
          }
          
          const parent = await Folder.findById(currentParent);
          currentParent = parent ? parent.parent : null;
        }
        
        if (isDescendant) {
          return next(
            new ErrorResponse(`Cannot create circular folder structure`, 400)
          );
        }
        
        updateData.parent = parentId;
      } else {
        updateData.parent = null;
      }
    }
    
    // Update folder
    folder = await Folder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('department')
      .populate('parent')
      .populate('createdBy', 'username');
    
    res.status(200).json({
      success: true,
      data: folder
    });
  } catch (err) {
    next(err);
  }
};
