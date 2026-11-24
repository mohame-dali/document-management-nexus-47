const {
  getScanimagePath,
  getImg2pdfPath,
  getTesseractPath,
  commandExists,
  runCommand,
  CommandTimeoutError,
} = require('../commandRunner');
const { isValidDeviceIdForPlatform, ScannerError } = require('../validation');

/**
 * Provides scanner detection functionality for Linux/macOS via isolated commandRunner (SANE).
 */
class ScannerDetection {
  static async detectScannerTools() {
    const scanimageBin = getScanimagePath();
    const img2pdfBin = getImg2pdfPath();
    const tesseractBin = getTesseractPath();

    const hasScanimageCmd = commandExists(scanimageBin);
    const hasImg2pdfCmd = commandExists(img2pdfBin);
    const hasTesseractCmd = commandExists(tesseractBin);

    return { hasScanimageCmd, hasImg2pdfCmd, hasTesseractCmd };
  }

  static async listScanners() {
    const scanimageBin = getScanimagePath();
    if (!commandExists(scanimageBin)) {
      throw new ScannerError(
        'SCANNER_NOT_FOUND',
        'Utilitaire scanimage introuvable sur le serveur.',
        503
      );
    }

    let result;
    try {
      result = await runCommand(scanimageBin, ['-L'], { timeoutMs: 15000 });
    } catch (error) {
      if (error instanceof CommandTimeoutError) {
        throw new ScannerError('SCAN_TIMEOUT', 'Délai dépassé lors de la détection SANE.', 504);
      }
      const combined = `${error.stderr || ''}\n${error.stdout || ''}`;
      if (/SCANNER_NOT_FOUND|no SANE devices were identified/i.test(combined)) {
        return [];
      }
      console.error('[Scanner][Linux] scanimage -L failed:', combined || error.message);
      throw new ScannerError(
        'SCANNER_NOT_FOUND',
        'Impossible d’interroger les scanners SANE.',
        503
      );
    }

    const stdout = result.stdout || '';
    const scanners = stdout
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const deviceIdMatch = line.match(/device `([^']+)'/);
        const deviceId = deviceIdMatch ? deviceIdMatch[1].trim() : null;

        if (!deviceId || !isValidDeviceIdForPlatform(deviceId, process.platform)) {
          return null;
        }

        const nameMatch = line.match(/is a ([^']+)/i);
        const name = nameMatch ? nameMatch[1].trim() : 'SANE Scanner';
        const lower = line.toLowerCase();
        const type = lower.includes('sheetfed')
          ? 'Sheetfed'
          : lower.includes('adf')
          ? 'ADF'
          : lower.includes('flatbed')
          ? 'Flatbed'
          : 'Scanner';

        return {
          id: deviceId,
          name,
          type,
          status: 'available',
        };
      })
      .filter(Boolean);

    return scanners;
  }

  static async checkScannerExists(deviceId) {
    if (!isValidDeviceIdForPlatform(deviceId, process.platform)) {
      return false;
    }
    const scanners = await this.listScanners();
    return scanners.some((scanner) => scanner.id === deviceId);
  }
}

module.exports = ScannerDetection;
