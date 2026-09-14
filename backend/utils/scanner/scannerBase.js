
const EventEmitter = require('events');
const ScannerConfig = require('./config/scannerConfig');
const DeviceManager = require('./devices/deviceManager');
const StatusManager = require('./status/statusManager');
const os = require('os');
const path = require('path');
const fs = require('fs');

/**
 * Base scanner service class that handles common functionality
 */
class ScannerBase extends EventEmitter {
  constructor() {
    super();
    this.config = new ScannerConfig();
    this.deviceManager = new DeviceManager();
    this.statusManager = new StatusManager();
    
    // Initialize with config values if available
    if (this.config.scannerDeviceId) {
      this.deviceManager.setCurrentDeviceId(this.config.scannerDeviceId);
    }
    
    // Setup custom event listeners
    this.on('scanError', (error) => {
      this.statusManager.setError(error);
      console.error('Scan error:', error.message);
    });
    
    this.on('scanComplete', (result) => {
      this.statusManager.setScanning(false);
      
      // Track OCR results if available
      if (result && result.ocrProcessed !== undefined) {
        this.statusManager.setOcrResult(result.ocrProcessed);
      }
    });
    
    this.on('scanStart', (options) => {
      this.statusManager.setScanning(true, options.documentType);
    });

    this.on('scanProgress', (data) => {
      console.log(`Scan progress: ${JSON.stringify(data)}`);
    });

    // Ensure temp directories exist
    this._ensureTempDirectories();
  }

  /**
   * Ensure temporary directories exist for scanner operations
   */
  _ensureTempDirectories() {
    const tempDirs = [
      this.config.tempDir,
      path.join(this.config.tempDir, 'pages')
    ];

    tempDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created temp directory: ${dir}`);
      }
    });
  }

  /**
   * Get the status of the scanner
   * @returns {Object} Scanner status
   */
  getStatus() {
    return this.statusManager.getStatus(
      this.config.getConfig(),
      this.deviceManager.getCurrentDeviceId()
    );
  }

  /**
   * Auto-detect and set the default scanner
   * @returns {Promise<boolean>} Success status
   */
  async autoDetectScanner() {
    try {
      // Get available scanners
      const scanners = await this.listScanners();
      
      if (scanners.length === 0) {
        console.log('No scanners detected for auto-selection');
        return false;
      }
      
      // Select the first scanner
      const deviceId = scanners[0].id;
      const success = this.deviceManager.selectDevice(deviceId, scanners);
      
      if (success) {
        // Update config with the auto-detected scanner
        this.config.updateConfig({ scannerDeviceId: deviceId });
        this.emit('deviceSelected', { deviceId, auto: true });
        console.log(`Auto-detected and selected scanner: ${deviceId}`);
      }
      
      return success;
    } catch (error) {
      console.error('Error auto-detecting scanner:', error);
      return false;
    }
  }

  /**
   * Select a specific scanner device
   * @param {string} deviceId - The scanner device ID to use
   * @returns {Promise<boolean>} Success status
   */
  async selectScannerDevice(deviceId) {
    try {
      // Get available scanners
      const scanners = await this.listScanners();
      
      // Try to select the device
      const success = this.deviceManager.selectDevice(deviceId, scanners);
      
      if (success) {
        // Update config if device selection was successful
        this.config.updateConfig({ scannerDeviceId: deviceId });
        
        // Emit event for tracking
        this.emit('deviceSelected', { deviceId });
      }
      
      return success;
    } catch (error) {
      console.error('Error selecting scanner device:', error);
      return false;
    }
  }

  /**
   * Get scan history
   * @returns {Array} Recent scan operations
   */
  getScanHistory() {
    return this.statusManager.getScanHistory();
  }

  /**
   * Reset any error state in the scanner
   */
  resetErrorState() {
    this.statusManager.clearError();
  }

  /**
   * Base implementation for starting a scan
   * This should be overridden by platform-specific implementations
   * @param {Object} options - Scanning options
   * @param {string} options.documentType - Type of document ('incoming' or 'outgoing')
   * @param {string} options.format - Output format ('pdf', 'jpeg', 'png')
   * @param {number} options.resolution - Scan resolution
   * @param {string} options.userId - ID of the user initiating the scan
   * @param {string} [options.documentId] - Optional ID of the document being scanned
   * @param {boolean} [options.isTemporary] - Whether this is a temporary scan
   */
  async startScan(options) {
    throw new Error('startScan method must be implemented by subclasses');
  }

  /**
   * Base implementation for listing scanners
   * This should be overridden by platform-specific implementations
   * @returns {Promise<Array>} List of available scanners
   */
  async listScanners() {
    throw new Error('listScanners method must be implemented by subclasses');
  }
  
  /**
   * Get the device manager instance
   * Useful for platform specific implementations
   * @returns {DeviceManager} Device manager instance
   */
  getDeviceManager() {
    return this.deviceManager;
  }
  
  /**
   * Get the status manager instance
   * Useful for platform specific implementations
   * @returns {StatusManager} Status manager instance
   */
  getStatusManager() {
    return this.statusManager;
  }
  
  /**
   * Get the scanner configuration
   * Useful for platform specific implementations
   * @returns {ScannerConfig} Scanner configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get the operating system platform
   * @returns {string} Operating system platform
   */
  getPlatform() {
    return os.platform();
  }
}

module.exports = ScannerBase;
