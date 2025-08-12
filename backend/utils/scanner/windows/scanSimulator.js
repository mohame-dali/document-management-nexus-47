
const EventEmitter = require('events');

/**
 * Windows scanner simulation functionality
 * This class is only used when real scanners are not available
 */
class ScanSimulator extends EventEmitter {
  /**
   * Create a scan simulator instance
   */
  constructor() {
    super();
  }
  
  /**
   * Handle scan operation when no physical scanner is available
   * @param {string} outputPath - Path to save the scan
   * @param {Object} options - Scanning options
   * @returns {Promise<string>} Path to the scan result
   */
  async simulateScan(outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      this.emit('scanError', new Error('No physical scanner detected. Please connect a scanner and install drivers.'));
      reject(new Error('Scanner hardware required. No scan operation performed.'));
    });
  }
}

module.exports = ScanSimulator;
