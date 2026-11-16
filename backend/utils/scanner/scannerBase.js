const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const ScannerConfig = require('./config/scannerConfig');
const DeviceManager = require('./devices/deviceManager');
const StatusManager = require('./status/statusManager');
const { isValidDeviceIdForPlatform, ScannerError } = require('./validation');

/**
 * Base scanner service class that handles common functionality
 */
class ScannerBase extends EventEmitter {
  constructor() {
    super();
    this.config = new ScannerConfig();
    this.deviceManager = new DeviceManager();
    this.statusManager = new StatusManager();
    this._initPromise = null;

    if (this.config.scannerDeviceId) {
      if (isValidDeviceIdForPlatform(this.config.scannerDeviceId)) {
        this.deviceManager.setCurrentDeviceId(this.config.scannerDeviceId);
      } else {
        console.warn(
          `[Scanner] Ignored incompatible SCANNER_DEVICE_ID for ${process.platform}: ${this.config.scannerDeviceId}`
        );
      }
    }

    this.on('scanError', (error) => {
      this.statusManager.setError(error);
      console.error('[Scanner] Scan error:', error.code || 'SCAN_FAILED', error.message);
    });

    this.on('scanComplete', (result) => {
      this.statusManager.setScanning(false);
      if (result && result.ocrProcessed !== undefined) {
        this.statusManager.setOcrResult(result.ocrProcessed);
      }
    });

    this.on('scanStart', (options) => {
      this.statusManager.setScanning(true, options && options.documentType);
    });

    this._ensureTempDirectories();
  }

  _ensureTempDirectories() {
    if (!fs.existsSync(this.config.tempDir)) {
      fs.mkdirSync(this.config.tempDir, { recursive: true });
    }
  }

  async init() {
    if (!this._initPromise) {
      this._initPromise = this._performInit().catch((err) => {
        this._initPromise = null;
        throw err;
      });
    }
    return this._initPromise;
  }

  async _performInit() {
    return true;
  }

  getStatus() {
    return this.statusManager.getStatus(
      this.config.getConfig(),
      this.deviceManager.getCurrentDeviceId()
    );
  }

  /**
   * Validate stored deviceId against current platform format AND live system scanners.
   * Clears invalid/missing IDs and triggers detection when needed.
   */
  async ensureValidDevice() {
    await this.init();

    const currentId = this.deviceManager.getCurrentDeviceId();
    const scanners = await this.listScanners();

    if (!Array.isArray(scanners) || scanners.length === 0) {
      if (currentId) {
        this.deviceManager.clearCurrentDeviceId();
      }
      throw new ScannerError(
        'SCANNER_NOT_FOUND',
        'Aucun scanner physique détecté sur ce système.',
        503
      );
    }

    if (currentId && isValidDeviceIdForPlatform(currentId)) {
      const stillPresent = scanners.some((s) => s.id === currentId);
      if (stillPresent) {
        return currentId;
      }
      console.warn(`[Scanner] Saved device "${currentId}" is no longer connected; re-detecting.`);
    } else if (currentId) {
      console.warn(`[Scanner] Saved device "${currentId}" invalid for ${process.platform}; clearing.`);
    }

    this.deviceManager.clearCurrentDeviceId();
    const selectedId = scanners[0].id;
    const selected = this.deviceManager.selectDevice(selectedId, scanners);
    if (!selected) {
      throw new ScannerError(
        'SCANNER_NOT_FOUND',
        'Aucun scanner valide n’a pu être sélectionné.',
        503
      );
    }

    this.config.updateConfig({ scannerDeviceId: selectedId });
    this.emit('deviceSelected', { deviceId: selectedId, auto: true });
    return selectedId;
  }

  async autoDetectScanner() {
    try {
      await this.init();
      const scanners = await this.listScanners();
      if (!scanners || scanners.length === 0) {
        this.deviceManager.clearCurrentDeviceId();
        return false;
      }

      const currentId = this.deviceManager.getCurrentDeviceId();
      if (currentId && isValidDeviceIdForPlatform(currentId) && scanners.some((s) => s.id === currentId)) {
        return true;
      }

      const deviceId = scanners[0].id;
      const success = this.deviceManager.selectDevice(deviceId, scanners);
      if (success) {
        this.config.updateConfig({ scannerDeviceId: deviceId });
        this.emit('deviceSelected', { deviceId, auto: true });
      }
      return success;
    } catch (error) {
      console.error('[Scanner] Auto-detection error:', error.message);
      return false;
    }
  }

  async selectScannerDevice(deviceId) {
    await this.init();
    if (!isValidDeviceIdForPlatform(deviceId)) {
      throw new ScannerError(
        'INVALID_SCAN_PARAMS',
        'Identifiant de scanner incompatible avec le système courant',
        400
      );
    }

    const scanners = await this.listScanners();
    const success = this.deviceManager.selectDevice(deviceId, scanners);
    if (!success) {
      return false;
    }

    this.config.updateConfig({ scannerDeviceId: deviceId });
    this.emit('deviceSelected', { deviceId });
    return true;
  }

  getScanHistory() {
    return this.statusManager.getScanHistory();
  }

  resetErrorState() {
    this.statusManager.clearError();
  }

  async startScan(_options) {
    throw new Error('startScan method must be implemented by subclasses');
  }

  async listScanners() {
    throw new Error('listScanners method must be implemented by subclasses');
  }

  getDeviceManager() {
    return this.deviceManager;
  }

  getStatusManager() {
    return this.statusManager;
  }

  getConfig() {
    return this.config;
  }

  getPlatform() {
    return process.platform;
  }
}

module.exports = ScannerBase;
