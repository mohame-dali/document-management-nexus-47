
const mainControllers = require('./scan/mainControllers');
const documentScanController = require('./scan/documentScanController');

// Main scanner functions
exports.startScan = mainControllers.startScan;
exports.getScannerStatus = mainControllers.getScannerStatus;
exports.listScanners = mainControllers.listScanners;
exports.getRecentScans = mainControllers.getRecentScans;
exports.selectScanner = mainControllers.selectScanner;

// Document scanning functions
exports.scanForDocument = documentScanController.scanForDocument;
exports.scanTemporaryDocument = documentScanController.scanTemporaryDocument;
exports.getDocumentScan = documentScanController.getDocumentScan;
