
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const exec = require('child_process').exec;
const execAsync = promisify(exec);

/**
 * Executes Windows PowerShell scanning commands
 */
class ScanExecutor {
  /**
   * Execute a Windows scan operation
   * @param {string} scannerDevice - ID of the scanner device to use
   * @param {string} tempImagePath - Where to save the scanned image temporarily
   * @param {number} resolution - Scan resolution (DPI)
   * @param {Object} options - Additional scan options
   * @returns {Promise<void>}
   */
  static async executeScan(scannerDevice, tempImagePath, resolution, options = {}) {
    console.log(`Starting scan job with device: ${scannerDevice}`);
    
    // Create PowerShell script for scanning
    const scanScript = ScanExecutor.createScanScript(
      scannerDevice, 
      tempImagePath, 
      resolution,
      options
    );
    
    const psScriptPath = path.join(
      path.dirname(tempImagePath), 
      `scan_script_${Date.now()}.ps1`
    );
    
    try {
      // Write the PowerShell script to disk
      fs.writeFileSync(psScriptPath, scanScript);
      
      // Execute the PowerShell script
      console.log('Executing Windows scan command via PowerShell');
      await execAsync(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`);
      
      if (!fs.existsSync(tempImagePath)) {
        throw new Error('Scan failed: Output file not created');
      }
      
      return { tempImagePath, psScriptPath };
    } catch (error) {
      // Clean up any temporary files
      if (fs.existsSync(psScriptPath)) {
        fs.unlinkSync(psScriptPath);
      }
      
      throw new Error(`Windows scanning failed: ${error.message}`);
    } finally {
      // Always clean up the PowerShell script
      ScanExecutor.cleanupTempFiles(psScriptPath);
    }
  }
  
  /**
   * Create a PowerShell script for scanner operation
   * @param {string} scannerDevice - Scanner device ID
   * @param {string} outputPath - Where to save the scanned image
   * @param {number} resolution - Scan resolution
   * @param {Object} options - Additional scan options
   * @returns {string} PowerShell script content
   */
  static createScanScript(scannerDevice, outputPath, resolution, options = {}) {
    const colorMode = options.colorMode || 'Color';
    const documentSource = options.documentSource || 'Flatbed';
    
    return `
      try {
        $deviceManager = New-Object -ComObject WIA.DeviceManager
        $device = $null
        foreach ($dev in $deviceManager.DeviceInfos) {
          if ($dev.DeviceID -eq '${scannerDevice}') {
            $device = $dev.Connect()
            break
          }
        }
        if ($device -eq $null) { 
          Write-Host "Scanner not found: ${scannerDevice}" -ForegroundColor Red
          exit 1 
        }
        $item = $device.Items[1]
        $item.Properties("6146").Value = ${resolution} # Resolution
        
        # Additional properties if available on the scanner
        try {
          $item.Properties("6147").Value = "${colorMode}" # Color mode
        } catch {
          Write-Host "Color mode not supported, using default"
        }
        
        try {
          $item.Properties("6148").Value = "${documentSource}" # Document source
        } catch {
          Write-Host "Document source not supported, using default"
        }
        
        $img = $item.Transfer()
        $img.SaveFile("${outputPath.replace(/\\/g, '\\\\')}")
        Write-Host "Scan completed successfully"
        exit 0
      } catch {
        Write-Host "Error during scanning: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
      }
    `;
  }
  
  /**
   * Clean up temporary files created during scanning
   * @param {string[]} filePaths - Array of file paths to clean up
   */
  static cleanupTempFiles(...filePaths) {
    for (const filePath of filePaths) {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error(`Error deleting temporary file ${filePath}:`, err);
        }
      }
    }
  }
  
  /**
   * Check if a scanner is working properly
   * @param {string} scannerDevice - ID of the scanner device to check
   * @returns {Promise<boolean>} Whether the scanner is working
   */
  static async testScannerConnection(scannerDevice) {
    const testScript = `
      try {
        $deviceManager = New-Object -ComObject WIA.DeviceManager
        $device = $null
        foreach ($dev in $deviceManager.DeviceInfos) {
          if ($dev.DeviceID -eq '${scannerDevice}') {
            $device = $dev.Connect()
            break
          }
        }
        if ($device -eq $null) { 
          Write-Host "Scanner not found: ${scannerDevice}" -ForegroundColor Red
          exit 1
        }
        Write-Host "Scanner connection successful" -ForegroundColor Green
        exit 0
      } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
      }
    `;
    
    const testScriptPath = path.join(
      require('os').tmpdir(), 
      `scan_test_${Date.now()}.ps1`
    );
    
    try {
      fs.writeFileSync(testScriptPath, testScript);
      await execAsync(`powershell -ExecutionPolicy Bypass -File "${testScriptPath}"`);
      return true;
    } catch (error) {
      console.error(`Scanner test failed: ${error.message}`);
      return false;
    } finally {
      ScanExecutor.cleanupTempFiles(testScriptPath);
    }
  }
}

module.exports = ScanExecutor;
