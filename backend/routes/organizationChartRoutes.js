const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getOrganizationChart } = require('../controllers/organizationChartController');

router.use(protect);
router.use(authorize('Admin', 'Director', 'AdminDepartment'));
router.get('/', getOrganizationChart);

module.exports = router;
