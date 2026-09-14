
const express = require('express');
const {
  getOutgoingDocuments,
  getOutgoingDocument,
  createOutgoingDocument,
  updateOutgoingDocument,
  deleteOutgoingDocument,
  assignToFolder,
  searchOutgoingDocuments
} = require('../controllers/outgoingDocuments');

const { protect, authorize, checkDepartmentAccess } = require('../middleware/auth');
const { uploadDocument } = require('../middleware/upload');
const { auditDocumentActivity } = require('../middleware/auditMiddleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// Search route - MUST come before /:id route
router.get('/search', searchOutgoingDocuments);

// AdminTuningDesk can create documents
router.route('/')
  .get(auditDocumentActivity('document_view'), getOutgoingDocuments)
  .post(
    authorize('Admin', 'AdminTuningDesk'), 
    uploadDocument,
    auditDocumentActivity('document_create'), 
    createOutgoingDocument
  );

// Routes for specific documents
router.route('/:id')
  .get(auditDocumentActivity('document_view'), getOutgoingDocument)
  .put(
    authorize('Admin', 'AdminTuningDesk', 'AdminDepartment'), 
    uploadDocument,
    auditDocumentActivity('document_update'), 
    updateOutgoingDocument
  )
  .delete(
    authorize('Admin', 'AdminTuningDesk'),
    auditDocumentActivity('document_delete'), 
    deleteOutgoingDocument
  );

// AdminDepartment routes
router.put('/:id/folder', 
  authorize('AdminDepartment'), 
  checkDepartmentAccess(),
  auditDocumentActivity('document_moved_to_folder'), 
  assignToFolder
);

module.exports = router;
