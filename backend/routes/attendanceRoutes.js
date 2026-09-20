const express = require('express');
const {
  getDailyAttendance,
  saveBatchAttendance,
  getPersonnelCalendar,
  getPersonnelBalance,
  getDailyReport,
  getMonthlyReport,
  getYearlyReport,
  getSettings,
  updateSettings
} = require('../controllers/attendanceController');

const { protect, authorize } = require('../middleware/auth');
const { checkAttendanceAccess } = require('../middleware/attendanceAccess');

const router = express.Router();

// Toutes les routes de ce module nécessitent une authentification
router.use(protect);
router.use(checkAttendanceAccess);

// Saisie et consultation collective quotidienne
router.get('/daily', getDailyAttendance);
router.post('/batch', saveBatchAttendance);

// Espace calendrier et solde individuel (Self-service / Consultation)
router.get('/calendar/:personnelId', getPersonnelCalendar);
router.get('/balance/:personnelId', getPersonnelBalance);

// Rapports d'émargement et bilans
router.get('/report/daily', getDailyReport);
router.get('/report/monthly', getMonthlyReport);
router.get('/report/yearly', getYearlyReport);

// Configuration annuelle des présences et solde
router.get('/settings', getSettings);
router.put('/settings', authorize('Admin', 'SuperAdmin', 'AdminDepartment'), updateSettings);

module.exports = router;
