
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Scanner configuration interface
interface ScannerConfig {
  resolution?: number;
  format?: 'PDF' | 'JPEG' | 'PNG';
  colorMode?: 'color' | 'grayscale' | 'blackAndWhite';
  duplex?: boolean;
}

// Scanner device interface
interface ScannerDevice {
  id: string;
  name: string;
  isDefault: boolean;
  isAvailable: boolean;
}

// Scan result interface
interface ScanResult {
  id: string;
  filename: string;
  path: string;
  format: string;
  size: number;
  pages: number;
  ocrText?: string;
  createdAt: string;
}

// Enhanced scan result for document scanning
interface DocumentScanResult {
  filePath: string;
  serialNumber?: number;
  year?: number;
  documentType?: string;
  ocrText?: string;
  format?: string;
}

// Get scanner status - Admin and AdminTuningDesk only
export const getScannerStatus = async (): Promise<{
  isAvailable: boolean;
  selectedDevice?: ScannerDevice;
  devices: ScannerDevice[];
}> => {
  try {
    const response = await axios.get(`${API_URL}/scan/status`);
    return response.data;
  } catch (error) {
    console.error('Error getting scanner status:', error);
    throw error;
  }
};

// List available scanners - Admin and AdminTuningDesk only
export const listScanners = async (): Promise<ScannerDevice[]> => {
  try {
    const response = await axios.get(`${API_URL}/scan/devices`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error listing scanners:', error);
    throw error;
  }
};

// Select a scanner - Admin and AdminTuningDesk only
export const selectScanner = async (deviceId: string): Promise<{ success: boolean; device: ScannerDevice }> => {
  try {
    const response = await axios.post(`${API_URL}/scan/select-device`, { deviceId });
    return response.data;
  } catch (error) {
    console.error('Error selecting scanner:', error);
    throw error;
  }
};

// Start a scan - Admin and AdminTuningDesk only
export const startScan = async (config?: ScannerConfig): Promise<ScanResult> => {
  try {
    const response = await axios.post(`${API_URL}/scan/start`, config || {});
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error starting scan:', error);
    throw error;
  }
};

// Scan a document for association with a record - Admin and AdminTuningDesk only
export const scanDocument = async (options: {
  documentType: 'incoming' | 'outgoing';
  year?: number;
  config?: ScannerConfig;
}): Promise<DocumentScanResult> => {
  try {
    console.log('Scanning document with options:', options);
    const requestData = {
      documentType: options.documentType,
      year: options.year || new Date().getFullYear(),
      format: options.config?.format?.toLowerCase() || 'pdf',
      resolution: options.config?.resolution || 300
    };
    
    // Create timeout that's longer than backend timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000); // 4 minutes
    
    const response = await axios.post(`${API_URL}/scan/document`, requestData, {
      signal: controller.signal,
      timeout: 240000 // 4 minutes
    });
    
    clearTimeout(timeoutId);
    console.log('Scan document response:', response.data);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error scanning document:', error);
    if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
      throw new Error('Scan operation timed out. Please check scanner connection and try again.');
    }
    throw error;
  }
};

// Scan a temporary document without associating it with a record - Admin and AdminTuningDesk only
export const scanTemporaryDocument = async (config?: ScannerConfig & { documentType?: string }): Promise<DocumentScanResult> => {
  try {
    console.log('Scanning temporary document with config:', config);
    const requestData = {
      documentType: config?.documentType || 'temp',
      format: config?.format?.toLowerCase() || 'pdf',
      resolution: config?.resolution || 300
    };
    
    // Create timeout that's longer than backend timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000); // 4 minutes
    
    const response = await axios.post(`${API_URL}/scan/temp`, requestData, {
      signal: controller.signal,
      timeout: 240000 // 4 minutes
    });
    
    clearTimeout(timeoutId);
    console.log('Scan temporary document response:', response.data);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error scanning temporary document:', error);
    if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
      throw new Error('Scan operation timed out. Please check scanner connection and try again.');
    }
    throw error;
  }
};

// Get recent scans - Admin and AdminTuningDesk only
export const getRecentScans = async (limit?: number): Promise<ScanResult[]> => {
  try {
    const response = await axios.get(`${API_URL}/scan/recent${limit ? `?limit=${limit}` : ''}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error getting recent scans:', error);
    throw error;
  }
};

// Get a specific document scan - All authenticated users
export const getDocumentScan = async (id: string, type: string): Promise<ScanResult> => {
  try {
    const response = await axios.get(`${API_URL}/scan/document/${id}/${type}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error getting document scan for ${id}:`, error);
    throw error;
  }
};

// Download scan file - All authenticated users
export const downloadScan = async (scanId: string): Promise<Blob> => {
  try {
    const response = await axios.get(`${API_URL}/scan/download/${scanId}`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error(`Error downloading scan ${scanId}:`, error);
    throw error;
  }
};

// Delete scan - Admin and AdminTuningDesk only
export const deleteScan = async (scanId: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/scan/${scanId}`);
  } catch (error) {
    console.error(`Error deleting scan ${scanId}:`, error);
    throw error;
  }
};

// Get scan metadata - All authenticated users
export const getScanMetadata = async (scanId: string): Promise<ScanResult> => {
  try {
    const response = await axios.get(`${API_URL}/scan/metadata/${scanId}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error getting scan metadata for ${scanId}:`, error);
    throw error;
  }
};
