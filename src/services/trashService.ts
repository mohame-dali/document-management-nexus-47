import api from './apiService';

export type TrashItemType = 'IncomingDocument' | 'OutgoingDocument' | 'Folder';

export interface TrashItem {
  _id: string;
  type: TrashItemType;
  label: string;
  deletedAt: string;
  deletedBy?: { _id: string; username: string };
  documentId?: string;
  subject?: string;
  name?: string;
  itemType?: string;
  [key: string]: any;
}

export const getTrashItems = async (type?: 'all' | 'incoming' | 'outgoing' | 'folder'): Promise<TrashItem[]> => {
  const params = type && type !== 'all' ? { type } : {};
  const response = await api.get('/trash', { params });
  const rawItems = response.data?.data || [];
  
  return rawItems.map((item: any) => {
    let resolvedType: TrashItemType = 'IncomingDocument';
    if (item.type) {
      resolvedType = item.type;
    } else if (item.itemType === 'outgoing' || item.itemType === 'OutgoingDocument') {
      resolvedType = 'OutgoingDocument';
    } else if (item.itemType === 'folder' || item.itemType === 'Folder') {
      resolvedType = 'Folder';
    } else if (item.itemType === 'incoming' || item.itemType === 'IncomingDocument') {
      resolvedType = 'IncomingDocument';
    }

    const resolvedLabel = item.label || item.subject || item.name || item.documentId || 'عنصر بدون عنوان';

    return {
      ...item,
      type: resolvedType,
      label: resolvedLabel,
      deletedAt: item.deletedAt,
      deletedBy: item.deletedBy ? {
        _id: item.deletedBy._id || item.deletedBy,
        username: item.deletedBy.username || 'مستخدم'
      } : undefined
    };
  });
};

export const restoreItem = async (type: TrashItemType, id: string): Promise<void> => {
  const normalizedType = type === 'IncomingDocument' ? 'incoming' : type === 'OutgoingDocument' ? 'outgoing' : type === 'Folder' ? 'folder' : type;
  await api.put(`/trash/${normalizedType}/${id}/restore`);
};

export const permanentDeleteItem = async (type: TrashItemType, id: string): Promise<void> => {
  const normalizedType = type === 'IncomingDocument' ? 'incoming' : type === 'OutgoingDocument' ? 'outgoing' : type === 'Folder' ? 'folder' : type;
  await api.delete(`/trash/${normalizedType}/${id}/permanent`);
};

export const emptyTrash = async (type?: 'all' | 'incoming' | 'outgoing' | 'folder'): Promise<void> => {
  const params = type && type !== 'all' ? { type } : {};
  await api.delete('/trash/empty', { params });
};
