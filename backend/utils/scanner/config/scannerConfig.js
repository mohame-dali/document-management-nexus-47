
const fs = require('fs');
const path = require('path');

/**
 * Scanner configuration utility
 */
class ScannerConfig {
  constructor() {
    // Configuration from environment variables
    this.uploadDir = process.env.UPLOAD_PATH || './uploads';
    this.tempDir = path.join(this.uploadDir, 'temp');
    
    // Scanner configuration from environment
    this.scannerEnabled = process.env.SCANNER_ENABLED === 'true';
    this.scannerDeviceId = process.env.SCANNER_DEVICE_ID || '';
    this.scannerResolution = process.env.SCANNER_RESOLUTION || '300';
    this.scannerFormat = (process.env.SCANNER_FORMAT || 'PDF').toLowerCase();
    
    // Supported formats
    this.supportedFormats = ['pdf', 'jpeg', 'png'];
    
    // Format validation and correction
    if (!this.supportedFormats.includes(this.scannerFormat.toLowerCase())) {
      console.warn(`Unsupported scanner format: ${this.scannerFormat}. Defaulting to PDF.`);
      this.scannerFormat = 'pdf';
    }
    
    // Ensure directories exist
    this._ensureDirectories();
  }

  /**
   * Create necessary directories
   */
  _ensureDirectories() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  
  /**
   * Get current scanner configuration
   */
  getConfig() {
    return {
      enabled: this.scannerEnabled,
      deviceId: this.scannerDeviceId,
      resolution: this.scannerResolution,
      format: this.scannerFormat,
      uploadDir: this.uploadDir,
      tempDir: this.tempDir,
      supportedFormats: this.supportedFormats
    };
  }
  
  /**
   * Update scanner configuration
   * @param {Object} config - New configuration values
   */
  updateConfig(config) {
    if (config.deviceId) {
      this.scannerDeviceId = config.deviceId;
    }
    
    if (config.resolution) {
      this.scannerResolution = config.resolution;
    }
    
    if (config.format && this.supportedFormats.includes(config.format.toLowerCase())) {
      this.scannerFormat = config.format.toLowerCase();
    }
    
    if (typeof config.enabled === 'boolean') {
      this.scannerEnabled = config.enabled;
    }
  }
}

module.exports = ScannerConfig;
