const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ScannerBase = require('../scannerBase');
const ScannerDetection = require('./scannerDetection');
const ScanExecutor = require('./scanExecutor');
const {
  validateScanOptions,
  getContentTypeForFormat,
  ScannerError,
} = require('../validation');

/**
 * Linux/macOS specific scanner implementation using SANE (scanimage) — real hardware only.
 */
class LinuxScanner extends ScannerBase {
  constructor() {
    super();
    this.hasScanimageCmd = false;
    this.hasImg2pdfCmd = false;
    this.hasTesseractCmd = false;
    this.toolsDetected = false;
  }

  async _performInit() {
    try {
      const tools = await ScannerDetection.detectScannerTools();
      this.hasScanimageCmd = tools.hasScanimageCmd;
      this.hasImg2pdfCmd = tools.hasImg2pdfCmd;
      this.hasTesseractCmd = tools.hasTesseractCmd;
      this.toolsDetected = true;
    } catch (error) {
      console.error('[Scanner][Linux] Error detecting scanner tools:', error.message);
      this.toolsDetected = true;
    }
    return this.toolsDetected;
  }

  _buildOutputPath(scanId, format) {
    const ext = format === 'jpg' ? 'jpg' : format;
    if (!fs.existsSync(this.config.tempDir)) {
      fs.mkdirSync(this.config.tempDir, { recursive: true });
    }
    return path.join(this.config.tempDir, `scan_${scanId}.${ext}`);
  }

  async startScan(options = {}) {
    if (!this.config.scannerEnabled) {
      throw new ScannerError(
        'SCANNER_NOT_FOUND',
        'Le module de numérisation est désactivé sur ce serveur (SCANNER_ENABLED=false).',
        503
      );
    }

    const validated = validateScanOptions(options);
    const ownerId = options.userId || 'system';
    const documentType = options.documentType || 'temp';

    const job = this.statusManager.createJob({
      scanId: validated.scanId || uuidv4(),
      ownerId,
      documentType,
      format: validated.format,
      resolution: validated.resolution,
    });

    let lockedDeviceId = null;

    try {
      this.statusManager.updateJob(job.scanId, { stage: 'detecting', page: 0 });
      await this.init();

      if (!this.hasScanimageCmd) {
        throw new ScannerError(
          'SCANNER_NOT_FOUND',
          'Utilitaire scanimage introuvable sur le serveur.',
          503
        );
      }

      const deviceId = await this.ensureValidDevice();
      this.statusManager.updateJob(job.scanId, { deviceId });

      if (job.cancelled || job.abortController.signal.aborted) {
        throw new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
      }

      // Per-device lock
      this.statusManager.acquireDeviceLock(deviceId, job.scanId);
      lockedDeviceId = deviceId;

      const jobTempDir = path.join(this.config.tempDir, job.scanId);
      fs.mkdirSync(jobTempDir, { recursive: true });

      this.statusManager.updateJob(job.scanId, {
        stage: 'preparing',
        jobTempDir,
      });
      this.statusManager.setScanning(true, documentType);
      this.emit('scanStart', { scanId: job.scanId, deviceId, userId: ownerId, documentType });

      const outputPath = this._buildOutputPath(job.scanId, validated.format);
      const timeoutMs = Number(options.timeoutMs) || 120000;

      this.statusManager.updateJob(job.scanId, { stage: 'scanning', page: 0 });

      const { pageCount } = await ScanExecutor.executeScan({
        scannerDevice: deviceId,
        format: validated.format,
        resolution: validated.resolution,
        colorMode: validated.colorMode,
        outputPath,
        jobTempDir,
        hasScanimageCmd: this.hasScanimageCmd,
        hasImg2pdfCmd: this.hasImg2pdfCmd,
        scannerEnabled: this.config.scannerEnabled,
        timeoutMs,
        signal: job.abortController.signal,
        onPage: (pageNum) => {
          this.statusManager.updateJob(job.scanId, { stage: 'scanning', page: pageNum });
          this.emit('scanProgress', { scanId: job.scanId, stage: 'scanning', page: pageNum });
        },
        onBeforeProcessing: (totalPages) => {
          this.statusManager.updateJob(job.scanId, { stage: 'processing', page: totalPages });
          this.emit('scanProgress', { scanId: job.scanId, stage: 'processing', page: totalPages });
        },
      });

      if (job.cancelled || job.abortController.signal.aborted) {
        throw new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
      }

      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        throw new ScannerError('SCAN_FAILED', 'Le fichier numérisé produit est vide.', 500);
      }

      this.statusManager.updateJob(job.scanId, {
        stage: 'done',
        page: pageCount,
        filePath: outputPath,
        mimeType: getContentTypeForFormat(validated.format),
        jobTempDir: null,
      });

      this.statusManager.releaseDeviceLock(lockedDeviceId, job.scanId);
      lockedDeviceId = null;

      this.emit('scanComplete', {
        scanId: job.scanId,
        outputPath,
        format: validated.format,
        deviceId,
        pageCount,
      });

      this.statusManager.addScanToHistory({
        scanId: job.scanId,
        deviceId,
        timestamp: new Date(),
        outputPath,
        format: validated.format,
        documentType,
        userId: ownerId,
        pageCount,
      });

      return {
        scanId: job.scanId,
        filePath: outputPath,
        format: validated.format,
        pageCount,
      };
    } catch (error) {
      const structured =
        error instanceof ScannerError
          ? error
          : new ScannerError('SCAN_FAILED', 'Échec de la numérisation.', 500);

      this.statusManager.updateJob(job.scanId, {
        stage: 'error',
        code: structured.code,
        errorMessage: structured.message,
      });
      this.statusManager.cleanupJobTempFiles(this.statusManager.getJob(job.scanId));

      if (lockedDeviceId) {
        this.statusManager.releaseDeviceLock(lockedDeviceId, job.scanId);
      } else {
        this.statusManager.setScanning(false);
      }

      this.emit('scanError', structured);
      throw structured;
    }
  }

  async listScanners() {
    await this.init();
    if (!this.hasScanimageCmd) {
      throw new ScannerError(
        'SCANNER_NOT_FOUND',
        'Utilitaire scanimage introuvable sur le serveur.',
        503
      );
    }

    const scanners = await ScannerDetection.listScanners();
    this.emit('devicesListed', { count: scanners.length });
    return scanners;
  }

  async testScanner() {
    await this.init();
    if (!this.hasScanimageCmd) return false;
    const deviceId = this.deviceManager.getCurrentDeviceId();
    if (!deviceId) return false;
    return await ScannerDetection.checkScannerExists(deviceId);
  }
}

module.exports = LinuxScanner;
