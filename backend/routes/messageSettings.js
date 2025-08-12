const express = require('express');
const {
  deleteMessagesByPeriod,
  setRetentionPolicy,
  getRetentionPolicy,
  getMessagesStats
} = require('../controllers/messageSettings');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes and restrict to Admin only
router.use(protect);
router.use(authorize('Admin'));

// Routes for message retention management
router.post('/delete-by-period', deleteMessagesByPeriod);
router.post('/retention-policy', setRetentionPolicy);
router.get('/retention-policy', getRetentionPolicy);
router.get('/stats', getMessagesStats);

module.exports = router;