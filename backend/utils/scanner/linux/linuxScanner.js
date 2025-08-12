
const ScannerBase = require('../scannerBase');
const ScannerDetection = require('./scannerDetection');
const ScanExecutor = require('./scanExecutor');
const ScanSimulator = require('./scanSimulator');

/**
 * Linux/macOS specific scanner implementation using scanimage
 */
class LinuxScanner extends ScannerBase {
  constructor() {
    super();
    this.hasScanimageCmd = false;
    this.hasImg2pdfCmd = false;
    this.hasTesseractCmd = false;
    this.toolsDetected = false;
    this.toolsDetectionPromise = this.detectScannerTools();
  }
  
  /**
   * Detect available scanner tools
   */
  async detectScannerTools() {
    try {
      const tools = await ScannerDetection.detectScannerTools();
      this.hasScanimageCmd = tools.hasScanimageCmd;
      this.hasImg2pdfCmd = tools.hasImg2pdfCmd;
      this.hasTesseractCmd = tools.hasTesseractCmd;
      this.toolsDetected = true;
      
      console.log('Scanner tools detection completed:', 
        `scanimage=${this.hasScanimageCmd}`, 
        `img2pdf=${this.hasImg2pdfCmd}`,
        `tesseract=${this.hasTesseractCmd}`);
    } catch (error) {
      console.error('Error detecting scanner tools:', error);
      this.toolsDetected = true; // Mark as completed even on error
    }
  }
  
  /**
   * Ensure scanner tools are detected before proceeding
   */
  async ensureToolsDetected() {
    if (!this.toolsDetected) {
      await this.toolsDetectionPromise;
    }
  }
  
  /**
   * Get the default scanner device
   * @returns {Promise<string>} Scanner device ID
   */
  async getDefaultScanner() {
    try {
      // Ensure tools are detected first
      await this.ensureToolsDetected();
      
      const currentDeviceId = this.deviceManager.getCurrentDeviceId();
      if (currentDeviceId) {
        // Verify the device still exists
        const deviceExists = await ScannerDetection.checkScannerExists(currentDeviceId);
        if (deviceExists) {
          console.log(`Using saved scanner device: ${currentDeviceId}`);
          return currentDeviceId;
        } else {
          console.log(`Saved scanner ${currentDeviceId} no longer available`);
        }
      }
      
      if (!this.hasScanimageCmd) {
        console.warn('scanimage not detected, please install SANE package');
        throw new Error('scanimage utility not available');
      }

      return await ScannerDetection.getDefaultScanner(currentDeviceId);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Start a scan on Linux/macOS using scanimage
   */
  async startScan(options = {}) {
    // Ensure tools are detected first
    await this.ensureToolsDetected();
    
    if (this.statusManager.getScanning()) {
      throw new Error('A scan job is already in progress.');
    }
    
    try {
      this.statusManager.setScanning(true);
      
      const config = this.config.getConfig();
      const format = options.format || config.format;
      const resolution = options.resolution || config.resolution;
      const documentType = options.documentType || 'document';
      const userId = options.userId || 'system';
      
      // Generate a unique filename
      const timestamp = Date.now();
      const uniqueId = Math.round(Math.random() * 1E9);
      const filename = `${documentType}-${userId}-${timestamp}-${uniqueId}.${format.toLowerCase()}`;
      const outputPath = require('path').join(config.uploadDir, filename);
      
      // Emit event to notify listeners that scan is starting
      this.emit('scanStart', { userId, documentType });
      
      // Check if scanimage is available
      if (!this.hasScanimageCmd) {
        const error = new Error('scanimage utility not available, please install SANE package');
        this.emit('scanError', error);
        this.statusManager.setScanning(false);
        throw error;
      }
      
      // Get real scanner hardware
      const scannerDevice = await this.getDefaultScanner();
      
      console.log(`Starting scan job with device: ${scannerDevice}`);
      
      const scanOptions = {
        format,
        resolution,
        documentType,
        userId,
        scannerDevice,
        outputPath,
        tempDir: config.tempDir,
        hasScanimageCmd: this.hasScanimageCmd,
        hasImg2pdfCmd: this.hasImg2pdfCmd,
        hasTesseractCmd: this.hasTesseractCmd,
        scannerEnabled: config.enabled
      };
      
      const result = await ScanExecutor.executeScan(scanOptions, this);
      
      // Perform OCR if configured and available
      if (config.ocrEnabled && this.hasTesseractCmd && format.toLowerCase() === 'pdf') {
        this.emit('scanProgress', { status: 'ocr', message: 'Performing OCR on scanned document' });
        try {
          const ocrText = await ScanExecutor.performOCR(result, this.hasTesseractCmd);
          this.emit('ocrComplete', { success: !!ocrText });
        } catch (ocrError) {
          console.error('OCR processing error:', ocrError);
        }
      }
      
      this.statusManager.setScanning(false);
      return result;
    } catch (error) {
      this.statusManager.setScanning(false);
      this.emit('scanError', error);
      throw error;
    }
  }

  /**
   * List available scanners on Linux/macOS
   * @returns {Promise<Array>} List of available scanners
   */
  async listScanners() {
    try {
      // Ensure tools are detected first - wait for detection promise to complete
      await this.ensureToolsDetected();
      
      if (!this.hasScanimageCmd) {
        console.error('scanimage utility not available - you need to install SANE package');
        throw new Error('scanimage utility not available');
      }
      
      console.log('Listing available scanners...');
      const scanners = await ScannerDetection.listScanners();
      
      // Emit event for tracking
      this.emit('devicesListed', { count: scanners.length });
      
      return scanners;
    } catch (error) {
      console.error('Error listing scanners:', error);
      throw error; // Throw error to properly handle it upstream
    }
  }
}

module.exports = LinuxScanner;
