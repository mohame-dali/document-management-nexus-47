import { Folder } from '@/types';

export interface RecentFolderEntry {
  _id: string;
  name: string;
  departmentId?: string;
}

const STORAGE_PREFIX = 'dms:recentFolders:';
const MAX_RECENT_FOLDERS = 5;

export function extractFolderDepartmentId(department: unknown): string | undefined {
  if (!department) return undefined;
  if (typeof department === 'string') return department;
  if (typeof department === 'object' && '_id' in department) {
    const id = (department as { _id?: unknown })._id;
    return typeof id === 'string' ? id : id ? String(id) : undefined;
  }
  return undefined;
}

export function extractFolderParentId(parent: unknown): string | null {
  if (!parent) return null;
  if (typeof parent === 'string') return parent;
  if (typeof parent === 'object' && '_id' in parent) {
    const id = (parent as { _id?: unknown })._id;
    return typeof id === 'string' ? id : id ? String(id) : null;
  }
  return null;
}

export function getRecentFolders(userId?: string): RecentFolderEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId || 'anon'}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentFolderEntry =>
        Boolean(item && typeof item._id === 'string' && typeof item.name === 'string')
    );
  } catch {
    return [];
  }
}

export function recordRecentFolder(
  userId: string | undefined,
  folder: { _id: string; name: string; department?: unknown }
): void {
  if (typeof window === 'undefined' || !folder?._id || !folder?.name) return;
  try {
    const key = `${STORAGE_PREFIX}${userId || 'anon'}`;
    const existing = getRecentFolders(userId);
    const nextEntry: RecentFolderEntry = {
      _id: folder._id,
      name: folder.name,
      departmentId: extractFolderDepartmentId(folder.department),
    };
    const merged = [nextEntry, ...existing.filter((item) => item._id !== folder._id)].slice(
      0,
      MAX_RECENT_FOLDERS
    );
    localStorage.setItem(key, JSON.stringify(merged));
  } catch {
    // Ignore storage quota errors
  }
}

export function getFolderBreadcrumbPath(folderId: string, folders: Folder[]): string {
  if (!folderId || !folders.length) return '';
  const byId = new Map<string, Folder>();
  folders.forEach((f) => byId.set(f._id, f));

  const names: string[] = [];
  const visited = new Set<string>();
  let current: Folder | undefined = byId.get(folderId);

  while (current && !visited.has(current._id)) {
    visited.add(current._id);
    names.unshift(current.name);
    const parentId = extractFolderParentId(current.parent);
    current = parentId ? byId.get(parentId) : undefined;
  }

  return names.join(' / ');
}
