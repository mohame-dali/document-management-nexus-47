const Folder = require('../../models/Folder');
const IncomingDocument = require('../../models/IncomingDocument');
const OutgoingDocument = require('../../models/OutgoingDocument');
const ErrorResponse = require('../../utils/errorResponse');

// Helper to attach document counts to an array of folders
const attachDocumentCounts = async (folders) => {
  const folderIds = folders.map(f => f._id);
  
  const [incomingCounts, outgoingCounts] = await Promise.all([
    IncomingDocument.aggregate([
      { $match: { folder: { $in: folderIds } } },
      { $group: { _id: '$folder', count: { $sum: 1 } } }
    ]),
    OutgoingDocument.aggregate([
      { $match: { folder: { $in: folderIds } } },
      { $group: { _id: '$folder', count: { $sum: 1 } } }
    ])
  ]);

  const countMap = {};
  incomingCounts.forEach(c => {
    countMap[c._id.toString()] = (countMap[c._id.toString()] || 0) + c.count;
  });
  outgoingCounts.forEach(c => {
    countMap[c._id.toString()] = (countMap[c._id.toString()] || 0) + c.count;
  });

  return folders.map(folder => {
    const obj = folder.toObject ? folder.toObject() : { ...folder };
    obj.documentCount = countMap[folder._id.toString()] || 0;
    return obj;
  });
};

// @desc    Get all folders
// @route   GET /api/folders
// @access  Private
exports.getFolders = async (req, res, next) => {
  try {
    let query = {};
    
    // SuperAdmin, AdminTuningDesk and Admin can see all departments' folders
    if (req.user.role === 'SuperAdmin' || req.user.role === 'AdminTuningDesk' || req.user.role === 'Admin') {
      if (req.query.department) {
        query.department = req.query.department;
      }
    } 
    // For AdminDepartment and User roles, restrict to their active department
    else {
      if (!req.user.activeDepartment) {
        return next(new ErrorResponse('لم يتم تحديد قسم نشط', 403));
      }
      query.department = req.user.activeDepartment._id || req.user.activeDepartment;
    }
    
    // Filter by status if requested
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by parent if requested ('null' for root folders)
    if (req.query.parent !== undefined) {
      query.parent = req.query.parent === 'null' || req.query.parent === '' ? null : req.query.parent;
    }

    // Search by name if requested
    if (req.query.search) {
      query.name = new RegExp(req.query.search.trim(), 'i');
    }
    
    const folders = await Folder.find(query)
      .populate('department', 'name')
      .populate('parent', 'name')
      .populate('createdBy', 'username role')
      .sort({ createdAt: -1 });
    
    const foldersWithCounts = await attachDocumentCounts(folders);
    
    res.status(200).json({
      success: true,
      count: foldersWithCounts.length,
      data: foldersWithCounts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get root folders (no parent)
// @route   GET /api/folders/department/:departmentId/root
// @access  Private
exports.getRootFolders = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    
    if (!departmentId) {
      return next(new ErrorResponse('يرجى تحديد معرّف القسم', 400));
    }
    
    // Verify department access
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin' && req.user.role !== 'AdminTuningDesk') {
      const activeDeptId = req.user.activeDepartment?._id ? req.user.activeDepartment._id.toString() : req.user.activeDepartment?.toString();
      if (activeDeptId !== departmentId.toString()) {
        return next(new ErrorResponse('غير مصرح لك بالوصول إلى هذا القسم', 403));
      }
    }
    
    const folders = await Folder.find({
      department: departmentId,
      parent: null
    }).populate('department', 'name')
      .populate('createdBy', 'username role')
      .sort({ name: 1 });
    
    const foldersWithCounts = await attachDocumentCounts(folders);
    
    res.status(200).json({
      success: true,
      count: foldersWithCounts.length,
      data: foldersWithCounts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get subfolders of a folder
// @route   GET /api/folders/:id/subfolders
// @access  Private
exports.getSubFolders = async (req, res, next) => {
  try {
    const parentFolder = await Folder.findById(req.params.id);
    
    if (!parentFolder) {
      return next(new ErrorResponse(`المجلد غير موجود برمز ${req.params.id}`, 404));
    }
    
    // Verify folder access
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin' && req.user.role !== 'AdminTuningDesk') {
      const activeDeptId = req.user.activeDepartment?._id ? req.user.activeDepartment._id.toString() : req.user.activeDepartment?.toString();
      if (parentFolder.department.toString() !== activeDeptId) {
        return next(new ErrorResponse('غير مصرح لك بالوصول إلى هذا المجلد', 403));
      }
    }
    
    const subfolders = await Folder.find({
      parent: req.params.id
    }).populate('department', 'name')
      .populate('createdBy', 'username role')
      .sort({ name: 1 });
    
    const foldersWithCounts = await attachDocumentCounts(subfolders);
    
    res.status(200).json({
      success: true,
      count: foldersWithCounts.length,
      data: foldersWithCounts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get complete folder hierarchy for a department
// @route   GET /api/folders/department/:departmentId/hierarchy
// @access  Private
exports.getFolderHierarchy = async (req, res, next) => {
  try {
    const departmentId = req.params.departmentId || req.query.department || req.user.activeDepartment?._id;
    
    if (!departmentId) {
      return next(new ErrorResponse('يرجى تحديد القسم الإداري', 400));
    }

    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin' && req.user.role !== 'AdminTuningDesk') {
      const activeDeptId = req.user.activeDepartment?._id ? req.user.activeDepartment._id.toString() : req.user.activeDepartment?.toString();
      if (activeDeptId !== departmentId.toString()) {
        return next(new ErrorResponse('غير مصرح لك بالوصول إلى هذا القسم', 403));
      }
    }

    const allFolders = await Folder.find({ department: departmentId })
      .populate('createdBy', 'username role')
      .sort({ name: 1 });

    const foldersWithCounts = await attachDocumentCounts(allFolders);

    // Build hierarchy tree
    const buildTree = (parentId = null) => {
      return foldersWithCounts
        .filter(f => {
          const pId = f.parent ? (f.parent._id ? f.parent._id.toString() : f.parent.toString()) : null;
          return pId === (parentId ? parentId.toString() : null);
        })
        .map(folder => ({
          ...folder,
          children: buildTree(folder._id)
        }));
    };

    const tree = buildTree(null);

    res.status(200).json({
      success: true,
      data: tree
    });
  } catch (err) {
    next(err);
  }
};
