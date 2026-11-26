const mongoose = require('mongoose');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const Folder = require('../models/Folder');
const Message = require('../models/Message');
const Personnel = require('../models/Personnel');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');
const { sanitizeSearchQuery } = require('../utils/regexUtils');
const { removeFromIndex } = require('../services/semanticIndexer');
const { extractId, isRHAdminDepartment } = require('../utils/rhAuthHelper');
const fs = require('fs');
const path = require('path');

const MODEL_MAP = {
  'incoming': IncomingDocument,
  'outgoing': OutgoingDocument,
  'folder': Folder,
  'message': Message,
  'personnel': Personnel,
};

async function canManageTrashedPersonnel(user) {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  return isRHAdminDepartment(user);
}

// Helper to resolve absolute or relative file path on disk
function resolveFilePath(filePath) {
  if (!filePath) return null;

  // Déjà absolu ?
  if (path.isAbsolute(filePath)) {
    return fs.existsSync(filePath) ? filePath : null;
  }

  // Relatif → essayer plusieurs racines
  const roots = [
    path.join(__dirname, '..'),           // backend/
    path.join(__dirname, '../..'),        // racine projet
    path.join(process.cwd(), 'backend'),  // process.cwd() backend
    process.cwd(),                        // process.cwd()
  ];

  for (const root of roots) {
    const fullPath = path.join(root, filePath);
    if (fs.existsSync(fullPath)) return fullPath;
  }

  return null;
}

// Helper to safely delete file from disk
const deleteFileFromDisk = (filePath) => {
  if (!filePath) return false;
  try {
    const fullPath = resolveFilePath(filePath);
    if (fullPath && fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`Deleted file: ${fullPath}`);
      return true;
    }
  } catch (err) {
    console.error(`Error deleting file: ${filePath}`, err.message);
  }
  return false;
};

// Helper to collect all physical files attached to an item
const collectItemFiles = (item) => {
  const files = [];
  if (!item) return files;
  if (item.scannedDocument) files.push(item.scannedDocument);
  if (Array.isArray(item.versions)) {
    item.versions.forEach((v) => {
      if (v && v.filePath) files.push(v.filePath);
    });
  }
  if (item.scannedFilePath) files.push(item.scannedFilePath);
  if (item.photo) files.push(item.photo);
  if (item.attachments && Array.isArray(item.attachments)) {
    item.attachments.forEach((att) => {
      if (att && att.path) files.push(att.path);
      else if (typeof att === 'string') files.push(att);
    });
  }
  return Array.from(new Set(files.filter(Boolean)));
};

// Helper to normalize item types
const normalizeType = (type) => {
  if (!type) return '';
  const lower = type.toLowerCase();
  if (lower === 'incomingdocument' || lower === 'incoming') return 'incoming';
  if (lower === 'outgoingdocument' || lower === 'outgoing') return 'outgoing';
  if (lower === 'folder') return 'folder';
  if (lower === 'message') return 'message';
  if (lower === 'personnel') return 'personnel';
  return lower;
};

function isMessageDeletedByAllParties(message) {
  const deletedBySet = new Set(
    (message.deletedBy || []).map(dId => dId.toString())
  );
  const partyIds = new Set();
  if (message.sender) {
    partyIds.add(message.sender.toString());
  }
  (message.recipients || []).forEach((r) => {
    const recipientId = r && r.user ? r.user.toString() : (r ? r.toString() : null);
    if (recipientId) partyIds.add(recipientId);
  });
  if (partyIds.size === 0) return false;
  for (const pId of partyIds) {
    if (!deletedBySet.has(pId)) {
      return false;
    }
  }
  return true;
}

