
import axios from 'axios';
import { Folder } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface FavoriteFolder {
  _id: string;
  folderId: string;
  userId: string;
  folder?: Folder;
  createdAt: Date;
}

// Get user's favorite folders
export const getFavoriteFolders = async (): Promise<FavoriteFolder[]> => {
  try {
    const response = await axios.get(`${API_URL}/favorites/folders`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching favorite folders:', error);
    throw error;
  }
};

// Add folder to favorites
export const addToFavorites = async (folderId: string): Promise<FavoriteFolder> => {
  try {
    const response = await axios.post(`${API_URL}/favorites/folders`, { folderId });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error adding folder to favorites:', error);
    throw error;
  }
};

// Remove folder from favorites
export const removeFromFavorites = async (folderId: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/favorites/folders/${folderId}`);
  } catch (error) {
    console.error('Error removing folder from favorites:', error);
    throw error;
  }
};

// Check if folder is favorited
export const isFolderFavorited = async (folderId: string): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_URL}/favorites/folders/${folderId}/check`);
    return response.data.isFavorited || false;
  } catch (error) {
    console.error('Error checking if folder is favorited:', error);
    return false;
  }
};
