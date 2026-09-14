
const express = require('express');
const {
  getDocumentOptions,
  createDocumentOption,
  updateDocumentOption,
  deleteDocumentOption
} = require('../controllers/documentOptions');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

router.route('/')
  .get(getDocumentOptions)
  .post(authorize('AdminTuningDesk'), createDocumentOption);

router.route('/:id')
  .put(authorize('AdminTuningDesk'), updateDocumentOption)
  .delete(authorize('AdminTuningDesk'), deleteDocumentOption);

module.exports = router;
