const fs = require('fs');
const path = require('path');
const { isValidDeviceIdForPlatform } = require('../validation');

/**
 * Scanner device management functionality
 */
class DeviceManager {
  constructor() {
    this.currentDeviceId = '';
    this.lastUsedDevices = [];
    this.maxDeviceHistory = 5;
    this.configPath = path.join(__dirname, '..', 'config', 'devices.json');

    this.loadSavedDevices();
  }

  loadSavedDevices() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        const loadedId = typeof data.currentDeviceId === 'string' ? data.currentDeviceId.trim() : '';

        if (loadedId && isValidDeviceIdForPlatform(loadedId)) {
          this.currentDeviceId = loadedId;
        } else {
          if (loadedId) {
            console.warn(
              `[Scanner] Ignored incompatible saved device ID for platform ${process.platform}: ${loadedId}`
            );
          }
          this.currentDeviceId = '';
        }

        const rawHistory = Array.isArray(data.lastUsedDevices) ? data.lastUsedDevices : [];
        this.lastUsedDevices = rawHistory.filter(
          (id) => typeof id === 'string' && isValidDeviceIdForPlatform(id)
        );

        if (loadedId && !this.currentDeviceId) {
          this.saveDevices();
        }
      }
    } catch (error) {
      console.warn('Failed to load saved scanner devices:', error.message);
      this.currentDeviceId = '';
      this.lastUsedDevices = [];
    }
  }

  saveDevices() {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        currentDeviceId: this.currentDeviceId,
        lastUsedDevices: this.lastUsedDevices,
      };

      fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('Failed to save scanner devices:', error.message);
    }
  }

  selectDevice(deviceId, availableScanners) {
    if (!isValidDeviceIdForPlatform(deviceId)) {
      console.warn(`Scanner device ID rejected by platform validation: ${deviceId}`);
      return false;
    }

    const scannerExists = Array.isArray(availableScanners) && availableScanners.some((s) => s.id === deviceId);
    if (!scannerExists) {
      console.warn(`Scanner device ID ${deviceId} not found in available scanners`);
      return false;
    }

    this.currentDeviceId = deviceId;
    this.addToRecentDevices(deviceId);
    this.saveDevices();

    console.log(`Scanner device selected: ${deviceId}`);
    return true;
  }

  addToRecentDevices(deviceId) {
    if (!deviceId || !isValidDeviceIdForPlatform(deviceId)) return;
    this.lastUsedDevices = this.lastUsedDevices.filter((id) => id !== deviceId);
    this.lastUsedDevices.unshift(deviceId);
    if (this.lastUsedDevices.length > this.maxDeviceHistory) {
      this.lastUsedDevices = this.lastUsedDevices.slice(0, this.maxDeviceHistory);
    }
  }

  getRecentDevices() {
    return this.lastUsedDevices;
  }

  getCurrentDeviceId() {
    return this.currentDeviceId;
  }

  setCurrentDeviceId(deviceId) {
    if (!deviceId) {
      this.clearCurrentDeviceId();
      return;
    }
    if (!isValidDeviceIdForPlatform(deviceId)) {
      console.warn(`[Scanner] Refused incompatible deviceId: ${deviceId}`);
      return;
    }
    this.currentDeviceId = deviceId;
    this.addToRecentDevices(deviceId);
    this.saveDevices();
  }

  clearCurrentDeviceId() {
    this.currentDeviceId = '';
    this.saveDevices();
  }
}

module.exports = DeviceManager;
