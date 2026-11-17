const mongoose = require('mongoose');
const Folder = require('../../models/Folder');
const IncomingDocument = require('../../models/IncomingDocument');
const OutgoingDocument = require('../../models/OutgoingDocument');
const ErrorResponse = require('../../utils/errorResponse');

function documentBelongsToDepartment(doc, type, activeDeptId) {
  if (!doc || !activeDeptId) return false;
  if (type === 'incoming') {
    return Array.isArray(doc.assignedTo) && doc.assignedTo.some((entry) => {
      const deptId = entry?.id?._id
        ? entry.id._id.toString()
        : entry?.id
          ? entry.id.toString()
          : (entry?._id ? entry._id.toString() : entry?.toString());
      return deptId === activeDeptId;
    });
  }
  const sourceId = doc.source?.id?._id
    ? doc.source.id._id.toString()
    : doc.source?.id
      ? doc.source.id.toString()
      : null;
  return sourceId === activeDeptId;
}

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
    if (req.user.role !== 'Director' && req.user.role !== 'Admin' && req.user.role !== 'AdminTuningDesk') {
      const activeDeptId = req.user.activeDepartment?._id ? req.user.activeDepartment._id.toString() : req.user.activeDepartment?.toString();
      const folderDeptId = folder.department?._id ? folder.department._id.toString() : folder.department?.toString();
      
      if (!activeDeptId || folderDeptId !== activeDeptId) {
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
      .sort({ arrivalDate: -1, createdAt: -1 })
      .limit(100);
    
    // Get outgoing documents
    const outgoingDocuments = await OutgoingDocument.find({
      folder: req.params.id,
      isDeleted: false
    }).populate('reference')
      .populate('createdBy', 'username')
      .sort({ issueDate: -1, createdAt: -1 })
      .limit(100);
    
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
// @access  Private/AdminDepartment/Admin
exports.assignDocumentToFolder = async (req, res, next) => {
  try {
    const { documentId, folderId, type } = req.body || {};

    if (!documentId || !type) {
      return next(new ErrorResponse('معرف المستند ونوع المستند مطلوبان', 400));
    }

    if (!['incoming', 'outgoing'].includes(type)) {
      return next(new ErrorResponse('نوع المستند يجب أن يكون incoming أو outgoing', 400));
    }

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return next(new ErrorResponse('معرف المستند غير صالح', 400));
    }

    const isGlobalAdmin = ['Admin', 'AdminTuningDesk'].includes(req.user.role);
    const activeDeptId = req.user.activeDepartment?._id
      ? req.user.activeDepartment._id.toString()
      : req.user.activeDepartment?.toString();

    if (!isGlobalAdmin && !activeDeptId) {
      return next(new ErrorResponse('لا يوجد قسم نشط محدد للمستخدم', 403));
    }

    // Verify target folder if provided
    if (folderId) {
      if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return next(new ErrorResponse('معرف المجلد المستهدف غير صالح', 400));
      }

      const targetFolder = await Folder.findById(folderId);
      if (!targetFolder || targetFolder.isDeleted) {
        return next(new ErrorResponse('المجلد المستهدف غير موجود', 404));
      }

      if (!isGlobalAdmin) {
        const folderDeptId = targetFolder.department?._id
          ? targetFolder.department._id.toString()
          : targetFolder.department?.toString();
        if (folderDeptId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك بنقل المستند إلى هذا المجلد', 403));
        }
      }
    }

    const Model = type === 'incoming' ? IncomingDocument : OutgoingDocument;
    const targetDocument = await Model.findOne({ _id: documentId, isDeleted: false });

    if (!targetDocument) {
      return next(new ErrorResponse('المستند غير موجود', 404));
    }

    // Verify document belongs to the user's active department (even when folderId is null)
    if (!isGlobalAdmin && !documentBelongsToDepartment(targetDocument, type, activeDeptId)) {
      return next(new ErrorResponse('غير مصرح لك بتعديل تصنيف مستند لا يتبع قسمك', 403));
    }

    targetDocument.folder = folderId || null;
    await targetDocument.save();

    res.status(200).json({
      success: true,
      message: folderId ? 'تم تصنيف المستند في المجلد بنجاح' : 'تم إخراج المستند من المجلد بنجاح',
      data: targetDocument
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Batch move documents to a folder
// @route   PUT /api/folders/batch-move-documents
// @access  Private/AdminDepartment/Admin
exports.batchMoveDocuments = async (req, res, next) => {
  try {
    const { documentIds, folderId, type } = req.body || {};

    if (!Array.isArray(documentIds) || documentIds.length === 0 || !type) {
      return next(new ErrorResponse('قائمة معرفات المستندات ونوعها مطلوبة', 400));
    }

    if (!['incoming', 'outgoing'].includes(type)) {
      return next(new ErrorResponse('نوع المستند يجب أن يكون incoming أو outgoing', 400));
    }

    const uniqueIds = [...new Set(documentIds.map((id) => String(id)))];
    if (uniqueIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return next(new ErrorResponse('أحد معرفات المستندات غير صالح', 400));
    }

    const isGlobalAdmin = ['Admin', 'AdminTuningDesk'].includes(req.user.role);
    const activeDeptId = req.user.activeDepartment?._id
      ? req.user.activeDepartment._id.toString()
      : req.user.activeDepartment?.toString();

    if (!isGlobalAdmin && !activeDeptId) {
      return next(new ErrorResponse('لا يوجد قسم نشط محدد للمستخدم', 403));
    }

    if (folderId) {
      if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return next(new ErrorResponse('معرف المجلد المستهدف غير صالح', 400));
      }

      const targetFolder = await Folder.findById(folderId);
      if (!targetFolder || targetFolder.isDeleted) {
        return next(new ErrorResponse('المجلد المستهدف غير موجود', 404));
      }

      if (!isGlobalAdmin) {
        const folderDeptId = targetFolder.department?._id
          ? targetFolder.department._id.toString()
          : targetFolder.department?.toString();
        if (folderDeptId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك بنقل المستندات إلى هذا المجلد', 403));
        }
      }
    }

    const Model = type === 'incoming' ? IncomingDocument : OutgoingDocument;
    const docs = await Model.find({ _id: { $in: uniqueIds }, isDeleted: false });

    if (docs.length !== uniqueIds.length) {
      return next(new ErrorResponse('بعض المستندات غير موجودة', 404));
    }

    if (!isGlobalAdmin) {
      const allOwned = docs.every((doc) => documentBelongsToDepartment(doc, type, activeDeptId));
      if (!allOwned) {
        return next(new ErrorResponse('غير مصرح لك بنقل مستندات لا تتبع قسمك', 403));
      }
    }

    await Model.updateMany(
      { _id: { $in: uniqueIds }, isDeleted: false },
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
