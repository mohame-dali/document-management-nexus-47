import axios from 'axios';
import { Folder, IncomingDocument, OutgoingDocument } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get all folders
export const getFolders = async (departmentId?: string, search?: string, status?: string): Promise<Folder[]> => {
  try {
    const params = new URLSearchParams();
    if (departmentId) params.append('department', departmentId);
    if (search) params.append('search', search);
    if (status) params.append('status', status);

    const queryString = params.toString();
    const url = `${API_URL}/folders${queryString ? `?${queryString}` : ''}`;
    
    const response = await axios.get(url);
    const folders = response.data.data || response.data;
    return Array.isArray(folders) ? folders : [];
  } catch (error) {
    console.error('Error fetching folders:', error);
    throw error;
  }
};

// Get a specific folder by ID
export const getFolder = async (id: string): Promise<Folder> => {
  try {
    const response = await axios.get(`${API_URL}/folders/${id}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error fetching folder with id ${id}:`, error);
    throw error;
  }
};

// Create a new folder - AdminDepartment only
export const createFolder = async (folderData: Partial<Folder & { parentId?: string; color?: string }>): Promise<Folder> => {
  try {
    const response = await axios.post(`${API_URL}/folders`, folderData);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
};

// Update a folder - AdminDepartment only
export const updateFolder = async (id: string, folderData: Partial<Folder & { parentId?: string | null; color?: string }>): Promise<Folder> => {
  try {
    const response = await axios.put(`${API_URL}/folders/${id}`, folderData);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error updating folder with id ${id}:`, error);
    throw error;
  }
};

// Delete a folder - AdminDepartment only
export const deleteFolder = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/folders/${id}`);
  } catch (error) {
    console.error(`Error deleting folder with id ${id}:`, error);
    throw error;
  }
};

// Change folder status - AdminDepartment only
export const changeFolderStatus = async (id: string, status: 'En cours' | 'Fermé'): Promise<Folder> => {
  try {
    const response = await axios.put(`${API_URL}/folders/${id}/status`, { status });
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error changing status of folder ${id}:`, error);
    throw error;
  }
};

// Get documents in a folder
export const getFolderDocuments = async (id: string): Promise<{ incomingDocuments: IncomingDocument[]; outgoingDocuments: OutgoingDocument[] }> => {
  try {
    const response = await axios.get(`${API_URL}/folders/${id}/documents`);
    return response.data.data || response.data || { incomingDocuments: [], outgoingDocuments: [] };
  } catch (error) {
    console.error(`Error fetching documents for folder ${id}:`, error);
    throw error;
  }
};

// Get root folders (no parent) for department
export const getRootFolders = async (departmentId: string): Promise<Folder[]> => {
  try {
    const response = await axios.get(`${API_URL}/folders/department/${departmentId}/root`);
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching root folders for department ${departmentId}:`, error);
    throw error;
  }
};

// Get subfolders of a folder
export const getSubFolders = async (id: string): Promise<Folder[]> => {
  try {
    const response = await axios.get(`${API_URL}/folders/${id}/subfolders`);
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching subfolders for folder ${id}:`, error);
    throw error;
  }
};

// Move folder to different parent - AdminDepartment only
export const moveFolder = async (id: string, newParentId: string | null): Promise<Folder> => {
  try {
    const response = await axios.put(`${API_URL}/folders/${id}/move`, { parentId: newParentId });
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error moving folder ${id}:`, error);
    throw error;
  }
};

// Get folder hierarchy for department
export const getFolderHierarchy = async (departmentId: string): Promise<Folder[]> => {
  try {
    const response = await axios.get(`${API_URL}/folders/department/${departmentId}/hierarchy`);
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching folder hierarchy for department ${departmentId}:`, error);
    throw error;
  }
};

// Assign or move a document to a folder
export const assignDocumentToFolder = async (
  documentId: string,
  folderId: string | null,
  documentType: 'incoming' | 'outgoing'
): Promise<{ success: boolean; message?: string }> => {
  try {
    // Try folders/assign-document first
    const response = await axios.put(`${API_URL}/folders/assign-document`, {
      documentId,
      folderId,
      type: documentType
    });
    return response.data.data || response.data;
  } catch (error: unknown) {
    // Fallback to document route if available
    try {
      const fallbackResponse = await axios.put(`${API_URL}/${documentType}-documents/${documentId}/folder`, {
        folderId
      });
      return fallbackResponse.data.data || fallbackResponse.data;
    } catch {
      throw error;
    }
  }
};

// Batch move documents
export const batchMoveDocuments = async (
  documentIds: string[],
  folderId: string | null,
  documentType: 'incoming' | 'outgoing'
): Promise<{ success: boolean; message?: string; count?: number }> => {
  try {
    const response = await axios.put(`${API_URL}/folders/batch-move-documents`, {
      documentIds,
      folderId,
      type: documentType
    });
    return response.data;
  } catch (error) {
    console.error('Error batch moving documents:', error);
    throw error;
  }
};

// Create subfolder - AdminDepartment only
export const createSubfolder = async (
  parentId: string,
  name: string,
  departmentId: string,
  description?: string
): Promise<Folder> => {
  try {
    const response = await axios.post(`${API_URL}/folders`, {
      name,
      description: description || '',
      parentId,
      department: departmentId,
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error creating subfolder:`, error);
    throw error;
  }
};
