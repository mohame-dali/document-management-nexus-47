import axios from 'axios';
import { IncomingDocument, OutgoingDocument } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Set up axios defaults
axios.defaults.withCredentials = true;

// Create axios instance with proper configuration
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Advanced Search API calls
export const advancedSearchDocuments = async (filters: {
  keyword?: string;
  documentType?: 'all' | 'incoming' | 'outgoing';
  year?: string;
  dateFrom?: string;
  dateTo?: string;
  serialNumber?: string;
  subject?: string;
  source?: string;
  page?: number;
  limit?: number;
}): Promise<{ 
  incoming: IncomingDocument[]; 
  outgoing: OutgoingDocument[];
  hasMore?: boolean;
  totalCount?: number;
}> => {
  try {
    let results = { incoming: [], outgoing: [], hasMore: false, totalCount: 0 };
    
    // Build search parameters
    const params = new URLSearchParams();
    if (filters.keyword) params.append('q', filters.keyword);
    if (filters.year) params.append('year', filters.year);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.serialNumber) params.append('serialNumber', filters.serialNumber);
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.source) params.append('source', filters.source);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    
    let incomingCount = 0;
    let outgoingCount = 0;
    let incomingHasMore = false;
    let outgoingHasMore = false;
    
    // Search incoming documents if needed
    if (filters.documentType === 'all' || filters.documentType === 'incoming') {
      try {
        const response = await api.get(`${API_URL}/incoming-documents/search?${params.toString()}`);
        results.incoming = response.data.data || response.data || [];
        incomingCount = response.data.totalCount || 0;
        incomingHasMore = response.data.hasMore || false;
      } catch (error) {
        console.error('Error searching incoming documents:', error);
      }
    }
    
    // Search outgoing documents if needed
    if (filters.documentType === 'all' || filters.documentType === 'outgoing') {
      try {
        const response = await api.get(`${API_URL}/outgoing-documents/search?${params.toString()}`);
        results.outgoing = response.data.data || response.data || [];
        outgoingCount = response.data.totalCount || 0;
        outgoingHasMore = response.data.hasMore || false;
      } catch (error) {
        console.error('Error searching outgoing documents:', error);
      }
    }
    
    // Calculate combined totals
    results.totalCount = incomingCount + outgoingCount;
    results.hasMore = incomingHasMore || outgoingHasMore;
    
    return results;
  } catch (error) {
    console.error('Error in advanced search:', error);
    throw error;
  }
};

// Incoming Documents API calls with pagination
export const getIncomingDocuments = async (filters?: { 
  department?: string; 
  year?: string; 
  page?: number; 
  limit?: number; 
}): Promise<{
  data: IncomingDocument[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}> => {
  try {
    const params = new URLSearchParams();
    
    if (filters?.department) {
      params.append('department', filters.department);
    }
    
    if (filters?.year) {
      params.append('year', filters.year);
    }
    
    if (filters?.page) {
      params.append('page', filters.page.toString());
    }
    
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }
    
    const url = `${API_URL}/incoming-documents?${params.toString()}`;
    const response = await api.get(url);
    
    return {
      data: response.data.data || [],
      totalCount: response.data.totalCount || 0,
      page: response.data.page || 1,
      limit: response.data.limit || 20,
      hasMore: response.data.hasMore || false
    };
  } catch (error) {
    console.error('Error fetching incoming documents:', error);
    throw error;
  }
};

export const getIncomingDocument = async (id: string): Promise<IncomingDocument> => {
  try {
    // Ensure we're sending a clean string ID
    const cleanId = typeof id === 'object' ? (id as any)._id || (id as any).id || String(id) : String(id);
    console.log('Fetching incoming document with ID:', cleanId);
    
    const response = await api.get(`${API_URL}/incoming-documents/${cleanId}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error fetching incoming document with id ${id}:`, error);
    throw error;
  }
};

