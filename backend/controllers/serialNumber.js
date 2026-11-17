const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const ErrorResponse = require('../utils/errorResponse');
const { getNextSerialNumber: allocateAtomicSerialNumber } = require('../utils/documentHelper');

// Helper function to extract numeric part from serial number
const extractSerialNumber = (serialNumberString) => {
  if (!serialNumberString) return null;

  if (typeof serialNumberString === 'number') {
    return serialNumberString;
  }

  const parsed = parseInt(serialNumberString, 10);
  if (!isNaN(parsed)) {
    return parsed;
  }

  const match = serialNumberString.toString().match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

// @desc    Get next available serial number for a year and document type (atomic Counter)
// @route   GET /api/serial-number/next
// @access  Private
exports.getNextSerialNumber = async (req, res, next) => {
  try {
    const { year, type } = req.query;

    if (!year || !type) {
      return next(new ErrorResponse('Year and type are required', 400));
    }

    if (type !== 'incoming' && type !== 'outgoing') {
      return next(new ErrorResponse('Invalid type provided (must be incoming or outgoing)', 400));
    }

    const yearInt = parseInt(year, 10);
    if (isNaN(yearInt) || yearInt <= 0) {
      return next(new ErrorResponse('Invalid year provided', 400));
    }

    const nextSerialNumber = await allocateAtomicSerialNumber(yearInt, type);

    res.status(200).json({
      success: true,
      data: {
        nextSerialNumber,
        year: yearInt,
        type,
      },
    });
  } catch (error) {
    console.error('Error getting next serial number:', error);
    next(error);
  }
};

// @desc    Validate if a serial number is available for a year and document type (excludes deleted)
// @route   GET /api/serial-number/validate
// @access  Private
exports.validateSerialNumber = async (req, res, next) => {
  try {
    const { serialNumber, year, type } = req.query;

    if (!serialNumber || !year || !type) {
      return next(new ErrorResponse('Serial number, year and type are required', 400));
    }

    if (type !== 'incoming' && type !== 'outgoing') {
      return next(new ErrorResponse('Invalid type provided (must be incoming or outgoing)', 400));
    }

    const yearInt = parseInt(year, 10);
    if (isNaN(yearInt) || yearInt <= 0) {
      return next(new ErrorResponse('Invalid year provided', 400));
    }

    const numericSerialNumber = extractSerialNumber(serialNumber);
    if (numericSerialNumber === null || isNaN(numericSerialNumber) || numericSerialNumber <= 0) {
      return next(new ErrorResponse('Invalid serial number format', 400));
    }

    const Model = type === 'incoming' ? IncomingDocument : OutgoingDocument;

    // Exclut les documents supprimés (isDeleted: true) conformément à l'index partiel unique
    const existingDoc = await Model.findOne({
      serialNumber: numericSerialNumber,
      year: yearInt,
      isDeleted: { $ne: true },
    });

    const isValid = !existingDoc;

    res.status(200).json({
      success: true,
      data: {
        isValid,
        serialNumber: numericSerialNumber,
        year: yearInt,
        type,
      },
    });
  } catch (error) {
    console.error('Error validating serial number:', error);
    next(error);
  }
};
