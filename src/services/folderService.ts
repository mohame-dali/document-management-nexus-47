
import axios from 'axios';
import { Folder } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get all folders
export const getFolders = async (departmentId?: string): Promise<Folder[]> => {
  try {
    const url = departmentId 
      ? `${API_URL}/folders?department=${departmentId}` 
      : `${API_URL}/folders`;
    
    console.log('Fetching folders from:', url);
    
    const response = await axios.get(url);
    const folders = response.data.data || response.data;
    
    console.log('Fetched folders:', folders.length);
    
    return folders;
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
export const createFolder = async (folderData: Partial<Folder & { parentId?: string }>): Promise<Folder> => {
  try {
    console.log('Creating folder with data:', folderData);
    const response = await axios.post(`${API_URL}/folders`, folderData);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
};

// Update a folder - AdminDepartment only
export const updateFolder = async (id: string, folderData: Partial<Folder>): Promise<Folder> => {
  try {
    console.log(`Updating folder ${id} with data:`, folderData);
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
    console.log(`Deleting folder ${id}`);
    await axios.delete(`${API_URL}/folders/${id}`);
    console.log(`Successfully deleted folder ${id}`);
  } catch (error) {
    console.error(`Error deleting folder with id ${id}:`, error);
    throw error;
  }
};

// Change folder status - AdminDepartment only
export const changeFolderStatus = async (id: string, status: 'En cours' | 'Fermé'): Promise<Folder> => {
  try {
    console.log(`Changing status of folder ${id} to ${status}`);
    const response = await axios.put(`${API_URL}/folders/${id}/status`, { status });
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error changing status of folder ${id}:`, error);
    throw error;
  }
};

// Get documents in a folder
export const getFolderDocuments = async (id: string): Promise<any> => {
  try {
    const response = await axios.get(`${API_URL}/folders/${id}/documents`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error fetching documents for folder ${id}:`, error);
    throw error;
  }
};

// Get root folders (no parent) for department
export const getRootFolders = async (departmentId: string): Promise<Folder[]> => {
  try {
    const response = await axios.get(`${API_URL}/folders/department/${departmentId}/root`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error fetching root folders for department ${departmentId}:`, error);
    throw error;
  }
};

// Get subfolders of a folder
export const getSubFolders = async (id: string): Promise<Folder[]> => {
  try {
    const response = await axios.get(`${API_URL}/folders/${id}/subfolders`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error fetching subfolders for folder ${id}:`, error);
    throw error;
  }
};

// Move folder to different parent - AdminDepartment only
export const moveFolder = async (id: string, newParentId: string | null): Promise<Folder> => {
  try {
    console.log(`Moving folder ${id} to parent ${newParentId}`);
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
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error fetching folder hierarchy for department ${departmentId}:`, error);
    throw error;
  }
};

// Assign document to folder - AdminDepartment only
export const assignDocumentToFolder = async (
  documentId: string,
  folderId: string | null,
  documentType: 'incoming' | 'outgoing'
): Promise<any> => {
  try {
    console.log(`Assigning ${documentType} document ${documentId} to folder ${folderId}`);
    const response = await axios.put(`${API_URL}/${documentType}-documents/${documentId}/folder`, {
      folderId
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error assigning document ${documentId} to folder:`, error);
    throw error;
  }
};

// Create subfolder - AdminDepartment only
export const createSubfolder = async (
  parentId: string,
  name: string,
  departmentId: string
): Promise<Folder> => {
  try {
    console.log(`Creating subfolder "${name}" under parent ${parentId} in department ${departmentId}`);
    const response = await axios.post(`${API_URL}/folders`, {
      name,
      parentId,
      department: departmentId,
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error creating subfolder:`, error);
    throw error;
  }
};
