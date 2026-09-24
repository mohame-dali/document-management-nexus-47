const express = require('express');
const {
  getFolders,
  getFolder,
  createFolder,
  updateFolder,
  moveFolder,
  deleteFolder,
  getRootFolders,
  getSubFolders,
  getFolderHierarchy,
  getFolderDocuments,
  updateFolderStatus,
  assignDocumentToFolder,
  batchMoveDocuments
} = require('../controllers/folders');

const { protect, authorize, checkDepartmentAccess } = require('../middleware/auth');
const { auditDocumentActivity } = require('../middleware/auditMiddleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// Department hierarchy routes
router.get('/hierarchy', getFolderHierarchy);
router.get('/department/:departmentId/hierarchy', getFolderHierarchy);
router.get('/department/:departmentId/root', getRootFolders);

// Document assignment / moving routes
router.put(
  '/assign-document',
  authorize('AdminDepartment', 'Admin'),
  auditDocumentActivity('document_folder_assigned'),
  assignDocumentToFolder
);

router.put(
  '/batch-move-documents',
  authorize('AdminDepartment', 'Admin'),
  auditDocumentActivity('documents_batch_moved'),
  batchMoveDocuments
);

// Base collection routes
router.route('/')
  .get(getFolders)
  .post(
    authorize('AdminDepartment', 'Admin'), 
    checkDepartmentAccess(),
    auditDocumentActivity('folder_create'),
    createFolder
  );

// Specific folder item routes
router.route('/:id')
  .get(getFolder)
  .put(
    authorize('AdminDepartment', 'Admin'), 
    checkDepartmentAccess(),
    auditDocumentActivity('folder_update'),
    updateFolder
  )
  .delete(
    authorize('AdminDepartment', 'Admin'), 
    checkDepartmentAccess(),
    auditDocumentActivity('folder_delete'),
    deleteFolder
  );

// Folder sub-resources
router.get('/:id/subfolders', getSubFolders);
router.get('/:id/documents', getFolderDocuments);

router.put('/:id/status', 
  authorize('AdminDepartment', 'Admin'), 
  checkDepartmentAccess(),
  auditDocumentActivity('folder_update'),
  updateFolderStatus
);

router.put('/:id/move',
  authorize('AdminDepartment', 'Admin'), 
  checkDepartmentAccess(),
  auditDocumentActivity('folder_move'),
  moveFolder
);

module.exports = router;
