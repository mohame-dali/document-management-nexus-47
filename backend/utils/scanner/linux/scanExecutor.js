
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);
const PdfConverter = require('./pdfConverter');

/**
 * Handles scan execution for Linux/macOS
 */
class ScanExecutor {
  /**
   * Execute a scan job
   * @param {Object} options - Scan options
   * @param {Object} context - Scanner context
   * @returns {Promise<string>} - Path to the scanned document
   */
  static async executeScan(options, context) {
    const {
      format,
      resolution,
      documentType,
      userId,
      scannerDevice,
      outputPath,
      tempDir,
      hasScanimageCmd,
      hasImg2pdfCmd,
      scannerEnabled
    } = options;
    
    const emit = context.emit.bind(context);
    
    // Check if scanner hardware is available
    if (!scannerEnabled || !hasScanimageCmd) {
      emit('scanError', new Error('Scanner hardware required. No scan operation performed.'));
      return Promise.reject(new Error('Scanner hardware required. No scan operation performed.'));
    }
    
    // For PDF output, we need to scan to JPEG first and then convert
    if (format.toLowerCase() === 'pdf') {
      return this.scanToPdf(options, context);
    } else {
      return this.scanToImage(options, context);
    }
  }
  
  /**
   * Scan directly to image format (JPEG, PNG)
   * @param {Object} options - Scan options
   * @param {Object} context - Scanner context
   * @returns {Promise<string>} - Path to the scanned image
   */
  static scanToImage(options, context) {
    const {
      format,
      resolution,
      scannerDevice,
      outputPath,
      userId,
      documentType
    } = options;
    
    const emit = context.emit.bind(context);
    
    // Escape device name for shell command
    const sanitizedScannerName = scannerDevice.replace(/`/g, '').replace(/'/g, '').replace(/"/g, '\\"');
    
    // Special handling for Panasonic scanners which may need different options
    const isPanasonic = sanitizedScannerName.includes('panamfs');
    
    let scanCommand;
    if (isPanasonic) {
      scanCommand = `scanimage --device="${sanitizedScannerName}" --format=${format.toLowerCase()} --resolution=${resolution} --mode Color > "${outputPath}"`;
    } else {
      scanCommand = `scanimage --device="${sanitizedScannerName}" --format=${format.toLowerCase()} --resolution=${resolution} --mode Color > "${outputPath}"`;
    }
    
    emit('scanProgress', { status: 'starting', message: 'Starting scan process' });
    console.log(`Executing scan command: ${scanCommand}`);
    
    return new Promise((resolve, reject) => {
      // Set timeout for scan command execution
      const scanTimeout = setTimeout(() => {
        reject(new Error('Scan command timed out - check scanner connection and try again'));
      }, 120000); // 2 minutes for scan command
      
      exec(scanCommand, { timeout: 120000 }, (scanError, stdout, stderr) => {
        clearTimeout(scanTimeout);
        if (scanError) {
          emit('scanError', scanError);
          console.error('Error during scanning:', scanError);
          console.error('stderr:', stderr);
          console.error('stdout:', stdout);
          return reject(new Error(`Scanning failed: ${scanError.message}`));
        }
        
        // Check if the file was created and has content
        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
          const error = new Error('Scan completed but no output file was created. Check scanner connection.');
          emit('scanError', error);
          return reject(error);
        }
        
        emit('scanComplete', { filePath: outputPath, userId, documentType });
        console.log(`Scan complete: ${path.basename(outputPath)}`);
        resolve(outputPath);
      });
    });
  }
  
  /**
   * Scan to JPEG and then convert to PDF
   * @param {Object} options - Scan options
   * @param {Object} context - Scanner context
   * @returns {Promise<string>} - Path to the scanned PDF
   */
  static async scanToPdf(options, context) {
    const {
      resolution,
      scannerDevice,
      outputPath,
      tempDir,
      userId,
      documentType,
      hasImg2pdfCmd
    } = options;
    
    const emit = context.emit.bind(context);
    const jpegFilePathPattern = path.join(tempDir, `scanned_page_%d.jpg`);
    
    // Escape device name for shell command
    const sanitizedScannerName = scannerDevice.replace(/`/g, '').replace(/'/g, '').replace(/"/g, '\\"');
    
    // Special handling for Panasonic scanners
    const isPanasonic = sanitizedScannerName.includes('panamfs');
    
    let scanCommand;
    if (isPanasonic) {
      // Panasonic scanners might need specific options
      scanCommand = `scanimage --device="${sanitizedScannerName}" --format=jpeg --resolution=${resolution} --mode Color --batch="${jpegFilePathPattern}"`;
    } else {
      scanCommand = `scanimage --device="${sanitizedScannerName}" --format=jpeg --resolution=${resolution} --mode Color --batch="${jpegFilePathPattern}"`;
    }
    
    // Build and execute scan command with progress reporting
    emit('scanProgress', { status: 'starting', message: 'Starting multi-page scan' });
    console.log(`Executing scan command: ${scanCommand}`);
    
    return new Promise((resolve, reject) => {
      // Set timeout for scan command execution
      const scanTimeout = setTimeout(() => {
        reject(new Error('Multi-page scan command timed out - check scanner connection and try again'));
      }, 180000); // 3 minutes for multi-page scan
      
      exec(scanCommand, { timeout: 180000 }, async (scanError, stdout, stderr) => {
        clearTimeout(scanTimeout);
        if (scanError) {
          emit('scanError', scanError);
          console.error('Error during scanning:', scanError);
          console.error('stderr:', stderr);
          console.error('stdout:', stdout);
          return reject(new Error(`Scanning failed: ${scanError.message}`));
        }
        
        try {
          emit('scanProgress', { status: 'processing', message: 'Converting scanned images to PDF' });
          
          // List of scanned JPEG files
          const jpegFiles = fs.readdirSync(tempDir)
            .filter(file => file.startsWith('scanned_page_') && file.endsWith('.jpg'))
            .map(file => path.join(tempDir, file))
            .sort(); // Ensure pages are in order
          
          if (jpegFiles.length === 0) {
            return reject(new Error('No scanned files were created. Check scanner connection.'));
          }
          
          console.log(`Found ${jpegFiles.length} scanned pages`);
          
          // Convert JPEG files to PDF
          if (hasImg2pdfCmd) {
            await PdfConverter.convertWithImg2pdf(jpegFiles, outputPath);
            console.log(`PDF created using img2pdf: ${outputPath}`);
          } else {
            await PdfConverter.convertWithPdfKit(jpegFiles, outputPath);
            console.log(`PDF created using PDFKit: ${outputPath}`);
          }
          
          emit('scanComplete', { filePath: outputPath, userId, documentType, pageCount: jpegFiles.length });
          console.log(`Multi-page scan complete: ${path.basename(outputPath)} with ${jpegFiles.length} pages`);
          resolve(outputPath);
        } catch (error) {
          emit('scanError', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Perform OCR on a PDF document
   * @param {string} filePath - Path to the PDF file
   * @param {boolean} hasTesseractCmd - Whether tesseract is available
   * @returns {Promise<string>} - Extracted text
   */
  static async performOCR(filePath, hasTesseractCmd) {
    if (!hasTesseractCmd) {
      console.warn('Tesseract OCR not available, skipping OCR');
      return null;
    }

    try {
      const tempTextFile = filePath.replace(/\.[^/.]+$/, '') + '.txt';
      const ocrCommand = `tesseract "${filePath}" "${filePath.replace(/\.[^/.]+$/, '')}" -l ara+fra+eng`;
      
      console.log(`Executing OCR command: ${ocrCommand}`);
      await execAsync(ocrCommand);
      
      if (fs.existsSync(tempTextFile)) {
        const extractedText = fs.readFileSync(tempTextFile, 'utf8');
        fs.unlinkSync(tempTextFile); // Clean up temp file
        return extractedText;
      }
      
      return null;
    } catch (error) {
      console.error('OCR processing error:', error);
      return null;
    }
  }
}

module.exports = ScanExecutor;
