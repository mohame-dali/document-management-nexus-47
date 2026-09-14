const Folder = require('../../../models/Folder');
const ErrorResponse = require('../../../utils/errorResponse');

// @desc    Update folder status (En cours / Fermé)
// @route   PUT /api/folders/:id/status
// @access  Private/AdminDepartment
exports.updateFolderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status || !['En cours', 'Fermé'].includes(status)) {
      return next(
        new ErrorResponse('يرجى تحديد حالة صالحة (En cours أو Fermé)', 400)
      );
    }
    
    let folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return next(
        new ErrorResponse(`المجلد غير موجود برمز ${req.params.id}`, 404)
      );
    }
    
    // Check if folder belongs to active department
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
      const activeDeptId = req.user.activeDepartment?._id ? req.user.activeDepartment._id.toString() : req.user.activeDepartment?.toString();
      const folderDeptId = folder.department?._id ? folder.department._id.toString() : folder.department?.toString();
      
      if (folderDeptId !== activeDeptId) {
        return next(
          new ErrorResponse(`غير مصرح لك بتعديل حالة هذا المجلد`, 403)
        );
      }
    }
    
    folder.status = status;
    await folder.save();

    const populatedFolder = await Folder.findById(folder._id)
      .populate('department', 'name')
      .populate('parent', 'name')
      .populate('createdBy', 'username role');
    
    res.status(200).json({
      success: true,
      message: status === 'En cours' ? 'تم تنشيط المجلد بنجاح' : 'تم أرشفة/إغلاق المجلد بنجاح',
      data: populatedFolder
    });
  } catch (err) {
    next(err);
  }
};
