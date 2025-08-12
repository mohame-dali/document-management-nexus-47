
const express = require('express');
const {
  getFolders,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
  getRootFolders,
  getSubFolders,
  getFolderDocuments,
  updateFolderStatus
} = require('../controllers/folders');

const { protect, authorize, checkDepartmentAccess } = require('../middleware/auth');
const { auditDocumentActivity } = require('../middleware/auditMiddleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get all folders - AdminTuningDesk can view all, others restricted to their department
router.route('/')
  .get(getFolders)
  .post(
    authorize('AdminDepartment'), 
    checkDepartmentAccess(),
    auditDocumentActivity('folder_create'),
    createFolder
  );

// Specific folder routes
router.route('/:id')
  .get(getFolder)
  .put(
    authorize('AdminDepartment'), 
    checkDepartmentAccess(),
    auditDocumentActivity('folder_update'),
    updateFolder
  )
  .delete(
    authorize('AdminDepartment'), 
    checkDepartmentAccess(),
    auditDocumentActivity('folder_delete'),
    deleteFolder
  );

// Get root folders (no parent) - AdminTuningDesk can access any department
router.get('/department/:departmentId/root', getRootFolders);

// Get subfolders of a folder - AdminTuningDesk can access any folder
router.get('/:id/subfolders', getSubFolders);

// Get documents in a folder - AdminTuningDesk can access any folder
router.get('/:id/documents', getFolderDocuments);

// Update folder status - only AdminDepartment
router.put('/:id/status', 
  authorize('AdminDepartment'), 
  checkDepartmentAccess(),
  auditDocumentActivity('folder_update'),
  updateFolderStatus
);

// Move folder - only AdminDepartment
router.put('/:id/move',
  authorize('AdminDepartment'), 
  checkDepartmentAccess(),
  auditDocumentActivity('folder_update'),
  async (req, res, next) => {
    try {
      const { parentId } = req.body;
      
      const updatedFolder = await updateFolder(req, res, next, {
        parent: parentId || null
      });
      
      if (!updatedFolder) return;
      
      res.status(200).json({
        success: true,
        data: updatedFolder
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
