const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const Folder = require('../models/Folder');
const Message = require('../models/Message');
const Personnel = require('../models/Personnel');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');
const fs = require('fs');
const path = require('path');

const MODEL_MAP = {
  'incoming': IncomingDocument,
  'outgoing': OutgoingDocument,
  'folder': Folder,
  'message': Message,
  'personnel': Personnel,
};

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
  if (item.scannedFilePath) files.push(item.scannedFilePath);
  if (item.photo) files.push(item.photo);
  if (item.attachments && Array.isArray(item.attachments)) {
    item.attachments.forEach((att) => {
      if (att && att.path) files.push(att.path);
      else if (typeof att === 'string') files.push(att);
    });
  }
  return files;
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

// @desc    Get all trashed items (incoming, outgoing, folders)
// @route   GET /api/trash
// @access  Private
exports.getTrash = async (req, res, next) => {
  try {
    const { type = 'all', page = 1, limit = 20, search } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    // Department filtering
    let incomingQuery = { isDeleted: true };
    let outgoingQuery = { isDeleted: true };
    let folderQuery = { isDeleted: true };
    let messageQuery = { deletedBy: req.user._id };
    let personnelQuery = { isDeleted: true };

    if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('لم يتم تحديد قسم نشط', 403));
      }
      const deptId = req.user.activeDepartment._id || req.user.activeDepartment;
      incomingQuery['assignedTo.id'] = deptId;
      outgoingQuery['source.id'] = deptId;
      folderQuery.department = deptId;
      personnelQuery.activeDepartment = deptId;
    } else if (req.query.department) {
      incomingQuery['assignedTo.id'] = req.query.department;
      outgoingQuery['source.id'] = req.query.department;
      folderQuery.department = req.query.department;
      personnelQuery.activeDepartment = req.query.department;
    }

    // Search filter
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
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
      personnelQuery.$or = [
        { nom: searchRegex },
        { prenom: searchRegex },
        { cin: searchRegex }
      ];
    }

    // Get counts
    const [incomingCount, outgoingCount, folderCount, messageCount, personnelCount] = await Promise.all([
      IncomingDocument.countDocuments(incomingQuery),
      OutgoingDocument.countDocuments(outgoingQuery),
      Folder.countDocuments(folderQuery),
      Message.countDocuments(messageQuery),
      Personnel.countDocuments(personnelQuery)
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
        Personnel.find(personnelQuery)
          .populate('deletedBy', 'username role photo')
          .populate('activeDepartment', 'name')
          .sort({ deletedAt: -1 })
          .limit(limitNum)
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

    // Permission check for AdminDepartment
    if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      const activeDeptId = req.user.activeDepartment?._id ? req.user.activeDepartment._id.toString() : req.user.activeDepartment?.toString();
      if (resolvedType === 'incoming') {
        const isAssigned = item.assignedTo?.some(dept => {
          const dId = dept.id?._id ? dept.id._id.toString() : (dept.id ? dept.id.toString() : dept.toString());
          return dId === activeDeptId;
        });
        if (!isAssigned) {
          return next(new ErrorResponse('غير مصرح لك باسترجاع هذا المستند', 403));
        }
      } else if (resolvedType === 'outgoing') {
        const sourceId = item.source?.id?._id ? item.source.id._id.toString() : item.source?.id?.toString();
        if (sourceId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك باسترجاع هذا المستند', 403));
        }
      } else if (resolvedType === 'folder') {
        const folderDeptId = item.department?._id ? item.department._id.toString() : item.department?.toString();
        if (folderDeptId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك باسترجاع هذا المجلد', 403));
        }
      } else if (resolvedType === 'personnel') {
        const persDeptId = item.activeDepartment?._id ? item.activeDepartment._id.toString() : item.activeDepartment?.toString();
        if (persDeptId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك باسترجاع هذا الموظف', 403));
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

    if (resolvedType === 'message') {
      const message = await Message.findOne({ _id: id, deletedBy: req.user._id });
      if (!message) {
        return next(new ErrorResponse(`الرسالة غير موجودة في سلة المهملات برمز ${id}`, 404));
      }

      // Check if all parties have deleted it
      const allPartyIds = [
        message.sender.toString(),
        ...message.recipients.map(r => (r.user ? r.user.toString() : r.toString()))
      ];
      const deletedByAll = allPartyIds.every(pId =>
        message.deletedBy.some(dId => dId.toString() === pId)
      );

      let deletedFilesCount = 0;
      if (deletedByAll) {
        const files = collectItemFiles(message);
        files.forEach(f => {
          if (deleteFileFromDisk(f)) deletedFilesCount++;
        });
        await message.deleteOne();
      }

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

    // Permission check for AdminDepartment
    if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      const activeDeptId = req.user.activeDepartment?._id ? req.user.activeDepartment._id.toString() : req.user.activeDepartment?.toString();
      if (resolvedType === 'incoming') {
        const isAssigned = item.assignedTo?.some(dept => {
          const dId = dept.id?._id ? dept.id._id.toString() : (dept.id ? dept.id.toString() : dept.toString());
          return dId === activeDeptId;
        });
        if (!isAssigned) {
          return next(new ErrorResponse('غير مصرح لك بحذف هذا المستند', 403));
        }
      } else if (resolvedType === 'outgoing') {
        const sourceId = item.source?.id?._id ? item.source.id._id.toString() : item.source?.id?.toString();
        if (sourceId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك بحذف هذا المستند', 403));
        }
      } else if (resolvedType === 'folder') {
        const folderDeptId = item.department?._id ? item.department._id.toString() : item.department?.toString();
        if (folderDeptId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك بحذف هذا المجلد', 403));
        }
      } else if (resolvedType === 'personnel') {
        const persDeptId = item.activeDepartment?._id ? item.activeDepartment._id.toString() : item.activeDepartment?.toString();
        if (persDeptId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك بحذف هذا الموظف', 403));
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
      totalFilesDeleted: 0,
      errors: []
    };

    const typesToEmpty = resolvedType === 'all'
      ? Object.keys(MODEL_MAP)
      : (MODEL_MAP[resolvedType] ? [resolvedType] : []);

    if (typesToEmpty.length === 0) {
      return next(new ErrorResponse('نوع العنصر غير صالح', 400));
    }

    const deptId = req.user.role === 'AdminDepartment'
      ? (req.user.activeDepartment?._id || req.user.activeDepartment)
      : null;

    for (const t of typesToEmpty) {
      try {
        const Model = MODEL_MAP[t];
        if (!Model) continue;

        let filter = { isDeleted: true };

        if (t === 'message') {
          filter = { deletedBy: req.user._id };
        } else if (deptId) {
          if (t === 'incoming') filter['assignedTo.id'] = deptId;
          else if (t === 'outgoing') filter['source.id'] = deptId;
          else if (t === 'folder') filter.department = deptId;
          else if (t === 'personnel') filter.activeDepartment = deptId;
        }

        const items = await Model.find(filter);
        for (const item of items) {
          if (t === 'incoming') {
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