// @desc    Get all trashed items (incoming, outgoing, folders)
// @route   GET /api/trash
// @access  Private
exports.getTrash = async (req, res, next) => {
  try {
    const { type = 'all', page = 1, limit = 20, search } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const canAccessPersonnelTrash = await canManageTrashedPersonnel(req.user);
    if (type === 'personnel' && !canAccessPersonnelTrash) {
      return next(new ErrorResponse('غير مصرح لك بالوصول إلى سلة مهملات الموظفين — الصلاحية محصورة في قسم الموارد البشرية', 403));
    }

    // Department filtering
    let incomingQuery = { isDeleted: true };
    let outgoingQuery = { isDeleted: true };
    let folderQuery = { isDeleted: true };
    let messageQuery = { deletedBy: req.user._id };
    let personnelQuery = canAccessPersonnelTrash ? { isDeleted: true } : null;

    if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      const deptId = extractId(req.user.activeDepartment);
      if (!deptId) {
        return next(new ErrorResponse('لم يتم تحديد قسم نشط', 403));
      }
      incomingQuery['assignedTo.id'] = deptId;
      outgoingQuery['source.id'] = deptId;
      folderQuery.department = deptId;
      if (personnelQuery && req.query.department) {
        personnelQuery.activeDepartment = req.query.department;
      }
    } else if (req.query.department) {
      incomingQuery['assignedTo.id'] = req.query.department;
      outgoingQuery['source.id'] = req.query.department;
      folderQuery.department = req.query.department;
      if (personnelQuery) {
        personnelQuery.activeDepartment = req.query.department;
      }
    }

    // Search filter
    if (search && search.trim() !== '') {
      const safeSearch = sanitizeSearchQuery(search);
      if (safeSearch) {
        const searchRegex = new RegExp(safeSearch, 'i');
        incomingQuery.$or = [
          { subject: searchRegex },
          { source: searchRegex },
          { documentId: searchRegex }
        ];
        outgoingQuery.$or = [
          { subject: searchRegex },
          { destination: searchRegex },
          { documentId: searchRegex }
        ];
        folderQuery.name = searchRegex;
        messageQuery.$or = [
          { subject: searchRegex },
          { content: searchRegex }
        ];
        if (personnelQuery) {
          personnelQuery.$or = [
            { nom: searchRegex },
            { prenom: searchRegex },
            { cin: searchRegex }
          ];
        }
      }
    }

    // Get counts
    const [incomingCount, outgoingCount, folderCount, messageCount, personnelCount] = await Promise.all([
      IncomingDocument.countDocuments(incomingQuery),
      OutgoingDocument.countDocuments(outgoingQuery),
      Folder.countDocuments(folderQuery),
      Message.countDocuments(messageQuery),
      personnelQuery ? Personnel.countDocuments(personnelQuery) : Promise.resolve(0)
    ]);

    let items = [];
    let totalCount = 0;

    if (type === 'incoming') {
      totalCount = incomingCount;
      const docs = await IncomingDocument.find(incomingQuery)
        .populate('deletedBy', 'username role photo')
        .populate('assignedTo.id', 'name')
        .populate('responsibleUser', 'username photo')
        .populate('folder', 'name')
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(limitNum);

      items = docs.map(doc => ({
        ...doc.toObject(),
        itemType: 'incoming'
      }));
    } else if (type === 'outgoing') {
      totalCount = outgoingCount;
      const docs = await OutgoingDocument.find(outgoingQuery)
        .populate('deletedBy', 'username role photo')
        .populate('source.id', 'name')
        .populate('folder', 'name')
        .populate('reference')
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(limitNum);

      items = docs.map(doc => ({
        ...doc.toObject(),
        itemType: 'outgoing'
      }));
    } else if (type === 'folder') {
      totalCount = folderCount;
      const folders = await Folder.find(folderQuery)
        .populate('deletedBy', 'username role photo')
        .populate('department', 'name')
        .populate('parent', 'name')
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(limitNum);

      items = folders.map(f => ({
        ...f.toObject(),
        itemType: 'folder'
      }));
    } else if (type === 'message') {
      totalCount = messageCount;
      const msgs = await Message.find(messageQuery)
        .populate('sender', 'username photo role activeDepartment')
        .populate('recipients.user', 'username photo role activeDepartment')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum);

      items = msgs.map(msg => ({
        ...msg.toObject(),
        itemType: 'message',
        deletedAt: msg.updatedAt
      }));
    } else if (type === 'personnel') {
      totalCount = personnelCount;
      const pers = await Personnel.find(personnelQuery)
        .populate('deletedBy', 'username role photo')
        .populate('activeDepartment', 'name')
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(limitNum);

      items = pers.map(p => ({
        ...p.toObject(),
        itemType: 'personnel',
        label: `${p.prenom || ''} ${p.nom || ''}`.trim() || p.cin || 'موظف'
      }));
    } else {
      // 'all' type: combine all deleted items
      totalCount = incomingCount + outgoingCount + folderCount + messageCount + personnelCount;

      const [incomingDocs, outgoingDocs, folders, messages, persDocs] = await Promise.all([
        IncomingDocument.find(incomingQuery)
          .populate('deletedBy', 'username role photo')
          .populate('assignedTo.id', 'name')
          .populate('responsibleUser', 'username photo')
          .populate('folder', 'name')
          .sort({ deletedAt: -1 })
          .limit(limitNum),
        OutgoingDocument.find(outgoingQuery)
          .populate('deletedBy', 'username role photo')
          .populate('source.id', 'name')
          .populate('folder', 'name')
          .sort({ deletedAt: -1 })
          .limit(limitNum),
        Folder.find(folderQuery)
          .populate('deletedBy', 'username role photo')
          .populate('department', 'name')
          .populate('parent', 'name')
          .sort({ deletedAt: -1 })
          .limit(limitNum),
        Message.find(messageQuery)
          .populate('sender', 'username photo role activeDepartment')
          .populate('recipients.user', 'username photo role activeDepartment')
          .sort({ updatedAt: -1 })
          .limit(limitNum),
        personnelQuery
          ? Personnel.find(personnelQuery)
              .populate('deletedBy', 'username role photo')
              .populate('activeDepartment', 'name')
              .sort({ deletedAt: -1 })
              .limit(limitNum)
          : Promise.resolve([])
      ]);

      const formattedIncoming = incomingDocs.map(d => ({ ...d.toObject(), itemType: 'incoming' }));
      const formattedOutgoing = outgoingDocs.map(d => ({ ...d.toObject(), itemType: 'outgoing' }));
      const formattedFolders = folders.map(f => ({ ...f.toObject(), itemType: 'folder' }));
      const formattedMessages = messages.map(m => ({ ...m.toObject(), itemType: 'message', deletedAt: m.updatedAt }));
      const formattedPersonnel = persDocs.map(p => ({
        ...p.toObject(),
        itemType: 'personnel',
        label: `${p.prenom || ''} ${p.nom || ''}`.trim() || p.cin || 'موظف'
      }));

      // Merge and sort by deletedAt descending
      const allItems = [...formattedIncoming, ...formattedOutgoing, ...formattedFolders, ...formattedMessages, ...formattedPersonnel].sort((a, b) => {
        const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
        const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
        return dateB - dateA;
      });

      items = allItems.slice(skip, skip + limitNum);
    }

    const hasMore = (pageNum * limitNum) < totalCount;

    res.status(200).json({
      success: true,
      counts: {
        total: incomingCount + outgoingCount + folderCount + messageCount + personnelCount,
        incoming: incomingCount,
        outgoing: outgoingCount,
        folder: folderCount,
        message: messageCount,
        personnel: personnelCount
      },
      totalCount,
      count: items.length,
      page: pageNum,
      limit: limitNum,
      hasMore,
      data: items
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Restore a deleted item
// @route   PUT /api/trash/:type/:id/restore or PUT /api/trash/restore/:type/:id
// @access  Private
exports.restoreItem = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const resolvedType = normalizeType(type);

    if (!['incoming', 'outgoing', 'folder', 'message', 'personnel'].includes(resolvedType)) {
      return next(new ErrorResponse('نوع العنصر غير صالح (incoming, outgoing, folder, message, personnel)', 400));
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`معرّف غير صالح: ${id}`, 400));
    }

    if (resolvedType === 'message') {
      const message = await Message.findOne({ _id: id, deletedBy: req.user._id });
      if (!message) {
        return next(new ErrorResponse(`الرسالة غير موجودة في سلة المهملات برمز ${id}`, 404));
      }

      await Message.updateOne(
        { _id: id, deletedBy: req.user._id },
        { $pull: { deletedBy: req.user._id } }
      );

      return res.status(200).json({
        success: true,
        message: 'تم استرجاع الرسالة بنجاح',
        data: message
      });
    }

    const Model = MODEL_MAP[resolvedType];
    if (!Model) {
      return next(new ErrorResponse('نوع العنصر غير صالح', 400));
    }

    const item = await Model.findById(id);

    if (!item || !item.isDeleted) {
      return next(new ErrorResponse(`العنصر غير موجود في سلة المهملات برمز ${id}`, 404));
    }

    // Permission check for Personnel (strictly Admin or RH AdminDepartment across all operational departments)
    if (resolvedType === 'personnel') {
      const canRestorePersonnel = await canManageTrashedPersonnel(req.user);
      if (!canRestorePersonnel) {
        return next(new ErrorResponse('غير مصرح لك باسترجاع هذا الموظف — الصلاحية محصورة في قسم الموارد البشرية', 403));
      }
    } else if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      const activeDeptId = extractId(req.user.activeDepartment);
      if (!activeDeptId) {
        return next(new ErrorResponse('لم يتم تحديد قسم نشط', 403));
      }

      if (resolvedType === 'incoming') {
        const isAssigned = item.assignedTo?.some(dept => {
          const dId = extractId(dept.id !== undefined ? dept.id : dept);
          return dId === activeDeptId;
        });
        if (!isAssigned) {
          return next(new ErrorResponse('غير مصرح لك باسترجاع هذا المستند', 403));
        }
      } else if (resolvedType === 'outgoing') {
        const sourceId = item.source ? extractId(item.source.id) : null;
        if (!sourceId || sourceId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك باسترجاع هذا المستند', 403));
        }
      } else if (resolvedType === 'folder') {
        const folderDeptId = extractId(item.department);
        if (!folderDeptId || folderDeptId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك باسترجاع هذا المجلد', 403));
        }
      }
    }

    // If folder, check if its parent folder is also deleted
    if (resolvedType === 'folder' && item.parent) {
      const parentFolder = await Folder.findById(item.parent);
      if (!parentFolder || parentFolder.isDeleted) {
        // Parent folder is also deleted, reset parent to null (move to root)
        item.parent = null;
      }
    }

    // If document, check if its folder is still valid and not deleted
    if ((resolvedType === 'incoming' || resolvedType === 'outgoing') && item.folder) {
      const parentFolder = await Folder.findById(item.folder);
      if (!parentFolder || parentFolder.isDeleted) {
        item.folder = null;
      }
    }

    item.isDeleted = false;
    item.deletedAt = null;
    item.deletedBy = null;
    await item.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'تم استرجاع العنصر بنجاح',
      data: item
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return next(
        new ErrorResponse('تعذر الاسترجاع لوجود عنصر نشط مسبقاً بنفس المعرف الفريد (الرقم التسلسلي أو ب.ت.و)', 409)
      );
    }
    next(err);
  }
};

