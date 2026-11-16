const LinuxScanner = require('./linux');
const WindowsScanner = require('./windows');

/**
 * Creates the appropriate scanner service based on the detected platform.
 */
function createScannerService() {
  const platform = process.platform;
  console.log(`[Scanner] Detected platform: ${platform}`);

  const scannerService = platform === 'win32' ? new WindowsScanner() : new LinuxScanner();

  registerEventHandlers(scannerService);
  autoDetectScannerOnStartup(scannerService);

  return scannerService;
}

function registerEventHandlers(scannerService) {
  scannerService.on('scanStart', (data) => {
    console.log(`[Scanner] Scan started: ${JSON.stringify(data)}`);
  });

  scannerService.on('scanProgress', (data) => {
    console.log(`[Scanner] Scan progress: ${JSON.stringify(data)}`);
  });

  scannerService.on('scanComplete', (data) => {
    console.log(`[Scanner] Scan completed: scanId=${data?.scanId}, pages=${data?.pageCount || 1}`);
  });

  scannerService.on('scanError', (error) => {
    console.error(`[Scanner] Scan error [${error.code || 'SCAN_FAILED'}]: ${error.message}`);
  });

  scannerService.on('deviceSelected', (data) => {
    console.log(`[Scanner] Device selected: ${JSON.stringify(data)}`);
  });

  scannerService.on('devicesListed', (data) => {
    console.log(`[Scanner] Devices listed: ${data.count} real device(s)`);
  });
}

async function autoDetectScannerOnStartup(scannerService) {
  try {
    if (!scannerService.getConfig().scannerEnabled) {
      console.log('[Scanner] Module désactivé au démarrage (SCANNER_ENABLED != true)');
      return;
    }

    await scannerService.init();
    const detected = await scannerService.autoDetectScanner();
    if (detected) {
      console.log(
        `[Scanner] Périphérique validé au démarrage : ${scannerService.getDeviceManager().getCurrentDeviceId()}`
      );
    } else {
      console.warn('[Scanner] Aucun scanner physique validé au démarrage.');
    }
  } catch (error) {
    console.warn('[Scanner] Initialisation démarrage :', error.message);
  }
}

const scannerService = createScannerService();
module.exports = scannerService;
