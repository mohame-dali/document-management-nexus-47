
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Provides scanner detection functionality for Windows
 */
class ScannerDetection {
  /**
   * Check if Windows scanning tools are available
   * @returns {Promise<boolean>} Whether Windows scanning tools are available
   */
  static async checkScanningToolsAvailability() {
    try {
      // Check if PowerShell can access WIA
      const script = `
        try {
          $wia = New-Object -ComObject WIA.DeviceManager -ErrorAction Stop
          Write-Host "WIA is available"
          exit 0
        } catch {
          Write-Host "WIA is not available: $($_.Exception.Message)"
          exit 1
        }
      `;
      
      const { stdout } = await execAsync(`powershell -Command "${script}"`);
      return stdout.includes("WIA is available");
    } catch (error) {
      console.warn("Windows Image Acquisition (WIA) is not available:", error.message);
      return false;
    }
  }

  /**
   * Method used by WindowsScanner to detect WIA tools
   * @returns {Promise<boolean>} Whether Windows scanning tools are available
   */
  static async detectWIATools() {
    return await this.checkScanningToolsAvailability();
  }

  /**
   * List available scanners on Windows
   * @returns {Promise<Array>} List of available scanners
   */
  static async listScanners() {
    try {
      // Check if Windows scanning tools are available
      const wiaAvailable = await this.checkScanningToolsAvailability();
      
      if (!wiaAvailable) {
        throw new Error('Windows scanning tools not available');
      }
      
      // PowerShell script to list scanners
      const script = `
        try {
          $deviceManager = New-Object -ComObject WIA.DeviceManager
          $devices = @()
          
          foreach ($deviceInfo in $deviceManager.DeviceInfos) {
            if ($deviceInfo.Type -eq 1) {  # 1 = Scanner
              $devices += @{
                "id" = $deviceInfo.DeviceID;
                "name" = $deviceInfo.Properties("Name").Value;
                "description" = $deviceInfo.Properties("Description").Value;
              }
            }
          }
          
          if ($devices.Count -eq 0) {
            Write-Host "No scanners found" -ForegroundColor Yellow
            exit 0
          }
          
          $devicesJson = $devices | ConvertTo-Json
          Write-Host $devicesJson
          exit 0
        } catch {
          Write-Host "Error listing scanners: $($_.Exception.Message)" -ForegroundColor Red
          exit 1
        }
      `;
      
      const { stdout } = await execAsync(`powershell -Command "${script}"`);
      
      if (stdout.includes("No scanners found")) {
        return [];
      }
      
      try {
        const devices = JSON.parse(stdout);
        return Array.isArray(devices) ? devices.map(device => ({
          id: device.id,
          name: device.name || 'Unknown Scanner',
          type: device.description || 'Scanner',
          status: 'available'
        })) : [];
      } catch (parseError) {
        console.error('Error parsing scanner list:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error listing scanners:', error.message);
      return [];
    }
  }

  /**
   * Get the default scanner device
   * @param {string} currentDeviceId - Currently set device ID to prioritize
   * @returns {Promise<string>} Scanner device ID
   */
  static async getDefaultScanner(currentDeviceId) {
    try {
      // First check if we have a saved device ID and prioritize it
      if (currentDeviceId) {
        // Verify if the saved scanner is still available
        const scanners = await this.listScanners();
        const deviceStillAvailable = scanners.some(s => s.id === currentDeviceId);
        
        if (deviceStillAvailable) {
          console.log(`Using previously selected scanner: ${currentDeviceId}`);
          return currentDeviceId;
        }
      }
      
      const scanners = await this.listScanners();
      
      if (scanners.length === 0) {
        throw new Error('No scanners found');
      }
      
      console.log(`Auto-selecting default scanner: ${scanners[0].id}`);
      return scanners[0].id;
    } catch (error) {
      console.error('Error getting default scanner:', error.message);
      throw error;
    }
  }

  /**
   * Check if a specific scanner device exists
   * @param {string} deviceId - Scanner device ID to check
   * @returns {Promise<boolean>} Whether the device exists
   */
  static async checkScannerExists(deviceId) {
    try {
      const scanners = await this.listScanners();
      return scanners.some(scanner => scanner.id === deviceId);
    } catch (error) {
      console.error('Error checking scanner existence:', error);
      return false;
    }
  }
}

module.exports = ScannerDetection;
