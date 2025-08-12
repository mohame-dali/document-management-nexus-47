
const express = require('express');
const { getNextSerialNumber, validateSerialNumber } = require('../controllers/serialNumber');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get next serial number for a given year and type
router.get('/next', getNextSerialNumber);

// Validate if a serial number is available for a given year and type
router.get('/validate', validateSerialNumber);

module.exports = router;
