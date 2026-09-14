
/**
 * Windows Scanner implementation
 * Handles scanner operations on Windows systems
 */
const path = require('path');
const fs = require('fs');
const ScannerBase = require('../scannerBase');
const ScannerDetection = require('./scannerDetection');
const ScanExecutor = require('./scanExecutor');
const ScanSimulator = require('./scanSimulator');
const PDFProcessor = require('./pdfProcessor');
const { v4: uuidv4 } = require('uuid');

class WindowsScanner extends ScannerBase {
  constructor() {
    super();
    this.hasWindowsScanTools = false;
    this.simulator = new ScanSimulator();
    
    // Check for Windows scanning tools
    this._detectWIATools();
    
    // Wire up simulator events
    this._setupSimulatorEventForwarding();
  }
  
  /**
   * Detect if Windows WIA tools are available
   * @private
   */
  async _detectWIATools() {
    try {
      this.hasWindowsScanTools = await ScannerDetection.detectWIATools();
      if (!this.hasWindowsScanTools) {
        console.warn('Windows scanning tools not available. Simulated scanner will be used.');
      }
    } catch (error) {
      console.error('Error detecting Windows scanning tools:', error);
      this.hasWindowsScanTools = false;
    }
  }
  
  /**
   * Forward events from the simulator to this instance
   * @private
   */
  _setupSimulatorEventForwarding() {
    ['scanStart', 'scanProgress', 'scanComplete', 'scanError'].forEach(event => {
      this.simulator.on(event, (data) => this.emit(event, data));
    });
  }
  
  /**
   * Generate a temporary file path
   * @param {string} extension - File extension
   * @returns {string} Temporary file path
   * @private
   */
  _generateTempPath(extension) {
    const uuid = uuidv4();
    const tempDir = this.getConfig().tempDir;
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    return path.join(tempDir, `scan_${uuid}${extension}`);
  }
  
  /**
   * Start a scan operation
   * @param {Object} options - Scanning options
   * @returns {Promise<string>} Path to the scanned file
   */
  async startScan(options) {
    try {
      const deviceId = this.getDeviceManager().getCurrentDeviceId();
      const resolution = options.resolution || 300;
      const format = options.format || 'pdf';
      
      // Set status to scanning
      this.getStatusManager().setScanning(true, options.documentType || 'document');
      
      // Emit scan start event
      this.emit('scanStart', { deviceId, options });
      
      // Determine output paths
      const tempImagePath = this._generateTempPath('.png');
      const outputPath = this._generateTempPath(`.${format.toLowerCase()}`);
      
      let scanResult;
      
      // If we have scanning tools and a real device, use it
      if (this.hasWindowsScanTools && deviceId !== 'simulated-scanner') {
        try {
          console.log(`Starting real scan with device: ${deviceId}`);
          
          // Execute the scan with increased timeout
          scanResult = await Promise.race([
            ScanExecutor.executeScan(deviceId, tempImagePath, resolution, {
              colorMode: 'Color',
              documentSource: 'Flatbed'
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Windows scan timeout')), 180000)
            )
          ]);
          
          // Convert to requested format
          await PDFProcessor.processToFormat(scanResult.tempImagePath, outputPath, format);
          
          // Clean up the temp image
          if (fs.existsSync(tempImagePath)) {
            fs.unlinkSync(tempImagePath);
          }
          
        } catch (realScanError) {
          console.error('Real scan failed, falling back to simulation:', realScanError);
          // Fall back to simulation
          scanResult = await this.simulator.simulateScan(outputPath, options);
        }
      } else {
        // Use simulation
        console.log('Using simulated scanner');
        scanResult = await this.simulator.simulateScan(outputPath, options);
      }
      
      // Set status to not scanning
      this.getStatusManager().setScanning(false);
      
      // Emit scan complete event
      this.emit('scanComplete', {
        outputPath,
        format,
        deviceId,
      });
      
      // Add to scan history
      this.getStatusManager().addScanToHistory({
        deviceId,
        timestamp: new Date(),
        outputPath,
        format,
        documentType: options.documentType,
        userId: options.userId
      });
      
      return outputPath;
    } catch (error) {
      // Update status and emit error event
      this.getStatusManager().setScanning(false);
      this.getStatusManager().setError(error);
      this.emit('scanError', error);
      
      throw error;
    }
  }
  
  /**
   * List available scanners
   * @returns {Promise<Array>} List of available scanners
   */
  async listScanners() {
    try {
      // Detect WIA tools again if needed
      if (this.hasWindowsScanTools === null) {
        this.hasWindowsScanTools = await ScannerDetection.detectWIATools();
      }
      
      // Get scanners
      const scanners = await ScannerDetection.listScanners(this.hasWindowsScanTools);
      
      // Emit event with scanner count
      this.emit('devicesListed', { count: scanners.length });
      
      return scanners;
    } catch (error) {
      console.error('Error listing scanners:', error);
      // Return simulated scanner in case of error
      const simulatedScanner = [{
        id: 'simulated-scanner',
        name: 'Simulated Scanner (Error)',
        type: 'Flatbed',
        status: 'available'
      }];
      
      this.emit('devicesListed', { count: simulatedScanner.length });
      return simulatedScanner;
    }
  }
  
  /**
   * Select a specific scanner device
   * @param {string} deviceId - Scanner device ID to use
   * @returns {Promise<boolean>} Whether selection was successful
   */
  async selectScannerDevice(deviceId) {
    try {
      // If device is simulated scanner and we're already in simulation mode
      if (deviceId === 'simulated-scanner') {
        this.getDeviceManager().setCurrentDeviceId(deviceId);
        this.getConfig().updateConfig({ scannerDeviceId: deviceId });
        this.emit('deviceSelected', { deviceId, simulated: true });
        return true;
      }
      
      // Detect WIA tools again if needed
      if (this.hasWindowsScanTools === null) {
        this.hasWindowsScanTools = await ScannerDetection.detectWIATools();
      }
      
      // Check if scanner exists
      const exists = await ScannerDetection.checkScannerExists(deviceId, this.hasWindowsScanTools);
      
      if (!exists) {
        console.warn(`Scanner ${deviceId} does not exist`);
        return false;
      }
      
      // Set current device
      this.getDeviceManager().setCurrentDeviceId(deviceId);
      this.getConfig().updateConfig({ scannerDeviceId: deviceId });
      
      // Emit event
      this.emit('deviceSelected', { deviceId });
      
      return true;
    } catch (error) {
      console.error('Error selecting scanner device:', error);
      return false;
    }
  }
  
  /**
   * Test if the current scanner is working
   * @returns {Promise<boolean>} Whether scanner is working
   */
  async testScanner() {
    const deviceId = this.getDeviceManager().getCurrentDeviceId();
    
    if (deviceId === 'simulated-scanner' || !this.hasWindowsScanTools) {
      // Simulated scanner always works
      return true;
    }
    
    try {
      return await ScanExecutor.testScannerConnection(deviceId);
    } catch (error) {
      console.error('Scanner test failed:', error);
      return false;
    }
  }
}

module.exports = WindowsScanner;
