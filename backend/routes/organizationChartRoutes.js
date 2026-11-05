const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getOrganizationChart } = require('../controllers/organizationChartController');

router.use(protect);
router.get('/', getOrganizationChart);

module.exports = router;
