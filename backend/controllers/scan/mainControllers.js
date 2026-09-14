
const scannerService = require('../../utils/scanner');
const ErrorResponse = require('../../utils/errorResponse');
const { extractTextFromPDF } = require('../../utils/ocrProcessor');
const path = require('path');
const fs = require('fs');

// @desc    Start a scan job
// @route   POST /api/scan/start
// @access  Private/AdminTuningDesk/Admin
exports.startScan = async (req, res, next) => {
  try {
    const { documentType, format, resolution } = req.body;
    
    // Validate input
    if (!documentType || !['incoming', 'outgoing', 'temp'].includes(documentType)) {
      return next(new ErrorResponse('Invalid document type. Must be "incoming", "outgoing", or "temp".', 400));
    }
    
    // Get scanner status first to check if scanning is already in progress
    const scannerStatus = scannerService.getStatus();
    if (scannerStatus.isScanning) {
      return next(new ErrorResponse('Scanner is currently busy with another job', 409));
    }
    
    // Check for required utilities on Linux/macOS
    if (scannerService.getPlatform() !== 'win32' && !scannerStatus.hasScanimageCmd) {
      return next(new ErrorResponse(
        'scanimage utility not found. Please install SANE package on your system with: sudo apt-get install sane-utils', 
        400
      ));
    }
    
    // Start the scan job
    const filePath = await scannerService.startScan({
      documentType,
      format: format || 'pdf',
      resolution: resolution || 300,
      userId: req.user.id
    });
    
    // Process the scanned document with OCR if it's a PDF
    let ocrText = null;
    let ocrProcessed = false;
    
    if (path.extname(filePath).toLowerCase() === '.pdf') {
      try {
        // Make sure the file exists
        if (fs.existsSync(filePath)) {
          ocrText = await extractTextFromPDF(filePath);
          ocrProcessed = true;
        }
      } catch (error) {
        console.error('OCR processing error:', error);
        // Continue even if OCR fails
      }
    }
    
    // Inform scanner service about OCR result
    scannerService.emit('scanComplete', { ocrProcessed });
    
    res.status(200).json({
      success: true,
      data: {
        filePath,
        documentType,
        ocrText,
        ocrProcessed,
        scannedAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get scanner status
// @route   GET /api/scan/status
// @access  Private/AdminTuningDesk/Admin
exports.getScannerStatus = async (req, res, next) => {
  try {
    const status = scannerService.getStatus();
    const platform = scannerService.getPlatform();
    
    // Add installation instructions based on platform
    if (platform !== 'win32' && !status.hasScanimageCmd) {
      status.installInstructions = 'Please install the SANE package using: sudo apt-get install sane-utils';
      status.checkCommand = 'After installation, check for scanners with: scanimage -L';
    } else if (platform === 'win32' && !status.hasScannersAvailable) {
      status.installInstructions = 'Please ensure your scanner is properly connected and drivers are installed';
    }
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List available scanners
// @route   GET /api/scan/devices
// @access  Private/AdminTuningDesk/Admin
exports.listScanners = async (req, res, next) => {
  try {
    // Get platform info
    const platform = scannerService.getPlatform();
    
    // Check if scanimage is available for Linux/macOS
    const status = scannerService.getStatus();
    if (platform !== 'win32' && !status.hasScanimageCmd) {
      return res.status(200).json({
        success: false,
        message: 'scanimage utility not found. Please install SANE package on your system.',
        installInstructions: 'Run: sudo apt-get install sane-utils',
        checkCommand: 'After installation, check for scanners with: scanimage -L',
        data: []
      });
    }
    
    const scanners = await scannerService.listScanners();
    
    // If no scanners found, provide helpful information
    if (scanners.length === 0) {
      let message = 'No scanners detected.';
      let installInstructions = '';
      
      if (platform !== 'win32') {
        installInstructions = 'Check that your scanner is connected and recognized with: scanimage -L';
      } else {
        installInstructions = 'Ensure your scanner is properly connected and drivers are installed.';
      }
      
      return res.status(200).json({
        success: false,
        message,
        installInstructions,
        data: []
      });
    }
    
    res.status(200).json({
      success: true,
      count: scanners.length,
      data: scanners
    });
  } catch (error) {
    // Provide helpful message if scanimage is not available
    if (error.message && error.message.includes('scanimage utility not available')) {
      return res.status(200).json({
        success: false,
        message: 'scanimage utility not found. Please install SANE package on your system.',
        installInstructions: 'Run: sudo apt-get install sane-utils',
        checkCommand: 'After installation, check for scanners with: scanimage -L',
        data: []
      });
    }
    
    next(error);
  }
};

// @desc    Get recent scans
// @route   GET /api/scan/recent
// @access  Private/AdminTuningDesk/Admin
exports.getRecentScans = async (req, res, next) => {
  try {
    // Get scan history from scanner service
    const recentScans = scannerService.getScanHistory();
    
    res.status(200).json({
      success: true,
      count: recentScans.length,
      data: recentScans
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Select a specific scanner device
// @route   POST /api/scan/select-device
// @access  Private/AdminTuningDesk/Admin
exports.selectScanner = async (req, res, next) => {
  try {
    const { scannerId } = req.body;
    
    if (!scannerId) {
      return next(new ErrorResponse('Scanner ID is required', 400));
    }
    
    // Update the scanner service to use the selected device
    const success = await scannerService.selectScannerDevice(scannerId);
    
    if (!success) {
      return next(new ErrorResponse('Unable to select the specified scanner', 400));
    }
    
    res.status(200).json({
      success: true,
      message: 'Scanner device selected successfully',
      data: {
        scannerId,
        status: scannerService.getStatus()
      }
    });
  } catch (error) {
    next(error);
  }
};
