
const express = require('express');
const {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  downloadTemplate
} = require('../controllers/templates');

const { protect, authorize } = require('../middleware/auth');
const { uploadTemplate } = require('../middleware/upload');

const router = express.Router();

// Protect all routes
router.use(protect);

router
  .route('/')
  .get(getTemplates)
  .post(authorize('Admin', 'AdminTuningDesk'), uploadTemplate.single('template'), createTemplate);

router
  .route('/:id')
  .get(getTemplate)
  .put(authorize('Admin', 'AdminTuningDesk'), uploadTemplate.single('template'), updateTemplate)
  .delete(authorize('Admin', 'AdminTuningDesk'), deleteTemplate);

router.route('/:id/download').get(downloadTemplate);

module.exports = router;
