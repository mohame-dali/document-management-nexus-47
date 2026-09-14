
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

/**
 * Provides scanner detection functionality for Linux/macOS
 */
class ScannerDetection {
  /**
   * Detect available scanner tools
   * @returns {Promise<Object>} Scanner tools availability
   */
  static async detectScannerTools() {
    let hasScanimageCmd = false;
    let hasImg2pdfCmd = false;
    let hasTesseractCmd = false;
    
    try {
      await execAsync('which scanimage');
      hasScanimageCmd = true;
      console.log('scanimage utility detected');
    } catch (error) {
      console.log('scanimage utility not found');
    }
    
    try {
      await execAsync('which img2pdf');
      hasImg2pdfCmd = true;
      console.log('img2pdf utility detected');
    } catch (error) {
      console.log('img2pdf utility not found');
    }

    try {
      await execAsync('which tesseract');
      hasTesseractCmd = true;
      console.log('tesseract OCR utility detected');
    } catch (error) {
      console.log('tesseract OCR utility not found');
    }
    
    return { hasScanimageCmd, hasImg2pdfCmd, hasTesseractCmd };
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
        } else {
          console.log(`Previously selected scanner ${currentDeviceId} no longer available`);
        }
      }

      const scanners = await this.listScanners();
      if (scanners.length === 0) {
        throw new Error('No scanners found');
      }
      
      console.log(`Auto-selecting default scanner: ${scanners[0].id}`);
      return scanners[0].id; // Auto-select the first scanner found
    } catch (error) {
      console.error('Error getting default scanner:', error.message);
      throw error;
    }
  }

  /**
   * List available scanners on Linux/macOS
   * @returns {Promise<Array>} List of available scanners
   */
  static async listScanners() {
    try {
      // Run scanimage with a timeout to avoid hanging
      const { stdout, stderr } = await execAsync('scanimage -L', { timeout: 10000 });
      
      if (stderr && stderr.includes('Error') && !stdout) {
        console.error('Error from scanimage:', stderr);
        return [];
      }
      
      const scanners = stdout
        .split('\n')
        .filter(line => line.trim().length > 0)  // Only process non-empty lines
        .map(line => {
          try {
            console.log(`Processing scanner line: ${line}`);
            
            // Handle Panasonic scanner (panamfs) - improved detection
            if (line.includes('panamfs:')) {
              // Extract the device ID using a more robust pattern
              const deviceIdMatch = line.match(/device `([^']+)'/);
              const deviceId = deviceIdMatch ? deviceIdMatch[1] : null;
              
              // Extract name more reliably
              let name = 'Panasonic Scanner';
              const nameMatch = line.match(/is a ([^']+)/);
              if (nameMatch) {
                name = nameMatch[1].trim();
              }
              
              // Detect scanner type
              const type = line.toLowerCase().includes('sheetfed') ? 'Sheetfed' : 
                           line.toLowerCase().includes('flatbed') ? 'Flatbed' : 'Unknown';
              
              console.log(`Detected Panasonic scanner: ${name}, ID: ${deviceId}, Type: ${type}`);
              
              return { 
                id: deviceId, 
                name: name, 
                type: type,
                status: 'available' 
              };
            }
            
            // Handle general case with improved pattern matching
            const deviceIdMatch = line.match(/device `([^']+)'/);
            const deviceId = deviceIdMatch ? deviceIdMatch[1] : null;
            
            if (!deviceId) {
              console.warn(`Could not extract device ID from line: ${line}`);
              return null;
            }
            
            const nameMatch = line.match(/is a ([^']+)/);
            const name = nameMatch ? nameMatch[1].trim() : 'Unknown Scanner';
            
            // Get more scanner details
            const type = line.toLowerCase().includes('flatbed') ? 'Flatbed' : 
                         line.toLowerCase().includes('sheetfed') ? 'Sheetfed' : 
                         line.toLowerCase().includes('adf') ? 'ADF' : 'Unknown';
            
            console.log(`Detected scanner: ${name}, ID: ${deviceId}, Type: ${type}`);
            
            return { 
              id: deviceId, 
              name: name, 
              type: type,
              status: 'available' 
            };
          } catch (error) {
            console.warn('Error parsing scanner line:', line, error);
            return null;
          }
        })
        .filter(Boolean);
      
      console.log(`Found ${scanners.length} scanners`);
      return scanners;
    } catch (error) {
      console.error('Error listing scanners:', error);
      return []; // Return empty array to indicate no scanners found
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
