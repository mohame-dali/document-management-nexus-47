
/**
 * Windows Scanner Module
 * 
 * This module exports the Windows-specific scanner implementation
 * which handles document scanning on Windows platforms using the
 * Windows Image Acquisition (WIA) API.
 * 
 * The WindowsScanner class provides methods for scanner detection,
 * selection, and document scanning with appropriate error handling
 * for Windows environments.
 */
const WindowsScanner = require('./windowsScanner');

module.exports = WindowsScanner;
