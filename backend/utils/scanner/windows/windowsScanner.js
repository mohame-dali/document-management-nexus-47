const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ScannerBase = require('../scannerBase');
const ScannerDetection = require('./scannerDetection');
const ScanExecutor = require('./scanExecutor');
const PDFProcessor = require('./pdfProcessor');
const {
  validateScanOptions,
  getContentTypeForFormat,
  ScannerError,
} = require('../validation');

/**
 * Windows Scanner implementation using Windows Image Acquisition (WIA) — real hardware only.
 */
class WindowsScanner extends ScannerBase {
  constructor() {
    super();
    this.hasWindowsScanTools = null;
  }

  async _performInit() {
    try {
      this.hasWindowsScanTools = await ScannerDetection.detectWIATools();
      if (!this.hasWindowsScanTools) {
        console.warn('[Scanner][Windows] WIA non disponible sur cette machine.');
      }
    } catch (error) {
      console.error('[Scanner][Windows] Erreur détection outils WIA:', error.message);
      this.hasWindowsScanTools = false;
    }
    return this.hasWindowsScanTools;
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

      if (!this.hasWindowsScanTools) {
        throw new ScannerError(
          'SCANNER_NOT_FOUND',
          'Outils WIA Windows indisponibles sur le serveur.',
          503
        );
      }

      const deviceId = await this.ensureValidDevice();
      this.statusManager.updateJob(job.scanId, { deviceId });

      if (job.cancelled || job.abortController.signal.aborted) {
        throw new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
      }

      // Per-device concurrency lock
      this.statusManager.acquireDeviceLock(deviceId, job.scanId);
      lockedDeviceId = deviceId;

      const jobTempDir = path.join(this.config.tempDir, job.scanId);
      fs.mkdirSync(jobTempDir, { recursive: true });

      this.statusManager.updateJob(job.scanId, {
        stage: 'preparing',
        jobTempDir,
      });
      this.statusManager.setScanning(true, documentType);
      this.emit('scanStart', { scanId: job.scanId, deviceId, options: validated });

      const outputPath = this._buildOutputPath(job.scanId, validated.format);
      const timeoutMs = Number(options.timeoutMs) || 120000;

      this.statusManager.updateJob(job.scanId, { stage: 'scanning', page: 0 });

      const { pageFiles } = await ScanExecutor.executeScan({
        scannerDevice: deviceId,
        jobTempDir,
        resolution: validated.resolution,
        format: validated.format,
        colorMode: validated.colorMode,
        documentSource: validated.documentSource,
        timeoutMs,
        signal: job.abortController.signal,
        onPage: (pageNum) => {
          this.statusManager.updateJob(job.scanId, {
            stage: 'scanning',
            page: pageNum,
            availablePages: pageNum,
          });
          this.emit('scanProgress', { scanId: job.scanId, stage: 'scanning', page: pageNum });
        },
      });

      if (job.cancelled || job.abortController.signal.aborted) {
        throw new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
      }

      this.statusManager.updateJob(job.scanId, {
        stage: 'processing',
        page: pageFiles.length,
      });
      this.emit('scanProgress', {
        scanId: job.scanId,
        stage: 'processing',
        page: pageFiles.length,
      });

      await PDFProcessor.processPagesToFormat(pageFiles, outputPath, validated.format);

      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        throw new ScannerError('SCAN_FAILED', 'Le fichier numérisé produit est vide.', 500);
      }

      this.statusManager.updateJob(job.scanId, {
        stage: 'done',
        page: pageFiles.length,
        filePath: outputPath,
        mimeType: getContentTypeForFormat(validated.format),
      });

      // Clean up intermediate page files and PowerShell scripts
      if (fs.existsSync(jobTempDir)) {
        try { fs.rmSync(jobTempDir, { recursive: true, force: true }); } catch (_) {}
      }
      this.statusManager.updateJob(job.scanId, { jobTempDir: null });

      this.statusManager.releaseDeviceLock(lockedDeviceId, job.scanId);
      lockedDeviceId = null;

      this.emit('scanComplete', {
        scanId: job.scanId,
        outputPath,
        format: validated.format,
        deviceId,
        pageCount: pageFiles.length,
      });

      this.statusManager.addScanToHistory({
        scanId: job.scanId,
        deviceId,
        timestamp: new Date(),
        outputPath,
        format: validated.format,
        documentType,
        userId: ownerId,
        pageCount: pageFiles.length,
      });

      return {
        scanId: job.scanId,
        filePath: outputPath,
        format: validated.format,
        pageCount: pageFiles.length,
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
    if (!this.hasWindowsScanTools) {
      throw new ScannerError(
        'SCANNER_NOT_FOUND',
        'Outils WIA Windows indisponibles sur le serveur.',
        503
      );
    }

    const scanners = await ScannerDetection.listScanners();
    this.emit('devicesListed', { count: scanners.length });
    return scanners;
  }

  async testScanner() {
    await this.init();
    if (!this.hasWindowsScanTools) {
      return false;
    }
    const deviceId = this.deviceManager.getCurrentDeviceId();
    if (!deviceId) {
      return false;
    }
    return await ScanExecutor.testScannerConnection(deviceId);
  }
}

module.exports = WindowsScanner;
