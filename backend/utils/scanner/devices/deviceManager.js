
const fs = require('fs');
const path = require('path');

/**
 * Scanner device management functionality
 */
class DeviceManager {
  constructor() {
    this.currentDeviceId = '';
    this.lastUsedDevices = [];
    this.maxDeviceHistory = 5;
    this.configPath = path.join(__dirname, '..', 'config', 'devices.json');
    
    // Try to load saved device settings
    this.loadSavedDevices();
  }
  
  /**
   * Load saved device settings from config file
   */
  loadSavedDevices() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this.currentDeviceId = data.currentDeviceId || '';
        this.lastUsedDevices = data.lastUsedDevices || [];
      }
    } catch (error) {
      console.warn('Failed to load saved scanner devices:', error.message);
    }
  }
  
  /**
   * Save device settings to config file
   */
  saveDevices() {
    try {
      // Ensure the directory exists
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const data = {
        currentDeviceId: this.currentDeviceId,
        lastUsedDevices: this.lastUsedDevices
      };
      
      fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('Failed to save scanner devices:', error.message);
    }
  }
  
  /**
   * Select a scanner device
   * @param {string} deviceId - Device ID to select
   * @param {Array} availableScanners - List of available scanners
   * @returns {boolean} Success status
   */
  selectDevice(deviceId, availableScanners) {
    // Check if the deviceId exists in available scanners
    const scannerExists = availableScanners.some(scanner => scanner.id === deviceId);
    
    if (!scannerExists) {
      console.warn(`Scanner device ID ${deviceId} not found in available scanners`);
      return false;
    }
    
    // Update the scanner device ID
    this.currentDeviceId = deviceId;
    
    // Add to recently used devices list
    this.addToRecentDevices(deviceId);
    
    // Persist the device selection
    this.saveDevices();
    
    console.log(`Scanner device selected: ${deviceId}`);
    
    return true;
  }
  
  /**
   * Add a device to the recently used list
   * @param {string} deviceId - Device ID to add
   */
  addToRecentDevices(deviceId) {
    // Remove if already exists
    this.lastUsedDevices = this.lastUsedDevices.filter(id => id !== deviceId);
    
    // Add to the front of the list
    this.lastUsedDevices.unshift(deviceId);
    
    // Limit the size of the history
    if (this.lastUsedDevices.length > this.maxDeviceHistory) {
      this.lastUsedDevices = this.lastUsedDevices.slice(0, this.maxDeviceHistory);
    }
  }
  
  /**
   * Get recently used devices
   * @returns {Array} List of recently used device IDs
   */
  getRecentDevices() {
    return this.lastUsedDevices;
  }
  
  /**
   * Get current device ID
   * @returns {string} Current device ID
   */
  getCurrentDeviceId() {
    return this.currentDeviceId;
  }
  
  /**
   * Set current device ID
   * @param {string} deviceId - Device ID to set
   */
  setCurrentDeviceId(deviceId) {
    this.currentDeviceId = deviceId;
    this.addToRecentDevices(deviceId);
    this.saveDevices();
  }
}

module.exports = DeviceManager;
