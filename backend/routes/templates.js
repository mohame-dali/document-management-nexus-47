
const express = require('express');
const {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  downloadTemplate
} = require('../controllers/templates');

const { protect } = require('../middleware/auth');
const { uploadTemplate } = require('../middleware/upload');

const router = express.Router();

// Protect all routes
router.use(protect);

router
  .route('/')
  .get(getTemplates)
  .post(uploadTemplate.single('template'), createTemplate);

router
  .route('/:id')
  .get(getTemplate)
  .put(uploadTemplate.single('template'), updateTemplate)
  .delete(deleteTemplate);

router.route('/:id/download').get(downloadTemplate);

module.exports = router;
