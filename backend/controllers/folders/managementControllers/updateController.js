const Folder = require('../../../models/Folder');
const ErrorResponse = require('../../../utils/errorResponse');

// Helper to check if potentialParent is a descendant of folderId
const checkIsDescendant = async (potentialParentId, folderId) => {
  let currentParentId = potentialParentId;
  const visited = new Set();
  
  while (currentParentId) {
    if (currentParentId.toString() === folderId.toString()) {
      return true;
    }
    if (visited.has(currentParentId.toString())) {
      break;
    }
    visited.add(currentParentId.toString());

    const parentFolder = await Folder.findById(currentParentId);
    currentParentId = parentFolder ? parentFolder.parent : null;
  }
  return false;
};

// @desc    Update folder
// @route   PUT /api/folders/:id
// @access  Private/AdminDepartment
exports.updateFolder = async (req, res, next) => {
  try {
    const { name, description, parentId, status, color } = req.body;
    
    let folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return next(
        new ErrorResponse(`المجلد غير موجود برمز ${req.params.id}`, 404)
      );
    }
    
    // Check if folder belongs to the active department
    if (req.user.role !== 'Admin') {
      const activeDeptId = req.user.activeDepartment?._id ? req.user.activeDepartment._id.toString() : req.user.activeDepartment?.toString();
      const folderDeptId = folder.department?._id ? folder.department._id.toString() : folder.department?.toString();
      
      if (folderDeptId !== activeDeptId) {
        return next(
          new ErrorResponse(`غير مصرح لك بتعديل هذا المجلد`, 403)
        );
      }
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (status !== undefined) updateData.status = status;
    if (color !== undefined) updateData.color = color;
    
    // Validate parent folder if provided
    if (parentId !== undefined) {
      if (parentId) {
        if (parentId.toString() === req.params.id.toString()) {
          return next(
            new ErrorResponse(`لا يمكن أن يكون المجلد أصلاً لنفسه`, 400)
          );
        }

        const parentFolder = await Folder.findById(parentId);
        if (!parentFolder) {
          return next(
            new ErrorResponse(`المجلد الأصل المحدد غير موجود`, 404)
          );
        }
        
        // Prevent circular references
        const isDescendant = await checkIsDescendant(parentId, req.params.id);
        if (isDescendant) {
          return next(
            new ErrorResponse(`لا يمكن جعل المجلد تابعاً لأحد مجلداته الفرعية (دائرية غير مسموحة)`, 400)
          );
        }
        
        updateData.parent = parentId;
      } else {
        updateData.parent = null;
      }
    }
    
    folder = await Folder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('department', 'name')
      .populate('parent', 'name')
      .populate('createdBy', 'username role');
    
    res.status(200).json({
      success: true,
      message: 'تم تحديث المجلد بنجاح',
      data: folder
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Move folder to new parent
// @route   PUT /api/folders/:id/move
// @access  Private/AdminDepartment
exports.moveFolder = async (req, res, next) => {
  try {
    const { parentId } = req.body;
    
    let folder = await Folder.findById(req.params.id);
    if (!folder) {
      return next(new ErrorResponse(`المجلد غير موجود برمز ${req.params.id}`, 404));
    }
    
    if (req.user.role !== 'Admin') {
      const activeDeptId = req.user.activeDepartment?._id ? req.user.activeDepartment._id.toString() : req.user.activeDepartment?.toString();
      const folderDeptId = folder.department?._id ? folder.department._id.toString() : folder.department?.toString();
      
      if (folderDeptId !== activeDeptId) {
        return next(new ErrorResponse(`غير مصرح لك بنقل هذا المجلد`, 403));
      }
    }

    if (parentId) {
      if (parentId.toString() === req.params.id.toString()) {
        return next(new ErrorResponse(`لا يمكن نقل المجلد إلى نفسه`, 400));
      }

      const parentFolder = await Folder.findById(parentId);
      if (!parentFolder) {
        return next(new ErrorResponse(`المجلد الأصل المحدد غير موجود`, 404));
      }

      const isDescendant = await checkIsDescendant(parentId, req.params.id);
      if (isDescendant) {
        return next(new ErrorResponse(`لا يمكن نقل المجلد إلى أحد فروعه`, 400));
      }
    }

    folder.parent = parentId || null;
    await folder.save();

    const populatedFolder = await Folder.findById(folder._id)
      .populate('department', 'name')
      .populate('parent', 'name')
      .populate('createdBy', 'username');

    res.status(200).json({
      success: true,
      message: 'تم نقل المجلد بنجاح',
      data: populatedFolder
    });
  } catch (err) {
    next(err);
  }
};
