const Folder = require('../../../models/Folder');
const ErrorResponse = require('../../../utils/errorResponse');

// @desc    Create new folder
// @route   POST /api/folders
// @access  Private/AdminDepartment
exports.createFolder = async (req, res, next) => {
  try {
    const { name, description, parentId, department, color } = req.body;
    
    if (!name || !name.trim()) {
      return next(
        new ErrorResponse('يرجى إدخال اسم المجلد', 400)
      );
    }
    
    // Determine target department
    let targetDepartment = department;
    if (!targetDepartment) {
      if (req.user.activeDepartment) {
        targetDepartment = req.user.activeDepartment._id || req.user.activeDepartment;
      }
    }
    
    if (!targetDepartment) {
      return next(
        new ErrorResponse('القسم الإداري مطلوب لإنشاء المجلد', 400)
      );
    }
    
    // Validate parent folder if provided
    if (parentId) {
      const parentFolder = await Folder.findById(parentId);
      
      if (!parentFolder) {
        return next(
          new ErrorResponse(`المجلد الأصل غير موجود`, 404)
        );
      }
      
      // Check if parent folder belongs to the same department
      if (parentFolder.department.toString() !== targetDepartment.toString()) {
        return next(
          new ErrorResponse(`يجب أن ينتمي المجلد الأصل إلى نفس القسم الإداري`, 403)
        );
      }
    }
    
    // Check for duplicate folder names within the same parent and department
    const existingFolder = await Folder.findOne({
      name: name.trim(),
      parent: parentId || null,
      department: targetDepartment
    });
    
    if (existingFolder) {
      return next(
        new ErrorResponse('يوجد مجلد آخر بنفس هذا الاسم في نفس المكان', 400)
      );
    }
    
    // Create folder
    const folder = await Folder.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      parent: parentId || null,
      department: targetDepartment,
      createdBy: req.user._id,
      color: color || '#2c5282'
    });
    
    // Populate fields for response
    const populatedFolder = await Folder.findById(folder._id)
      .populate('department', 'name')
      .populate('parent', 'name')
      .populate('createdBy', 'username role');
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء المجلد بنجاح',
      data: populatedFolder
    });
  } catch (err) {
    next(err);
  }
};
