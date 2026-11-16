const mainControllers = require('./mainControllers');
const documentScanController = require('./documentScanController');

module.exports = {
  // Main scanner operations
  startScan: mainControllers.startScan,
  getScannerStatus: mainControllers.getScannerStatus,
  listScanners: mainControllers.listScanners,
  getRecentScans: mainControllers.getRecentScans,
  selectScanner: mainControllers.selectScanner,

  // Document & job lifecycle operations
  scanForDocument: documentScanController.scanForDocument,
  scanTemporaryDocument: documentScanController.scanTemporaryDocument,
  getDocumentScan: documentScanController.getDocumentScan,
  getScanJobStatus: documentScanController.getScanJobStatus,
  cancelScanJob: documentScanController.cancelScanJob,
  getScanFile: documentScanController.getScanFile,
  getScanPageThumbnail: documentScanController.getScanPageThumbnail,
  deleteScanFile: documentScanController.deleteScanFile,
  getScanMetadata: documentScanController.getScanMetadata,
};