// @desc    Permanently delete an item from trash (Hard delete with file unlinking)
// @route   DELETE /api/trash/:type/:id/permanent or DELETE /api/trash/:type/:id
// @access  Private/Admin/Director
exports.permanentDelete = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const resolvedType = normalizeType(type);

    const Model = MODEL_MAP[resolvedType];
    if (!Model) {
      return next(new ErrorResponse('نوع العنصر غير صالح (incoming, outgoing, folder, message, personnel)', 400));
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse(`معرّف غير صالح: ${id}`, 400));
    }

    if (resolvedType === 'message') {
      const message = await Message.findById(id);
      if (!message) {
        return next(new ErrorResponse(`الرسالة غير موجودة برمز ${id}`, 404));
      }

      const currentUserId = req.user._id.toString();
      const isInUserTrash = (message.deletedBy || []).some(
        dId => dId.toString() === currentUserId
      );
      if (!isInUserTrash) {
        return next(new ErrorResponse('الرسالة غير موجودة في سلة المهملات الخاصة بك', 400));
      }

      const deletedByAll = isMessageDeletedByAllParties(message);
      if (!deletedByAll) {
        return next(
          new ErrorResponse('لا يمكن الحذف النهائي للرسالة قبل حذفها من سلة المهملات لدى جميع الأطراف', 409)
        );
      }

      let deletedFilesCount = 0;
      const files = collectItemFiles(message);
      files.forEach(f => {
        if (deleteFileFromDisk(f)) deletedFilesCount++;
      });
      await message.deleteOne();

      // Audit trail SÉCURISÉ
      try {
        await AuditLog.create({
          action: 'PERMANENT_DELETE',
          entityType: 'message',
          entityId: id.toString(),
          userId: req.user._id,
          userDetails: {
            username: req.user.username || 'Unknown',
            role: req.user.role || 'Unknown'
          },
          details: { deletedFilesCount },
          ipAddress: req.ip || 'unknown'
        });
      } catch (auditError) {
        console.error('[Audit] Failed to log:', auditError.message);
      }

      return res.status(200).json({
        success: true,
        message: 'تم الحذف النهائي للرسالة بنجاح',
        data: { deletedFilesCount }
      });
    }

    const item = await Model.findById(id);
    if (!item) {
      return next(new ErrorResponse(`العنصر غير موجود برمز ${id}`, 404));
    }
    if (!item.isDeleted) {
      return next(new ErrorResponse('العنصر غير موجود في سلة المهملات', 400));
    }

    // Permission check for Personnel (strictly Admin or RH AdminDepartment across all operational departments)
    if (resolvedType === 'personnel') {
      const canDeletePersonnel = await canManageTrashedPersonnel(req.user);
      if (!canDeletePersonnel) {
        return next(new ErrorResponse('غير مصرح لك بحذف هذا الموظف نهائياً — الصلاحية محصورة في قسم الموارد البشرية', 403));
      }
      if (item.userId) {
        return next(new ErrorResponse('لا يمكن الحذف النهائي لبطاقة موظف مرتبطة بحساب مستخدم', 400));
      }
    } else if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      const activeDeptId = extractId(req.user.activeDepartment);
      if (!activeDeptId) {
        return next(new ErrorResponse('لم يتم تحديد قسم نشط', 403));
      }

      if (resolvedType === 'incoming') {
        const isAssigned = item.assignedTo?.some(dept => {
          const dId = extractId(dept.id !== undefined ? dept.id : dept);
          return dId === activeDeptId;
        });
        if (!isAssigned) {
          return next(new ErrorResponse('غير مصرح لك بحذف هذا المستند', 403));
        }
      } else if (resolvedType === 'outgoing') {
        const sourceId = item.source ? extractId(item.source.id) : null;
        if (!sourceId || sourceId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك بحذف هذا المستند', 403));
        }
      } else if (resolvedType === 'folder') {
        const folderDeptId = extractId(item.department);
        if (!folderDeptId || folderDeptId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك بحذف هذا المجلد', 403));
        }
      }
    }

    // Specific cleanups per entity type
    if (resolvedType === 'folder') {
      const [activeSubfolders, activeIncoming, activeOutgoing] = await Promise.all([
        Folder.countDocuments({ parent: item._id, isDeleted: false }),
        IncomingDocument.countDocuments({ folder: item._id, isDeleted: false }),
        OutgoingDocument.countDocuments({ folder: item._id, isDeleted: false })
      ]);

      if (activeSubfolders > 0 || activeIncoming > 0 || activeOutgoing > 0) {
        return next(
          new ErrorResponse('لا يمكن الحذف النهائي للمجلد لأنه يحتوي على عناصر نشطة غير محذوفة', 400)
        );
      }

      await Promise.all([
        Folder.updateMany({ parent: item._id }, { parent: null }),
        IncomingDocument.updateMany({ folder: item._id }, { folder: null }),
        OutgoingDocument.updateMany({ folder: item._id }, { folder: null })
      ]);
    } else if (resolvedType === 'incoming') {
      await OutgoingDocument.updateMany({ reference: item._id }, { reference: null });
    } else if (resolvedType === 'outgoing') {
      await IncomingDocument.updateMany({ answer: item._id }, { answer: null });
    }

    // Delete associated physical files
    const filesToDelete = collectItemFiles(item);
    let deletedFilesCount = 0;
    filesToDelete.forEach(filePath => {
      if (deleteFileFromDisk(filePath)) {
        deletedFilesCount++;
      }
    });

    await Model.findByIdAndDelete(id);
    if (resolvedType === 'incoming' || resolvedType === 'outgoing') {
      await removeFromIndex(item._id, resolvedType).catch(() => {});
    }

    // Audit trail SÉCURISÉ
    try {
      await AuditLog.create({
        action: 'PERMANENT_DELETE',
        entityType: resolvedType,
        entityId: id.toString(),
        userId: req.user._id,
        userDetails: {
          username: req.user.username || 'Unknown',
          role: req.user.role || 'Unknown'
        },
        details: { deletedFilesCount },
        ipAddress: req.ip || 'unknown'
      });
    } catch (auditError) {
      console.error('[Audit] Failed to log:', auditError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'تم الحذف النهائي بنجاح',
      data: { deletedFilesCount }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Empty trash (Permanently delete all or by type)
// @route   DELETE /api/trash/empty
// @access  Private/Admin/Director
exports.emptyTrash = async (req, res, next) => {
  try {
    const { type = 'all' } = req.query;
    const resolvedType = type === 'all' ? 'all' : normalizeType(type);

    const results = {
      incoming: 0,
      outgoing: 0,
      folder: 0,
      message: 0,
      personnel: 0,
      skippedMessages: 0,
      totalFilesDeleted: 0,
      errors: []
    };

    const canAccessPersonnelTrash = await canManageTrashedPersonnel(req.user);
    if (resolvedType === 'personnel' && !canAccessPersonnelTrash) {
      return next(new ErrorResponse('غير مصرح لك بإفراغ سلة مهملات الموظفين — الصلاحية محصورة في قسم الموارد البشرية', 403));
    }

    let typesToEmpty = resolvedType === 'all'
      ? Object.keys(MODEL_MAP)
      : (MODEL_MAP[resolvedType] ? [resolvedType] : []);

    if (resolvedType === 'all' && !canAccessPersonnelTrash) {
      typesToEmpty = typesToEmpty.filter(t => t !== 'personnel');
    }

    if (typesToEmpty.length === 0) {
      return next(new ErrorResponse('نوع العنصر غير صالح', 400));
    }

    let deptId = null;
    if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      deptId = extractId(req.user.activeDepartment);
      if (!deptId) {
        return next(new ErrorResponse('لم يتم تحديد قسم نشط', 403));
      }
    }

    // Vérifier AVANT toute suppression si un dossier dans la corbeille contient des éléments actifs (aligné sur permanentDelete)
    if (typesToEmpty.includes('folder')) {
      const folderFilter = { isDeleted: true };
      if (deptId) {
        folderFilter.department = deptId;
      }
      const trashedFolders = await Folder.find(folderFilter).select('_id').lean();
      if (trashedFolders.length > 0) {
        const folderIds = trashedFolders.map(f => f._id);
        const [activeSubfolders, activeIncoming, activeOutgoing] = await Promise.all([
          Folder.countDocuments({ parent: { $in: folderIds }, isDeleted: false }),
          IncomingDocument.countDocuments({ folder: { $in: folderIds }, isDeleted: false }),
          OutgoingDocument.countDocuments({ folder: { $in: folderIds }, isDeleted: false })
        ]);

        if (activeSubfolders > 0 || activeIncoming > 0 || activeOutgoing > 0) {
          return next(
            new ErrorResponse('لا يمكن الحذف النهائي للمجلد لأنه يحتوي على عناصر نشطة غير محذوفة', 400)
          );
        }
      }
    }

    for (const t of typesToEmpty) {
      try {
        const Model = MODEL_MAP[t];
        if (!Model) continue;

        let filter = { isDeleted: true };

        if (t === 'message') {
          filter = { deletedBy: req.user._id };
        } else if (t === 'personnel') {
          filter = { isDeleted: true, userId: null };
        } else if (deptId) {
          if (t === 'incoming') filter['assignedTo.id'] = deptId;
          else if (t === 'outgoing') filter['source.id'] = deptId;
          else if (t === 'folder') filter.department = deptId;
        }

        const items = await Model.find(filter);
        for (const item of items) {
          if (t === 'message') {
            if (!isMessageDeletedByAllParties(item)) {
              results.skippedMessages++;
              continue;
            }
          } else if (t === 'personnel' && item.userId) {
            continue;
          } else if (t === 'incoming') {
            await OutgoingDocument.updateMany({ reference: item._id }, { reference: null });
          } else if (t === 'outgoing') {
            await IncomingDocument.updateMany({ answer: item._id }, { answer: null });
          } else if (t === 'folder') {
            await Promise.all([
              Folder.updateMany({ parent: item._id }, { parent: null }),
              IncomingDocument.updateMany({ folder: item._id }, { folder: null }),
              OutgoingDocument.updateMany({ folder: item._id }, { folder: null })
            ]);
          }

          // Delete files
          const files = collectItemFiles(item);
          files.forEach(f => {
            if (deleteFileFromDisk(f)) {
              results.totalFilesDeleted++;
            }
          });

          await Model.findByIdAndDelete(item._id);
          if (t === 'incoming' || t === 'outgoing') {
            await removeFromIndex(item._id, t).catch(() => {});
          }
          results[t] = (results[t] || 0) + 1;
        }
      } catch (err) {
        results.errors.push(`${t}: ${err.message}`);
      }
    }

    // Audit trail SÉCURISÉ
    try {
      await AuditLog.create({
        action: 'EMPTY_TRASH',
        entityType: 'trash',
        entityId: 'bulk',
        userId: req.user._id,
        userDetails: {
          username: req.user.username || 'Unknown',
          role: req.user.role || 'Unknown'
        },
        details: results,
        ipAddress: req.ip || 'unknown'
      });
    } catch (auditError) {
      console.error('[Audit] Failed to log:', auditError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'تم إفراغ سلة المهملات بنجاح',
      data: results
    });
  } catch (err) {
    next(err);
  }
};
