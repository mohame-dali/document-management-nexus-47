
// Main scanner functions
const mainControllers = require('./mainControllers');
const documentScanController = require('./documentScanController');

module.exports = {
  // Main controllers
  startScan: mainControllers.startScan,
  getScannerStatus: mainControllers.getScannerStatus,
  listScanners: mainControllers.listScanners, 
  getRecentScans: mainControllers.getRecentScans,
  
  // Document controllers
  scanForDocument: documentScanController.scanForDocument,
  scanTemporaryDocument: documentScanController.scanTemporaryDocument,
  
  // Additional scanner utility function
  selectScanner: mainControllers.selectScanner
};
