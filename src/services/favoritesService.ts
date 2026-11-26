import { Folder } from '@/types';
import { getFolders } from './folderService';

const FAVORITE_FOLDERS_KEY = 'dms:favorite-folders';

export interface FavoriteFolderItem {
  _id: string;
  folder: Folder;
}

function getStoredFavoriteIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITE_FOLDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function saveFavoriteIds(ids: string[]): void {
  try {
    localStorage.setItem(FAVORITE_FOLDERS_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch (error) {
    console.error('Failed to persist favorite folders:', error);
  }
}

export const getFavoriteFolders = async (): Promise<FavoriteFolderItem[]> => {
  const favoriteIds = getStoredFavoriteIds();
  if (favoriteIds.length === 0) {
    return [];
  }

  const folders = await getFolders();
  const folderMap = new Map(folders.map((f) => [f._id, f]));

  return favoriteIds
    .map((id) => folderMap.get(id))
    .filter((folder): folder is Folder => Boolean(folder))
    .map((folder) => ({
      _id: folder._id,
      folder,
    }));
};

export const addToFavorites = async (folderId: string): Promise<void> => {
  const ids = getStoredFavoriteIds();
  if (!ids.includes(folderId)) {
    saveFavoriteIds([...ids, folderId]);
  }
};

export const removeFromFavorites = async (folderId: string): Promise<void> => {
  const ids = getStoredFavoriteIds().filter((id) => id !== folderId);
  saveFavoriteIds(ids);
};
