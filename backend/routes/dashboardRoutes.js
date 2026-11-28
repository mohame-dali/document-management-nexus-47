const express = require('express');
const router = express.Router();
const { protect, authorizeExecutiveDashboard } = require('../middleware/auth');
const { getDashboardStats, getDashboardSummary } = require('../controllers/dashboardController');

router.use(protect, authorizeExecutiveDashboard);
router.get('/stats', getDashboardStats);
router.get('/summary', getDashboardSummary);

module.exports = router;

