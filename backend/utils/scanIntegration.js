
const scannerService = require('./scanner');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);
const { getNextSerialNumber, createYearFolder, getDocumentPath } = require('./documentHelper');
const { extractTextFromPDF } = require('./ocrProcessor');

/**
 * Handles document scanning and preparation for document creation
 * @param {Object} options - Scanning options
 * @param {string} options.documentType - 'incoming' or 'outgoing'
 * @param {number} options.year - Document year
 * @param {Object} options.user - User object
 * @param {string} options.format - Output format (pdf, jpeg, png)
 * @param {number} options.resolution - Scan resolution
 * @returns {Promise<Object>} Scan result with file path and OCR text
 */
exports.scanForDocument = async (options) => {
  try {
    const { documentType, year, user, format = 'pdf', resolution = 300 } = options;
    
    console.log(`Starting scan for document type: ${documentType}, format: ${format}, year: ${year}`);
    
    // Validate inputs
    if (!documentType || !['incoming', 'outgoing'].includes(documentType)) {
      throw new Error('Invalid document type. Must be "incoming" or "outgoing"');
    }
    
    if (!user || !user.id) {
      throw new Error('Valid user object is required');
    }
    
    // Auto-detect scanner if needed
    const status = scannerService.getStatus();
    if (!status.deviceId || status.deviceId === 'Not selected') {
      console.log('No scanner selected, attempting auto-detection');
      const detected = await scannerService.autoDetectScanner();
      if (!detected) {
        throw new Error('No physical scanner detected. Please connect a scanner and install proper drivers.');
      }
    }
    
    // Start scan job to temporary location first
    const scanOptions = {
      documentType,
      format,
      resolution,
      userId: user.id
    };
    
    let tempFilePath;
    try {
      tempFilePath = await scannerService.startScan(scanOptions);
      console.log('Temporary scan file created at:', tempFilePath);
    } catch (scanError) {
      console.error('Scan operation failed:', scanError);
      throw new Error(`Scan operation failed: ${scanError.message}`);
    }
    
    // Get next serial number for the document type and year
    const serialNumber = await getNextSerialNumber(year, documentType);
    console.log('Generated serial number:', serialNumber, 'for year:', year);
    
    // Define the final folder path based on document type and year
    const finalFolderPath = getDocumentPath(documentType, year);
    await createYearFolder(finalFolderPath);
    console.log('Final folder path:', finalFolderPath);
    
    // Create a new filename based on serial number and format
    const fileExt = format === 'pdf' ? '.pdf' : `.${format.toLowerCase()}`;
    const newFilename = `${serialNumber}${fileExt}`;
    const newFilePath = path.join(finalFolderPath, newFilename);
    console.log('Target file path:', newFilePath);
    
    // Ensure the source file exists before moving
    if (!fs.existsSync(tempFilePath)) {
      throw new Error(`Source scan file does not exist: ${tempFilePath}`);
    }
    
    // Ensure the destination directory exists
    if (!fs.existsSync(path.dirname(newFilePath))) {
      fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
      console.log('Created destination directory:', path.dirname(newFilePath));
    }
    
    // Copy the file to the final location with error handling
    try {
      fs.copyFileSync(tempFilePath, newFilePath);
      console.log('Copied scan file from', tempFilePath, 'to', newFilePath);
    } catch (copyError) {
      console.error('Error copying scan file:', copyError);
      throw new Error(`Failed to copy scan file: ${copyError.message}`);
    }
    
    // Verify the copy was successful
    if (!fs.existsSync(newFilePath)) {
      throw new Error('Failed to copy scan file to final location');
    }
    
    const stats = fs.statSync(newFilePath);
    console.log('File copied successfully, size:', stats.size, 'bytes');
    
    // Clean up the temporary file
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log('Cleaned up temporary file:', tempFilePath);
      }
    } catch (cleanupError) {
      console.warn('Could not clean up temporary file:', cleanupError.message);
    }
    
    // Create relative path for the database - ensure consistent format
    const docTypeFolder = documentType === 'incoming' ? 'Incoming-Doc' : 'Outgoing-Doc';
    const scannedDocumentPath = `courrier/${year}/${docTypeFolder}/${newFilename}`;
    console.log('Generated relative path for database:', scannedDocumentPath);
    
    // Extract OCR text if it's a PDF
    let ocrText = null;
    if (fileExt.toLowerCase() === '.pdf') {
      console.log('Extracting Arabic text from PDF with enhanced OCR');
      try {
        ocrText = await extractTextFromPDF(newFilePath, 'ara+fra+eng');
        console.log('OCR extraction completed, text length:', ocrText ? ocrText.length : 0);
        
        if (ocrText && ocrText.length > 0) {
          console.log('OCR text sample:', ocrText.substring(0, 200));
        } else {
          console.log('No OCR text extracted from the document');
        }
      } catch (ocrError) {
        console.error('OCR extraction error:', ocrError);
        // Don't fail the entire operation if OCR fails
      }
    }
    
    return {
      success: true,
      serialNumber,
      filePath: scannedDocumentPath,
      year,
      ocrText: ocrText || '',
      format: fileExt.replace('.', '')
    };
  } catch (error) {
    console.error('Scan integration error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Scans a document and returns the temporary file path
 * Useful for scanning without immediately creating a document
 * @param {Object} options - Scanning options
 * @returns {Promise<Object>} Scan result
 */
exports.scanDocument = async (options) => {
  try {
    const { documentType, format = 'pdf', resolution = 300, userId } = options;
    
    console.log(`Starting temporary scan for document type: ${documentType}, format: ${format}`);
    
    // Validate inputs
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Auto-detect scanner if needed
    const status = scannerService.getStatus();
    if (!status.deviceId || status.deviceId === 'Not selected') {
      console.log('No scanner selected for temporary document, attempting auto-detection');
      try {
        const detected = await scannerService.autoDetectScanner();
        if (!detected) {
          throw new Error('No physical scanner detected. Please connect a scanner, install proper drivers, and refresh the scanner list.');
        }
      } catch (detectionError) {
        throw new Error(`Scanner detection failed: ${detectionError.message}. Please check scanner connection and drivers.`);
      }
    }
    
    // Start scan job with timeout
    let tempFilePath;
    try {
      const scanPromise = scannerService.startScan({
        documentType,
        format,
        resolution,
        userId
      });
      
      // Add timeout to prevent hanging - increased for slow scanners
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Scan operation timed out')), 180000); // 3 minutes
      });
      
      tempFilePath = await Promise.race([scanPromise, timeoutPromise]);
      console.log('Temporary scan completed:', tempFilePath);
    } catch (scanError) {
      console.error('Temporary scan operation failed:', scanError);
      throw new Error(`Scan operation failed: ${scanError.message}`);
    }
    
    // Extract OCR text if it's a PDF
    let ocrText = null;
    if (format.toLowerCase() === 'pdf' && fs.existsSync(tempFilePath)) {
      try {
        console.log('Extracting Arabic text from temporary PDF with enhanced OCR');
        ocrText = await extractTextFromPDF(tempFilePath, 'ara+fra+eng');
        console.log('OCR extraction completed for temporary scan, text length:', ocrText ? ocrText.length : 0);
        
        if (ocrText && ocrText.length > 0) {
          console.log('OCR text sample from temporary scan:', ocrText.substring(0, 200));
        } else {
          console.log('No OCR text extracted from temporary scan');
        }
      } catch (ocrError) {
        console.error('OCR extraction error for temporary document:', ocrError);
        // Don't fail the entire operation if OCR fails
      }
    }
    
    return {
      success: true,
      filePath: tempFilePath,
      format,
      ocrText: ocrText || ''
    };
  } catch (error) {
    console.error('Document scan error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check if scanner integration is working
 * @returns {Promise<Object>} Status of scanner integration
 */
exports.checkScannerStatus = async () => {
  try {
    // Get scanner status
    const status = scannerService.getStatus();
    
    // Try to list scanners
    const scanners = await scannerService.listScanners();
    
    return {
      success: true,
      status,
      scanners,
      scannersDetected: scanners.length > 0
    };
  } catch (error) {
    console.error('Scanner status check error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