export const createIncomingDocument = async (documentData: FormData | any): Promise<IncomingDocument> => {
  try {
    const headers: Record<string, string> = {};
    
    if (!(documentData instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await api.post(`${API_URL}/incoming-documents`, documentData, { headers });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error creating incoming document:', error);
    throw error;
  }
};

export const updateIncomingDocument = async (id: string, formData: FormData) => {
  try {
    const response = await api.put(`${API_URL}/incoming-documents/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  } catch (error) {
    console.error('Error updating incoming document:', error);
    throw error;
  }
};

export const deleteIncomingDocument = async (documentId: string): Promise<void> => {
  try {
    await api.delete(`/incoming-documents/${documentId}`);
  } catch (error) {
    console.error('Error deleting incoming document:', error);
    throw error;
  }
};

export const assignResponsible = async (documentId: string, userId: string): Promise<IncomingDocument> => {
  try {
    const response = await api.put(`${API_URL}/incoming-documents/${documentId}/responsible`, { userId });
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error assigning responsible for document ${documentId}:`, error);
    throw error;
  }
};

export const addAnswer = async (documentId: string, outgoingDocumentId: string): Promise<IncomingDocument> => {
  try {
    const response = await api.post(`${API_URL}/incoming-documents/${documentId}/answer`, { 
      outgoingDocumentId 
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error adding answer to document ${documentId}:`, error);
    throw error;
  }
};

export const assignIncomingToFolder = async (documentId: string, folderId: string): Promise<IncomingDocument> => {
  try {
    const response = await api.put(`${API_URL}/incoming-documents/${documentId}/folder`, { folderId });
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error assigning document ${documentId} to folder:`, error);
    throw error;
  }
};

// Outgoing Documents API calls with pagination
export const getOutgoingDocuments = async (filters?: { 
  department?: string; 
  year?: string; 
  page?: number; 
  limit?: number; 
}): Promise<{
  data: OutgoingDocument[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}> => {
  try {
    const params = new URLSearchParams();
    
    if (filters?.department) {
      params.append('department', filters.department);
    }
    
    if (filters?.year) {
      params.append('year', filters.year);
    }
    
    if (filters?.page) {
      params.append('page', filters.page.toString());
    }
    
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }
    
    const url = `${API_URL}/outgoing-documents?${params.toString()}`;
    const response = await api.get(url);
    
    return {
      data: response.data.data || [],
      totalCount: response.data.totalCount || 0,
      page: response.data.page || 1,
      limit: response.data.limit || 20,
      hasMore: response.data.hasMore || false
    };
  } catch (error) {
    console.error('Error fetching outgoing documents:', error);
    throw error;
  }
};

export const getOutgoingDocument = async (id: string): Promise<OutgoingDocument> => {
  try {
    // Ensure we're sending a clean string ID
    const cleanId = typeof id === 'object' ? (id as any)._id || (id as any).id || String(id) : String(id);
    console.log('Fetching outgoing document with ID:', cleanId);
    
    const response = await api.get(`${API_URL}/outgoing-documents/${cleanId}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error fetching outgoing document with id ${id}:`, error);
    throw error;
  }
};

export const createOutgoingDocument = async (documentData: FormData | any): Promise<OutgoingDocument> => {
  try {
    const headers: Record<string, string> = {};
    
    if (!(documentData instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await api.post(`${API_URL}/outgoing-documents`, documentData, { headers });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error creating outgoing document:', error);
    throw error;
  }
};

export const updateOutgoingDocument = async (id: string, formData: FormData) => {
  try {
    const response = await api.put(`${API_URL}/outgoing-documents/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  } catch (error) {
    console.error('Error updating outgoing document:', error);
    throw error;
  }
};

export const deleteOutgoingDocument = async (documentId: string): Promise<void> => {
  try {
    await api.delete(`/outgoing-documents/${documentId}`);
  } catch (error) {
    console.error('Error deleting outgoing document:', error);
    throw error;
  }
};

export const assignOutgoingToFolder = async (documentId: string, folderId: string): Promise<OutgoingDocument> => {
  try {
    const response = await api.put(`${API_URL}/outgoing-documents/${documentId}/folder`, { folderId });
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error assigning outgoing document ${documentId} to folder:`, error);
    throw error;
  }
};

// Backward compatibility functions for existing code
export const getIncomingDocumentsList = async (filters?: { department?: string; year?: string }): Promise<IncomingDocument[]> => {
  try {
    const result = await getIncomingDocuments(filters);
    return result.data;
  } catch (error) {
    console.error('Error fetching incoming documents list:', error);
    throw error;
  }
};

export const getOutgoingDocumentsList = async (filters?: { department?: string; year?: string }): Promise<OutgoingDocument[]> => {
  try {
    const result = await getOutgoingDocuments(filters);
    return result.data;
  } catch (error) {
    console.error('Error fetching outgoing documents list:', error);
    throw error;
  }
};

// Search functionalities
export const searchIncomingDocuments = async (query: string): Promise<IncomingDocument[]> => {
  try {
    const response = await api.get(`${API_URL}/incoming-documents/search?q=${encodeURIComponent(query)}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error searching incoming documents:', error);
    throw error;
  }
};

export const searchOutgoingDocuments = async (query: string): Promise<OutgoingDocument[]> => {
  try {
    const response = await api.get(`${API_URL}/outgoing-documents/search?q=${encodeURIComponent(query)}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error searching outgoing documents:', error);
    throw error;
  }
};

// Get documents by department
export const getIncomingDocumentsByDepartment = async (departmentId: string): Promise<IncomingDocument[]> => {
  try {
    const response = await api.get(`${API_URL}/incoming-documents?department=${departmentId}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error fetching incoming documents for department ${departmentId}:`, error);
    throw error;
  }
};

export const getOutgoingDocumentsByDepartment = async (departmentId: string): Promise<OutgoingDocument[]> => {
  try {
    const response = await api.get(`${API_URL}/outgoing-documents?department=${departmentId}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error fetching outgoing documents for department ${departmentId}:`, error);
    throw error;
  }
};

// Document file access helper - Fixed to handle Windows paths
export const getDocumentUrl = (documentPath: string): string => {
  if (!documentPath) return '';
  
  if (documentPath.startsWith('http')) {
    return documentPath;
  }
  
  // Clean up Windows-style paths and convert to web paths
  let cleanPath = documentPath;
  
  // Remove drive letters like "S:/" or "C:/"
  cleanPath = cleanPath.replace(/^[A-Za-z]:\//, '');
  
  // Replace backslashes with forward slashes
  cleanPath = cleanPath.replace(/\\/g, '/');
  
  // Remove any leading slashes
  cleanPath = cleanPath.replace(/^\/+/, '');
  
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}/${cleanPath}`;
};

// Document download helper - Updated to use fixed URL construction
export const downloadDocument = async (documentPath: string, filename?: string): Promise<void> => {
  try {
    const url = getDocumentUrl(documentPath);
    const response = await api.get(url, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || documentPath.split('/').pop() || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
};
