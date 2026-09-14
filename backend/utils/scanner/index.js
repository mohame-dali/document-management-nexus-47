const os = require('os');
const LinuxScanner = require('./linux');
const WindowsScanner = require('./windows');

/**
 * Creates the appropriate scanner service based on the detected platform
 * @returns {Object} Platform-specific scanner service instance
 */
function createScannerService() {
  const platform = os.platform();
  console.log(`Detected platform: ${platform}`);
  
  let scannerService;
  
  try {
    if (platform === 'win32') {
      console.log('Creating Windows scanner service');
      scannerService = new WindowsScanner();
    } else {
      console.log('Creating Linux/macOS scanner service');
      scannerService = new LinuxScanner();
    }
  } catch (error) {
    console.error(`Error creating scanner service for ${platform}:`, error.message);
    // Create a basic instance that will reject all scan attempts
    if (platform === 'win32') {
      scannerService = new WindowsScanner();
    } else {
      scannerService = new LinuxScanner();
    }
  }
  
  // Register event handlers for logging and monitoring
  registerEventHandlers(scannerService);
  
  // Attempt to auto-detect scanner on startup
  autoDetectScannerOnStartup(scannerService);
  
  return scannerService;
}

/**
 * Register event handlers for the scanner service
 * @param {Object} scannerService - Scanner service instance
 */
function registerEventHandlers(scannerService) {
  // Scan lifecycle events
  scannerService.on('scanStart', (data) => {
    console.log(`Scan started: ${JSON.stringify(data)}`);
  });

  scannerService.on('scanProgress', (data) => {
    console.log(`Scan progress: ${JSON.stringify(data)}`);
  });

  scannerService.on('scanComplete', (data) => {
    console.log(`Scan completed: ${JSON.stringify(data)}`);
  });

  scannerService.on('scanError', (error) => {
    console.error(`Scan error: ${error.message}`);
  });
  
  // Device events
  scannerService.on('deviceSelected', (data) => {
    console.log(`Scanner device selected: ${JSON.stringify(data)}`);
  });
  
  scannerService.on('devicesListed', (data) => {
    console.log(`Scanner devices listed: ${data.count} devices found`);
  });

  scannerService.on('ocrComplete', (data) => {
    console.log(`OCR processing completed: ${data.success ? 'success' : 'failed'}`);
  });
}

/**
 * Attempt to auto-detect and select a scanner on startup
 * @param {Object} scannerService - Scanner service instance
 */
async function autoDetectScannerOnStartup(scannerService) {
  try {
    console.log('Attempting to auto-detect scanner...');
    
    // If a scanner device ID is already set, we don't need to auto-detect
    const currentDeviceId = scannerService.getDeviceManager().getCurrentDeviceId();
    
    if (currentDeviceId) {
      console.log(`Using existing scanner device: ${currentDeviceId}`);
      return;
    }
    
    // Otherwise, try to auto-detect a scanner
    try {
      const success = await scannerService.autoDetectScanner();
      
      if (success) {
        console.log('Scanner auto-detection successful');
      } else {
        console.log('Scanner auto-detection did not find any devices');
      }
    } catch (detectionError) {
      console.error('Error during scanner auto-detection:', detectionError.message);
    }
    
  } catch (error) {
    console.error('Error during scanner initialization:', error.message);
  }
}

// Export a singleton instance
const scannerService = createScannerService();
module.exports = scannerService;
