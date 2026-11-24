const express = require('express');
const { getMonthlyAttendanceSheet } = require('../../controllers/hr/monthlyReportController');
const { protect } = require('../../middleware/auth');
const { checkAttendanceAccess } = require('../../middleware/attendanceAccess');

const router = express.Router();

// Authentification et contrôle d'accès au module Présence
router.use(protect);
router.use(checkAttendanceAccess);

// GET /api/hr/attendance/monthly-report
router.get('/', getMonthlyAttendanceSheet);

module.exports = router;
