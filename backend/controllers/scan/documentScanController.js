const ErrorResponse = require('../../utils/errorResponse');
const scanIntegration = require('../../utils/scanIntegration');
const path = require('path');
const fs = require('fs');

/**
 * @desc    Scan a document for insertion into the document management system
 * @route   POST /api/scan/document
 * @access  Private/Admin/AdminTuningDesk
 */
exports.scanForDocument = async (req, res, next) => {
  try {
    const { documentType, year } = req.body;
    
    // Validate input
    if (!documentType || (documentType !== 'incoming' && documentType !== 'outgoing')) {
      return next(new ErrorResponse('Please provide a valid document type (incoming or outgoing)', 400));
    }
    
    // Use the current year if not provided
    const docYear = year || new Date().getFullYear();
    
    console.log(`Starting document scan for type: ${documentType}, year: ${docYear}`);
    
    // Use the scan integration to scan the document
    const scanResult = await scanIntegration.scanForDocument({
      documentType,
      year: docYear,
      user: req.user,
      format: req.body.format || 'pdf',
      resolution: req.body.resolution || 300
    });
    
    if (!scanResult.success) {
      console.error('Scanning failed:', scanResult.error);
      return next(new ErrorResponse(`Scanning failed: ${scanResult.error}`, 400));
    }
    
    console.log('Scan completed successfully:', scanResult);
    
    // Return the scan result with the document path and other metadata
    res.status(200).json({
      success: true,
      data: {
        filePath: scanResult.filePath,
        serialNumber: scanResult.serialNumber,
        year: scanResult.year,
        documentType,
        ocrText: scanResult.ocrText,
        format: scanResult.format
      }
    });
  } catch (err) {
    console.error('Error in scanForDocument controller:', err);
    next(err);
  }
};

/**
 * @desc    Scan a temporary document (not directly linked to a document record)
 * @route   POST /api/scan/temp
 * @access  Private/Admin/AdminTuningDesk
 */
exports.scanTemporaryDocument = async (req, res, next) => {
  try {
    const { format, resolution, documentType } = req.body;
    
    console.log(`Starting temporary scan with format: ${format}, resolution: ${resolution}`);
    
    // Use the scan integration to scan a temporary document
    const scanResult = await scanIntegration.scanDocument({
      documentType: documentType || 'temp',
      format: format || 'pdf',
      resolution: resolution || 300,
      userId: req.user.id
    });
    
    if (!scanResult.success) {
      console.error('Temporary scanning failed:', scanResult.error);
      return next(new ErrorResponse(`Scanning failed: ${scanResult.error}`, 400));
    }
    
    console.log('Temporary scan completed successfully:', scanResult);
    
    // Return the temporary file path
    res.status(200).json({
      success: true,
      data: {
        filePath: scanResult.filePath,
        format: scanResult.format,
        ocrText: scanResult.ocrText
      }
    });
  } catch (err) {
    console.error('Error in scanTemporaryDocument controller:', err);
    next(err);
  }
};

/**
 * @desc    Get a scanned document by ID and type
 * @route   GET /api/scan/document/:id/:type
 * @access  Private
 */
exports.getDocumentScan = async (req, res, next) => {
  try {
    const { id, type } = req.params;
    
    // Validate type
    if (type !== 'incoming' && type !== 'outgoing' && type !== 'temp') {
      return next(new ErrorResponse('Invalid document type', 400));
    }
    
    // Find the document file path based on ID and type
    const filePath = await determineDocumentPath(id, type);
    
    if (!filePath) {
      return next(new ErrorResponse('Document not found', 404));
    }
    
    // Check if file exists
    const fullPath = path.join(__dirname, '../..', filePath);
    if (!fs.existsSync(fullPath)) {
      return next(new ErrorResponse('Document file not found', 404));
    }
    
    res.status(200).json({
      success: true,
      data: {
        id,
        type,
        filePath
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to determine document file path
 * @param {string} id - Document ID
 * @param {string} type - Document type
 * @returns {Promise<string|null>} Document path or null
 */
async function determineDocumentPath(id, type) {
  try {
    if (type === 'temp') {
      // For temporary documents, the ID is already a file path
      return id;
    }
    
    // For incoming or outgoing documents, look up in database
    const Model = type === 'incoming' 
      ? require('../../models/IncomingDocument')
      : require('../../models/OutgoingDocument');
      
    const document = await Model.findById(id);
    
    if (!document || !document.scannedDocument) {
      return null;
    }
    
    return document.scannedDocument;
  } catch (error) {
    console.error('Error determining document path:', error);
    return null;
  }
}
