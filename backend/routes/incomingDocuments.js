
const express = require('express');
const {
  getIncomingDocuments,
  getIncomingDocument,
  createIncomingDocument,
  updateIncomingDocument,
  deleteIncomingDocument,
  assignToFolder,
  assignResponsible,
  addAnswer,
  searchIncomingDocuments
} = require('../controllers/incomingDocuments');

const { protect, authorize, checkDepartmentAccess } = require('../middleware/auth');
const { uploadDocument } = require('../middleware/upload');
const { auditDocumentActivity } = require('../middleware/auditMiddleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// Search route - MUST come before /:id route
router.get('/search', searchIncomingDocuments);

// Routes accessible to all authenticated users
router.route('/')
  .get(auditDocumentActivity('document_view'), getIncomingDocuments)
  .post(
    authorize('Admin', 'AdminTuningDesk'), 
    uploadDocument,
    auditDocumentActivity('document_create'), 
    createIncomingDocument
  );

// Routes for specific documents
router.route('/:id')
  .get(auditDocumentActivity('document_view'), getIncomingDocument)
  .put(
    authorize('Admin', 'AdminTuningDesk', 'AdminDepartment'), 
    uploadDocument,
    auditDocumentActivity('document_update'), 
    updateIncomingDocument
  )
  .delete(
    authorize('Admin', 'AdminTuningDesk'),
    auditDocumentActivity('document_delete'), 
    deleteIncomingDocument
  );

// AdminDepartment routes  
router.put('/:id/folder', 
  authorize('AdminDepartment'), 
  checkDepartmentAccess(),
  auditDocumentActivity('document_moved_to_folder'),
  assignToFolder
);

router.put('/:id/responsible', 
  authorize('AdminDepartment'), 
  checkDepartmentAccess(),
  auditDocumentActivity('document_update'),
  assignResponsible
);

// Answer routes - Updated to support POST method
router.post('/:id/answer', 
  authorize('AdminDepartment', 'User'), 
  checkDepartmentAccess(), 
  uploadDocument,
  auditDocumentActivity('document_update'), 
  addAnswer
);

module.exports = router;
