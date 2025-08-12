
/**
 * This class provides meaningful error messages when no scanner hardware is detected
 * instead of simulating scan data.
 */
class ScanSimulator {
  /**
   * Return an error message indicating a real scanner is required
   * @returns {Promise<string>} - Error message
   */
  static simulateScan() {
    return Promise.reject(new Error(
      'No physical scanner detected. Please follow these steps:\n' +
      '1. Connect your scanner via USB and power it on\n' +
      '2. For Linux: Install SANE drivers (sudo apt-get install sane-utils)\n' +
      '3. Test scanner detection with: scanimage -L\n' +
      '4. For Panasonic scanners: Ensure latest drivers are installed\n' +
      '5. Try reconnecting the scanner and refresh the scanner list\n' +
      'If issues persist, contact system administrator for driver installation.'
    ));
  }
}

module.exports = ScanSimulator;
