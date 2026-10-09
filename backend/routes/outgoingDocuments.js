
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

// Available years route - MUST come before /:id route
router.get('/years/available', async (req, res) => {
  try {
    const OutgoingDocument = require('../models/OutgoingDocument');
    const years = await OutgoingDocument.distinct('year', { isDeleted: { $ne: true } });
    const sorted = years.filter(y => y != null && !isNaN(y)).sort((a, b) => b - a);
    res.json({ success: true, data: sorted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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
