
/**
 * Scanner status management functionality
 */
class StatusManager {
  constructor() {
    this.isScanning = false;
    this.platform = require('os').platform(); // 'win32', 'darwin', 'linux', etc.
    this.lastScanTime = null;
    this.errorState = null;
    this.scanCount = 0;
    this.supportedFormats = ['pdf', 'jpeg', 'png'];
    this.currentDocumentType = null; // 'incoming' or 'outgoing'
    this.lastOcrSuccess = null; // Track if OCR was successful
    this.scanHistory = []; // Store last 10 scan operations
  }
  
  /**
   * Get scanner status
   * @param {Object} config - Scanner configuration
   * @param {string} deviceId - Current device ID
   * @returns {Object} Scanner status
   */
  getStatus(config, deviceId) {
    return {
      enabled: config.enabled,
      isScanning: this.isScanning,
      deviceId: deviceId || 'Not selected',
      resolution: config.resolution,
      format: config.format,
      platform: this.platform,
      lastScanTime: this.lastScanTime,
      errorState: this.errorState,
      scanCount: this.scanCount,
      supportedFormats: this.supportedFormats,
      simulateMode: config.simulate || false,
      debugMode: config.debug || false,
      ocrEnabled: config.ocrEnabled,
      currentDocumentType: this.currentDocumentType,
      lastOcrSuccess: this.lastOcrSuccess,
      recentScans: this.scanHistory.slice(0, 5) // Return the 5 most recent scans
    };
  }
  
  /**
   * Set scanning state
   * @param {boolean} isScanning - Whether scanner is scanning
   * @param {string} documentType - Type of document being scanned ('incoming' or 'outgoing')
   */
  setScanning(isScanning, documentType = null) {
    this.isScanning = isScanning;
    
    if (documentType) {
      this.currentDocumentType = documentType;
    }
    
    if (isScanning) {
      this.errorState = null;
    } else if (!isScanning && !this.errorState) {
      this.lastScanTime = new Date();
      this.scanCount++;
      
      // Add to scan history
      if (this.currentDocumentType) {
        this.scanHistory.unshift({
          timestamp: new Date(),
          documentType: this.currentDocumentType,
          success: true
        });
        
        // Limit history to last 10 items
        if (this.scanHistory.length > 10) {
          this.scanHistory.pop();
        }
      }
    }
  }
  
  /**
   * Record a scan error
   * @param {Error} error - Error object 
   */
  setError(error) {
    this.errorState = {
      message: error.message,
      timestamp: new Date(),
      code: error.code || 'SCAN_ERROR'
    };
    this.isScanning = false;
    
    // Add to scan history
    this.scanHistory.unshift({
      timestamp: new Date(),
      documentType: this.currentDocumentType,
      success: false,
      error: error.message
    });
    
    // Limit history to last 10 items
    if (this.scanHistory.length > 10) {
      this.scanHistory.pop();
    }
  }
  
  /**
   * Set OCR processing result
   * @param {boolean} success - Whether OCR processing was successful
   */
  setOcrResult(success) {
    this.lastOcrSuccess = {
      success: success,
      timestamp: new Date()
    };
  }
  
  /**
   * Clear the error state
   */
  clearError() {
    this.errorState = null;
  }
  
  /**
   * Get scanning state
   * @returns {boolean} Current scanning state
   */
  getScanning() {
    return this.isScanning;
  }
  
  /**
   * Get platform information
   * @returns {string} Platform identifier
   */
  getPlatform() {
    return this.platform;
  }
  
  /**
   * Reset scan count
   */
  resetScanCount() {
    this.scanCount = 0;
  }
  
  /**
   * Get scan history
   * @returns {Array} Recent scan operations
   */
  getScanHistory() {
    return this.scanHistory;
  }
}

module.exports = StatusManager;
