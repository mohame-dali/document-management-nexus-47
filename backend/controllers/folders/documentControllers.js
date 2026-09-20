const Folder = require('../../models/Folder');
const IncomingDocument = require('../../models/IncomingDocument');
const OutgoingDocument = require('../../models/OutgoingDocument');
const ErrorResponse = require('../../utils/errorResponse');

// @desc    Get documents in a folder
// @route   GET /api/folders/:id/documents
// @access  Private
exports.getFolderDocuments = async (req, res, next) => {
  try {
    const folder = await Folder.findById(req.params.id);
    
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
    
    // Get incoming documents
    const incomingDocuments = await IncomingDocument.find({
      folder: req.params.id,
      isDeleted: false
    }).populate('responsibleUser', 'username')
      .populate('answer')
      .populate('createdBy', 'username')
      .sort({ arrivalDate: -1, createdAt: -1 });
    
    // Get outgoing documents
    const outgoingDocuments = await OutgoingDocument.find({
      folder: req.params.id,
      isDeleted: false
    }).populate('reference')
      .populate('createdBy', 'username')
      .sort({ issueDate: -1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: incomingDocuments.length + outgoingDocuments.length,
      data: {
        incomingDocuments,
        outgoingDocuments
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Assign or move a document to a folder (or unassign if folder is null)
// @route   PUT /api/folders/assign-document
// @access  Private/AdminDepartment
exports.assignDocumentToFolder = async (req, res, next) => {
  try {
    const { documentId, folderId, type } = req.body;

    if (!documentId || !type) {
      return next(new ErrorResponse('معرف المستند ونوع المستند مطلوبان', 400));
    }

    if (!['incoming', 'outgoing'].includes(type)) {
      return next(new ErrorResponse('نوع المستند يجب أن يكون incoming أو outgoing', 400));
    }

    // If folderId is provided, verify folder exists and user has access
    if (folderId) {
      const targetFolder = await Folder.findById(folderId);
      if (!targetFolder || targetFolder.isDeleted) {
        return next(new ErrorResponse('المجلد المستهدف غير موجود', 404));
      }

      if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin' && req.user.role !== 'AdminTuningDesk') {
        const activeDeptId = req.user.activeDepartment?._id ? req.user.activeDepartment._id.toString() : req.user.activeDepartment?.toString();
        const folderDeptId = targetFolder.department?._id ? targetFolder.department._id.toString() : targetFolder.department?.toString();
        
        if (folderDeptId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك بنقل المستند إلى هذا المجلد', 403));
        }
      }
    }

    let updatedDocument;
    if (type === 'incoming') {
      updatedDocument = await IncomingDocument.findOneAndUpdate(
        { _id: documentId, isDeleted: false },
        { folder: folderId || null },
        { new: true, runValidators: true }
      );
    } else {
      updatedDocument = await OutgoingDocument.findOneAndUpdate(
        { _id: documentId, isDeleted: false },
        { folder: folderId || null },
        { new: true, runValidators: true }
      );
    }

    if (!updatedDocument) {
      return next(new ErrorResponse('المستند غير موجود', 404));
    }

    res.status(200).json({
      success: true,
      message: folderId ? 'تم تصنيف المستند في المجلد بنجاح' : 'تم إخراج المستند من المجلد بنجاح',
      data: updatedDocument
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Batch move documents to a folder
// @route   PUT /api/folders/batch-move-documents
// @access  Private/AdminDepartment
exports.batchMoveDocuments = async (req, res, next) => {
  try {
    const { documentIds, folderId, type } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0 || !type) {
      return next(new ErrorResponse('قائمة معرفات المستندات ونوعها مطلوبة', 400));
    }

    if (folderId) {
      const targetFolder = await Folder.findById(folderId);
      if (!targetFolder || targetFolder.isDeleted) {
        return next(new ErrorResponse('المجلد المستهدف غير موجود', 404));
      }
    }

    const Model = type === 'incoming' ? IncomingDocument : OutgoingDocument;
    await Model.updateMany(
      { _id: { $in: documentIds }, isDeleted: false },
      { folder: folderId || null }
    );

    res.status(200).json({
      success: true,
      message: 'تم نقل المستندات المحددة بنجاح'
    });
  } catch (err) {
    next(err);
  }
};
