
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface DocumentOption {
  _id: string;
  category: 'activity' | 'source' | 'typeDocument' | 'assignedTo' | 'pourInfo';
  documentType: 'incoming' | 'outgoing' | 'both';
  value: string;
  isActive: boolean;
  createdBy: {
    _id: string;
    username: string;
  };
  createdAt: string;
}

export const getDocumentOptions = async (filters?: {
  category?: string;
  documentType?: string;
}): Promise<DocumentOption[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.documentType) params.append('documentType', filters.documentType);
    
    const url = params.toString() ? `${API_URL}/document-options?${params}` : `${API_URL}/document-options`;
    const response = await axios.get(url);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching document options:', error);
    throw error;
  }
};

export const createDocumentOption = async (optionData: {
  category: string;
  documentType: string;
  value: string;
}): Promise<DocumentOption> => {
  try {
    const response = await axios.post(`${API_URL}/document-options`, optionData);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error creating document option:', error);
    throw error;
  }
};

export const updateDocumentOption = async (
  id: string,
  updateData: { value?: string; isActive?: boolean }
): Promise<DocumentOption> => {
  try {
    const response = await axios.put(`${API_URL}/document-options/${id}`, updateData);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error updating document option:', error);
    throw error;
  }
};

export const deleteDocumentOption = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/document-options/${id}`);
  } catch (error) {
    console.error('Error deleting document option:', error);
    throw error;
  }
};
