const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { ScannerError } = require('../validation');

const JOB_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Scanner status, per-device locking, and per-scanId job lifecycle management
 */
class StatusManager {
  constructor() {
    this.isScanning = false;
    this.platform = process.platform;
    this.lastScanTime = null;
    this.errorState = null;
    this.scanCount = 0;
    this.supportedFormats = ['pdf', 'jpg', 'png'];
    this.currentDocumentType = null;
    this.lastOcrSuccess = null;
    this.scanHistory = [];

    // Active device locks: Map<deviceId, scanId>
    this.deviceLocks = new Map();
    // Job registry: Map<scanId, jobObject>
    this.jobs = new Map();
  }

  getStatus(config, deviceId) {
    return {
      enabled: Boolean(config.enabled),
      isScanning: this.deviceLocks.size > 0 || this.isScanning,
      deviceId: deviceId || 'Not selected',
      resolution: config.resolution,
      format: config.format,
      platform: this.platform,
      lastScanTime: this.lastScanTime,
      errorState: this.errorState,
      scanCount: this.scanCount,
      supportedFormats: this.supportedFormats,
      currentDocumentType: this.currentDocumentType,
      lastOcrSuccess: this.lastOcrSuccess,
      recentScans: this.scanHistory.slice(0, 5),
    };
  }

  createJob({ scanId = null, ownerId, documentType = 'temp', format = 'pdf', resolution = 300 }) {
    this.pruneExpiredJobs();

    const id = scanId || uuidv4();
    if (this.jobs.has(id)) {
      throw new ScannerError('SCAN_FAILED', 'Identifiant de numérisation déjà utilisé', 409);
    }

    const job = {
      scanId: id,
      ownerId: String(ownerId),
      deviceId: null,
      documentType,
      format,
      resolution,
      stage: 'detecting',
      page: 0,
      code: undefined,
      errorMessage: undefined,
      filePath: null,
      mimeType: null,
      jobTempDir: null,
      abortController: new AbortController(),
      cancelled: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.jobs.set(id, job);
    return job;
  }

  getJob(scanId) {
    return this.jobs.get(scanId) || null;
  }

  getJobStatusForUser(scanId, userId) {
    const job = this.jobs.get(scanId);
    if (!job) return { notFound: true };
    if (job.ownerId !== String(userId)) return { forbidden: true };

    const payload = {
      scanId: job.scanId,
      stage: job.stage,
      page: job.page,
    };
    if (job.code) {
      payload.code = job.code;
    }
    return { job: payload };
  }

  updateJob(scanId, patch = {}) {
    const job = this.jobs.get(scanId);
    if (!job) return null;
    Object.assign(job, patch, { updatedAt: Date.now() });
    return job;
  }

  acquireDeviceLock(deviceId, scanId) {
    const key = deviceId || '__default__';
    const holder = this.deviceLocks.get(key);
    if (holder && holder !== scanId) {
      throw new ScannerError(
        'SCANNER_BUSY',
        'Le scanner est actuellement occupé par une autre numérisation',
        503
      );
    }
    this.deviceLocks.set(key, scanId);
    this.isScanning = true;
  }

  releaseDeviceLock(deviceId, scanId) {
    const key = deviceId || '__default__';
    if (this.deviceLocks.get(key) === scanId) {
      this.deviceLocks.delete(key);
    }
    this.isScanning = this.deviceLocks.size > 0;
  }

  cancelJob(scanId, userId) {
    const job = this.jobs.get(scanId);
    if (!job) return { notFound: true };
    if (job.ownerId !== String(userId)) return { forbidden: true };

    job.cancelled = true;
    job.stage = 'error';
    job.code = 'SCAN_CANCELLED';
    job.errorMessage = 'Numérisation annulée par l’utilisateur';
    job.updatedAt = Date.now();

    if (job.abortController && !job.abortController.signal.aborted) {
      job.abortController.abort();
    }

    this.cleanupJobTempFiles(job);
    if (job.deviceId) {
      this.releaseDeviceLock(job.deviceId, job.scanId);
    }

    return { cancelled: true, job };
  }

  cleanupJobTempFiles(job) {
    if (!job) return;
    if (job.jobTempDir && fs.existsSync(job.jobTempDir)) {
      try {
        fs.rmSync(job.jobTempDir, { recursive: true, force: true });
      } catch (err) {
        console.warn(`[Scanner] Failed cleaning jobTempDir ${job.jobTempDir}:`, err.message);
      }
      job.jobTempDir = null;
    }
    if (job.stage !== 'done' && job.filePath && fs.existsSync(job.filePath)) {
      try {
        fs.unlinkSync(job.filePath);
      } catch (err) {
        console.warn(`[Scanner] Failed cleaning output file ${job.filePath}:`, err.message);
      }
      job.filePath = null;
    }
  }

  deleteJobFile(scanId, userId) {
    const job = this.jobs.get(scanId);
    if (!job) return { notFound: true };
    if (job.ownerId !== String(userId)) return { forbidden: true };

    if (job.jobTempDir && fs.existsSync(job.jobTempDir)) {
      try {
        fs.rmSync(job.jobTempDir, { recursive: true, force: true });
      } catch (_) {}
      job.jobTempDir = null;
    }
    if (job.filePath && fs.existsSync(job.filePath)) {
      try {
        fs.unlinkSync(job.filePath);
      } catch (err) {
        console.warn(`[Scanner] Failed deleting scan file ${job.filePath}:`, err.message);
      }
      job.filePath = null;
    }
    return { deleted: true };
  }

  pruneExpiredJobs() {
    const cutoff = Date.now() - JOB_TTL_MS;
    for (const [id, job] of this.jobs.entries()) {
      const isTerminal = job.stage === 'done' || job.stage === 'error';
      if (isTerminal && job.updatedAt < cutoff) {
        if (job.jobTempDir && fs.existsSync(job.jobTempDir)) {
          try { fs.rmSync(job.jobTempDir, { recursive: true, force: true }); } catch (_) {}
        }
        this.jobs.delete(id);
      }
    }
  }

  setScanning(isScanning, documentType = null) {
    this.isScanning = isScanning;
    if (documentType) {
      this.currentDocumentType = documentType;
    }
    if (isScanning) {
      this.errorState = null;
    } else if (!isScanning && !this.errorState) {
      this.lastScanTime = new Date();
      this.scanCount++;
    }
  }

  addScanToHistory(entry) {
    if (!entry) return;
    this.scanHistory.unshift({
      ...entry,
      timestamp: entry.timestamp || new Date(),
      success: entry.success !== false,
    });
    if (this.scanHistory.length > 10) {
      this.scanHistory.pop();
    }
  }

  setError(error) {
    this.errorState = {
      message: error.message,
      timestamp: new Date(),
      code: error.code || 'SCAN_FAILED',
    };
    this.isScanning = this.deviceLocks.size > 0;
    this.scanHistory.unshift({
      timestamp: new Date(),
      documentType: this.currentDocumentType,
      success: false,
      code: error.code || 'SCAN_FAILED',
      error: error.message,
    });
    if (this.scanHistory.length > 10) {
      this.scanHistory.pop();
    }
  }

  setOcrResult(success) {
    this.lastOcrSuccess = {
      success,
      timestamp: new Date(),
    };
  }

  clearError() {
    this.errorState = null;
  }

  getScanning() {
    return this.deviceLocks.size > 0 || this.isScanning;
  }

  getPlatform() {
    return this.platform;
  }

  resetScanCount() {
    this.scanCount = 0;
  }

  getScanHistory() {
    return this.scanHistory;
  }
}

module.exports = StatusManager;
