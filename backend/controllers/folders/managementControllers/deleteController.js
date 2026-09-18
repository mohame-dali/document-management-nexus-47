const Folder = require('../../../models/Folder');
const IncomingDocument = require('../../../models/IncomingDocument');
const OutgoingDocument = require('../../../models/OutgoingDocument');
const ErrorResponse = require('../../../utils/errorResponse');

// @desc    Delete folder (Soft delete)
// @route   DELETE /api/folders/:id
// @access  Private/AdminDepartment
exports.deleteFolder = async (req, res, next) => {
  try {
    const folder = await Folder.findById(req.params.id);
    
    if (!folder || folder.isDeleted) {
      return next(
        new ErrorResponse(`المجلد غير موجود برمز ${req.params.id}`, 404)
      );
    }
    
    // Check if user has access to this folder
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
      const activeDeptId = req.user.activeDepartment?._id ? req.user.activeDepartment._id.toString() : req.user.activeDepartment?.toString();
      const folderDeptId = folder.department?._id ? folder.department._id.toString() : folder.department?.toString();
      
      if (folderDeptId !== activeDeptId) {
        return next(
          new ErrorResponse(`غير مصرح لك بحذف هذا المجلد`, 403)
        );
      }
    }
    
    // Check if folder has active subfolders
    const subfolders = await Folder.find({ parent: req.params.id, isDeleted: false });
    if (subfolders.length > 0) {
      return next(
        new ErrorResponse('لا يمكن حذف المجلد لأنه يحتوي على مجلدات فرعية. يرجى حذف المجلدات الفرعية أولاً أو نقلها.', 400)
      );
    }
    
    // Check if folder has active documents
    const [incomingDocs, outgoingDocs] = await Promise.all([
      IncomingDocument.countDocuments({ folder: req.params.id, isDeleted: false }),
      OutgoingDocument.countDocuments({ folder: req.params.id, isDeleted: false })
    ]);
    
    if (incomingDocs > 0 || outgoingDocs > 0) {
      return next(
        new ErrorResponse(`لا يمكن حذف المجلد لأنه يحتوي على ${incomingDocs + outgoingDocs} مستند. يرجى نقل المستندات أو إفراغ المجلد أولاً.`, 400)
      );
    }
    
    // Soft delete the folder
    folder.isDeleted = true;
    folder.deletedAt = new Date();
    folder.deletedBy = req.user._id || req.user.id;
    await folder.save({ validateBeforeSave: false });
    
    res.status(200).json({
      success: true,
      message: 'تم حذف المجلد بنجاح'
    });
  } catch (err) {
    next(err);
  }
};
