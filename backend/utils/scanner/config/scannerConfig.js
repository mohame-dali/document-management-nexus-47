const fs = require('fs');
const path = require('path');

/**
 * Scanner configuration utility
 */
class ScannerConfig {
  constructor() {
    this.uploadDir = path.resolve(process.env.UPLOAD_PATH || process.env.UPLOAD_DIR || './uploads');
    this.tempDir = path.join(this.uploadDir, 'temp');

    // Explicit override flag when updated programmatically at runtime
    this._enabledOverride = null;
    this.scannerDeviceId = process.env.SCANNER_DEVICE_ID || '';
    this.scannerResolution = process.env.SCANNER_RESOLUTION || '300';
    this.scannerFormat = (process.env.SCANNER_FORMAT || 'pdf').toLowerCase();
    if (this.scannerFormat === 'jpeg') this.scannerFormat = 'jpg';

    this.supportedFormats = ['pdf', 'jpg', 'png'];

    if (!this.supportedFormats.includes(this.scannerFormat)) {
      console.warn(`Unsupported scanner format: ${this.scannerFormat}. Defaulting to pdf.`);
      this.scannerFormat = 'pdf';
    }

    this._ensureDirectories();
  }

  get scannerEnabled() {
    if (typeof this._enabledOverride === 'boolean') {
      return this._enabledOverride;
    }
    return process.env.SCANNER_ENABLED === 'true';
  }

  set scannerEnabled(val) {
    this._enabledOverride = Boolean(val);
  }

  _ensureDirectories() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  getConfig() {
    return {
      enabled: this.scannerEnabled,
      deviceId: this.scannerDeviceId,
      resolution: this.scannerResolution,
      format: this.scannerFormat,
      uploadDir: this.uploadDir,
      tempDir: this.tempDir,
      supportedFormats: this.supportedFormats,
    };
  }

  updateConfig(config = {}) {
    const deviceId = config.deviceId ?? config.scannerDeviceId;
    if (typeof deviceId === 'string') {
      this.scannerDeviceId = deviceId;
    }

    if (config.resolution) {
      this.scannerResolution = String(config.resolution);
    }

    if (config.format) {
      const normalized = String(config.format).toLowerCase() === 'jpeg' ? 'jpg' : String(config.format).toLowerCase();
      if (this.supportedFormats.includes(normalized)) {
        this.scannerFormat = normalized;
      }
    }

    if (typeof config.enabled === 'boolean') {
      this._enabledOverride = config.enabled;
    }
  }
}

module.exports = ScannerConfig;
