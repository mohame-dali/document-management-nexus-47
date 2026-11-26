const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getDashboardStats, getDashboardSummary } = require('../controllers/dashboardController');

router.use(protect);
router.get('/stats', getDashboardStats);
router.get('/summary', getDashboardSummary);

module.exports = router;
