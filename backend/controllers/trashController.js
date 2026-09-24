const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const Folder = require('../models/Folder');
const Message = require('../models/Message');
const ErrorResponse = require('../utils/errorResponse');
const fs = require('fs');
const path = require('path');

// Helper to safely delete file from disk
const deleteFileFromDisk = (filePathRelative) => {
  if (!filePathRelative) return;
  try {
    const fullPath = path.isAbsolute(filePathRelative)
      ? filePathRelative
      : path.join(__dirname, '..', filePathRelative);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`Deleted file: ${fullPath}`);
    }
  } catch (err) {
    console.error(`Error deleting file: ${filePathRelative}`, err.message);
  }
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

    if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('لم يتم تحديد قسم نشط', 403));
      }
      const deptId = req.user.activeDepartment._id || req.user.activeDepartment;
      incomingQuery['assignedTo.id'] = deptId;
      outgoingQuery['source.id'] = deptId;
      folderQuery.department = deptId;
    } else if (req.query.department) {
      incomingQuery['assignedTo.id'] = req.query.department;
      outgoingQuery['source.id'] = req.query.department;
      folderQuery.department = req.query.department;
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
    }

    // Get counts
    const [incomingCount, outgoingCount, folderCount, messageCount] = await Promise.all([
      IncomingDocument.countDocuments(incomingQuery),
      OutgoingDocument.countDocuments(outgoingQuery),
      Folder.countDocuments(folderQuery),
      Message.countDocuments(messageQuery)
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
    } else {
      // 'all' type: combine all deleted items
      totalCount = incomingCount + outgoingCount + folderCount + messageCount;

      const [incomingDocs, outgoingDocs, folders, messages] = await Promise.all([
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
          .limit(limitNum)
      ]);

      const formattedIncoming = incomingDocs.map(d => ({ ...d.toObject(), itemType: 'incoming' }));
      const formattedOutgoing = outgoingDocs.map(d => ({ ...d.toObject(), itemType: 'outgoing' }));
      const formattedFolders = folders.map(f => ({ ...f.toObject(), itemType: 'folder' }));
      const formattedMessages = messages.map(m => ({ ...m.toObject(), itemType: 'message', deletedAt: m.updatedAt }));

      // Merge and sort by deletedAt descending
      const allItems = [...formattedIncoming, ...formattedOutgoing, ...formattedFolders, ...formattedMessages].sort((a, b) => {
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
        total: incomingCount + outgoingCount + folderCount + messageCount,
        incoming: incomingCount,
        outgoing: outgoingCount,
        folder: folderCount,
        message: messageCount
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

    if (!['incoming', 'outgoing', 'folder', 'message'].includes(type)) {
      return next(new ErrorResponse('نوع العنصر غير صالح (incoming, outgoing, folder, message)', 400));
    }

    if (type === 'message') {
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

    let item;
    if (type === 'incoming') {
      item = await IncomingDocument.findById(id);
    } else if (type === 'outgoing') {
      item = await OutgoingDocument.findById(id);
    } else if (type === 'folder') {
      item = await Folder.findById(id);
    }

    if (!item || !item.isDeleted) {
      return next(new ErrorResponse(`العنصر غير موجود في سلة المهملات برمز ${id}`, 404));
    }

    // Permission check for AdminDepartment
    if (req.user.role === 'AdminDepartment' || req.user.role === 'User') {
      const activeDeptId = req.user.activeDepartment?._id ? req.user.activeDepartment._id.toString() : req.user.activeDepartment?.toString();
      if (type === 'incoming') {
        const isAssigned = item.assignedTo?.some(dept => {
          const dId = dept.id?._id ? dept.id._id.toString() : (dept.id ? dept.id.toString() : dept.toString());
          return dId === activeDeptId;
        });
        if (!isAssigned) {
          return next(new ErrorResponse('غير مصرح لك باسترجاع هذا المستند', 403));
        }
      } else if (type === 'outgoing') {
        const sourceId = item.source?.id?._id ? item.source.id._id.toString() : item.source?.id?.toString();
        if (sourceId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك باسترجاع هذا المستند', 403));
        }
      } else if (type === 'folder') {
        const folderDeptId = item.department?._id ? item.department._id.toString() : item.department?.toString();
        if (folderDeptId !== activeDeptId) {
          return next(new ErrorResponse('غير مصرح لك باسترجاع هذا المجلد', 403));
        }
      }
    }

    // If folder, check if its parent folder is also deleted
    if (type === 'folder' && item.parent) {
      const parentFolder = await Folder.findById(item.parent);
      if (!parentFolder || parentFolder.isDeleted) {
        // Parent folder is also deleted, reset parent to null (move to root)
        item.parent = null;
      }
    }

    // If document, check if its folder is still valid and not deleted
    if ((type === 'incoming' || type === 'outgoing') && item.folder) {
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

    if (!['incoming', 'outgoing', 'folder', 'message'].includes(type)) {
      return next(new ErrorResponse('نوع العنصر غير صالح (incoming, outgoing, folder, message)', 400));
    }

    if (type === 'message') {
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

      if (deletedByAll) {
        if (message.attachments && message.attachments.length > 0) {
          message.attachments.forEach(att => {
            if (att.path) deleteFileFromDisk(att.path);
          });
        }
        await message.deleteOne();
      }

      return res.status(200).json({
        success: true,
        message: 'تم الحذف النهائي للرسالة بنجاح',
        data: {}
      });
    }

    if (type === 'incoming') {
      const document = await IncomingDocument.findById(id);
      if (!document || !document.isDeleted) {
        return next(new ErrorResponse(`المستند غير موجود في سلة المهملات برمز ${id}`, 404));
      }

      // Delete physical file
      if (document.scannedDocument) {
        deleteFileFromDisk(document.scannedDocument);
      }

      // Clean up references in OutgoingDocument
      await OutgoingDocument.updateMany(
        { reference: document._id },
        { reference: null }
      );

      await document.deleteOne();

      return res.status(200).json({
        success: true,
        message: 'تم الحذف النهائي للمستند بنجاح',
        data: {}
      });
    }

    if (type === 'outgoing') {
      const document = await OutgoingDocument.findById(id);
      if (!document || !document.isDeleted) {
        return next(new ErrorResponse(`المستند غير موجود في سلة المهملات برمز ${id}`, 404));
      }

      // Delete physical file
      if (document.scannedDocument) {
        deleteFileFromDisk(document.scannedDocument);
      }

      // Clean up answer reference in IncomingDocument
      await IncomingDocument.updateMany(
        { answer: document._id },
        { answer: null }
      );

      await document.deleteOne();

      return res.status(200).json({
        success: true,
        message: 'تم الحذف النهائي للمستند بنجاح',
        data: {}
      });
    }

    if (type === 'folder') {
      const folder = await Folder.findById(id);
      if (!folder || !folder.isDeleted) {
        return next(new ErrorResponse(`المجلد غير موجود في سلة المهملات برمز ${id}`, 404));
      }

      // Check if folder has any non-deleted subfolders or documents
      const [activeSubfolders, activeIncoming, activeOutgoing] = await Promise.all([
        Folder.countDocuments({ parent: folder._id, isDeleted: false }),
        IncomingDocument.countDocuments({ folder: folder._id, isDeleted: false }),
        OutgoingDocument.countDocuments({ folder: folder._id, isDeleted: false })
      ]);

      if (activeSubfolders > 0 || activeIncoming > 0 || activeOutgoing > 0) {
        return next(
          new ErrorResponse('لا يمكن الحذف النهائي للمجلد لأنه يحتوي على عناصر نشطة غير محذوفة', 400)
        );
      }

      // Disassociate any trashed items from this folder
      await Promise.all([
        Folder.updateMany({ parent: folder._id }, { parent: null }),
        IncomingDocument.updateMany({ folder: folder._id }, { folder: null }),
        OutgoingDocument.updateMany({ folder: folder._id }, { folder: null })
      ]);

      await folder.deleteOne();

      return res.status(200).json({
        success: true,
        message: 'تم الحذف النهائي للمجلد بنجاح',
        data: {}
      });
    }
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

    let incomingFilter = { isDeleted: true };
    let outgoingFilter = { isDeleted: true };
    let folderFilter = { isDeleted: true };

    if (req.user.role === 'AdminDepartment') {
      const deptId = req.user.activeDepartment?._id || req.user.activeDepartment;
      incomingFilter['assignedTo.id'] = deptId;
      outgoingFilter['source.id'] = deptId;
      folderFilter.department = deptId;
    }

    let deletedCounts = { incoming: 0, outgoing: 0, folder: 0, message: 0 };

    if (type === 'all' || type === 'incoming') {
      const incomingDocs = await IncomingDocument.find(incomingFilter);
      for (const doc of incomingDocs) {
        if (doc.scannedDocument) {
          deleteFileFromDisk(doc.scannedDocument);
        }
        await OutgoingDocument.updateMany({ reference: doc._id }, { reference: null });
        await doc.deleteOne();
        deletedCounts.incoming++;
      }
    }

    if (type === 'all' || type === 'outgoing') {
      const outgoingDocs = await OutgoingDocument.find(outgoingFilter);
      for (const doc of outgoingDocs) {
        if (doc.scannedDocument) {
          deleteFileFromDisk(doc.scannedDocument);
        }
        await IncomingDocument.updateMany({ answer: doc._id }, { answer: null });
        await doc.deleteOne();
        deletedCounts.outgoing++;
      }
    }

    if (type === 'all' || type === 'folder') {
      const folders = await Folder.find(folderFilter);
      for (const f of folders) {
        // Disassociate items
        await Folder.updateMany({ parent: f._id }, { parent: null });
        await IncomingDocument.updateMany({ folder: f._id }, { folder: null });
        await OutgoingDocument.updateMany({ folder: f._id }, { folder: null });
        await f.deleteOne();
        deletedCounts.folder++;
      }
    }

    if (type === 'all' || type === 'message') {
      const messages = await Message.find({ deletedBy: req.user._id });
      for (const msg of messages) {
        const allPartyIds = [
          msg.sender.toString(),
          ...msg.recipients.map(r => (r.user ? r.user.toString() : r.toString()))
        ];
        const deletedByAll = allPartyIds.every(pId =>
          msg.deletedBy.some(dId => dId.toString() === pId)
        );
        if (deletedByAll) {
          if (msg.attachments && msg.attachments.length > 0) {
            msg.attachments.forEach(att => {
              if (att.path) deleteFileFromDisk(att.path);
            });
          }
          await msg.deleteOne();
        }
        deletedCounts.message++;
      }
    }

    res.status(200).json({
      success: true,
      message: 'تم إفراغ سلة المهملات بنجاح',
      data: deletedCounts
    });
  } catch (err) {
    next(err);
  }
};
