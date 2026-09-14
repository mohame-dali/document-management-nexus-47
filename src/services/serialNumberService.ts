
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to extract numeric part from serial number
const extractSerialNumber = (serialNumberString: string): number | null => {
  if (!serialNumberString) return null;
  
  // If it's already a number string, parse it
  const parsed = parseInt(serialNumberString, 10);
  if (!isNaN(parsed)) {
    return parsed;
  }
  
  // Extract number from formatted strings like "IN-2025-001", "OUT-2025-001"
  const match = serialNumberString.toString().match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

export const getNextSerialNumber = async (year: number, type: 'incoming' | 'outgoing'): Promise<number> => {
  try {
    const response = await axios.get(`${API_URL}/serial-number/next`, {
      params: { year, type }
    });
    return response.data.data.nextSerialNumber;
  } catch (error) {
    console.error('Error fetching next serial number:', error);
    throw error;
  }
};

export const validateSerialNumber = async (serialNumber: string, year: number, type: 'incoming' | 'outgoing'): Promise<boolean> => {
  try {
    // Extract numeric part before sending to backend
    const numericPart = extractSerialNumber(serialNumber);
    if (numericPart === null || numericPart <= 0) {
      return false; // Invalid format
    }
    
    const response = await axios.get(`${API_URL}/serial-number/validate`, {
      params: { serialNumber: numericPart, year, type }
    });
    return response.data.data.isValid;
  } catch (error) {
    console.error('Error validating serial number:', error);
    return false; // Assume invalid if validation fails
  }
};
