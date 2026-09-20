const Folder = require('../../models/Folder');
const IncomingDocument = require('../../models/IncomingDocument');
const OutgoingDocument = require('../../models/OutgoingDocument');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get single folder
// @route   GET /api/folders/:id
// @access  Private
exports.getFolder = async (req, res, next) => {
  try {
    const folder = await Folder.findById(req.params.id)
      .populate('department', 'name')
      .populate('parent', 'name')
      .populate('createdBy', 'username role photo');
    
    if (!folder || folder.isDeleted) {
      return next(
        new ErrorResponse(`المجلد غير موجود برمز ${req.params.id}`, 404)
      );
    }
    
    // Check if user has access to this folder
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin' && req.user.role !== 'AdminTuningDesk') {
      const activeDeptId = req.user.activeDepartment?._id ? req.user.activeDepartment._id.toString() : req.user.activeDepartment?.toString();
      const folderDeptId = folder.department?._id ? folder.department._id.toString() : folder.department?.toString();
      
      if (folderDeptId !== activeDeptId) {
        return next(
          new ErrorResponse(`غير مصرح لك بالوصول إلى هذا المجلد`, 403)
        );
      }
    }

    // Get subfolders count and document counts
    const [subfolderCount, incomingCount, outgoingCount] = await Promise.all([
      Folder.countDocuments({ parent: folder._id, isDeleted: false }),
      IncomingDocument.countDocuments({ folder: folder._id, isDeleted: false }),
      OutgoingDocument.countDocuments({ folder: folder._id, isDeleted: false })
    ]);

    const folderData = folder.toObject();
    folderData.subfolderCount = subfolderCount;
    folderData.incomingCount = incomingCount;
    folderData.outgoingCount = outgoingCount;
    folderData.documentCount = incomingCount + outgoingCount;
    
    res.status(200).json({
      success: true,
      data: folderData
    });
  } catch (err) {
    next(err);
  }
};
