
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const ErrorResponse = require('../utils/errorResponse');

// Helper function to extract numeric part from serial number
const extractSerialNumber = (serialNumberString) => {
  if (!serialNumberString) return null;
  
  // Handle both numeric and string inputs
  if (typeof serialNumberString === 'number') {
    return serialNumberString;
  }
  
  // If it's a string that represents a number, parse it
  const parsed = parseInt(serialNumberString, 10);
  if (!isNaN(parsed)) {
    return parsed;
  }
  
  // Extract number from formatted strings like "IN-2025-001", "OUT-2025-001"
  const match = serialNumberString.toString().match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

// @desc    Get next available serial number for a year and document type
// @route   GET /api/serial-number/next
// @access  Private
exports.getNextSerialNumber = async (req, res, next) => {
  try {
    const { year, type } = req.query;
    
    if (!year || !type) {
      return next(new ErrorResponse('Year and type are required', 400));
    }
    
    const yearInt = parseInt(year);
    if (isNaN(yearInt)) {
      return next(new ErrorResponse('Invalid year provided', 400));
    }
    
    const Model = type === 'incoming' ? IncomingDocument : OutgoingDocument;
    
    // Find the highest serial number for the specified year
    const lastDoc = await Model.findOne({ year: yearInt })
      .sort({ serialNumber: -1 })
      .limit(1);
    
    // If no document exists for this year, start with 1
    const nextSerialNumber = lastDoc ? lastDoc.serialNumber + 1 : 1;
    
    res.status(200).json({
      success: true,
      data: {
        nextSerialNumber,
        year: yearInt,
        type
      }
    });
  } catch (error) {
    console.error('Error getting next serial number:', error);
    next(error);
  }
};

// @desc    Validate if a serial number is available for a year and document type
// @route   GET /api/serial-number/validate
// @access  Private
exports.validateSerialNumber = async (req, res, next) => {
  try {
    const { serialNumber, year, type } = req.query;
    
    if (!serialNumber || !year || !type) {
      return next(new ErrorResponse('Serial number, year and type are required', 400));
    }
    
    const yearInt = parseInt(year);
    if (isNaN(yearInt)) {
      return next(new ErrorResponse('Invalid year provided', 400));
    }
    
    // Extract numeric part from serial number
    const numericSerialNumber = extractSerialNumber(serialNumber);
    if (numericSerialNumber === null || isNaN(numericSerialNumber) || numericSerialNumber <= 0) {
      return next(new ErrorResponse('Invalid serial number format', 400));
    }
    
    const Model = type === 'incoming' ? IncomingDocument : OutgoingDocument;
    
    // Check if a document with this serial number already exists for this year
    const existingDoc = await Model.findOne({ 
      serialNumber: numericSerialNumber, 
      year: yearInt 
    });
    
    const isValid = !existingDoc;
    
    res.status(200).json({
      success: true,
      data: {
        isValid,
        serialNumber: numericSerialNumber,
        year: yearInt,
        type
      }
    });
  } catch (error) {
    console.error('Error validating serial number:', error);
    next(error);
  }
};
