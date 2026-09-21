import api from './apiService';

export type TrashItemType = 'incoming' | 'outgoing' | 'folder' | 'message' | 'IncomingDocument' | 'OutgoingDocument' | 'Folder' | 'Message';

export type FilterType = 'all' | 'incoming' | 'outgoing' | 'folder' | 'message';

export interface TrashCounts {
  total: number;
  incoming: number;
  outgoing: number;
  folder: number;
  message: number;
}

export interface TrashItem {
  _id: string;
  type: TrashItemType;
  label: string;
  deletedAt: string;
  deletedBy?: { _id: string; username: string };
  documentId?: string;
  subject?: string;
  content?: string;
  sender?: { _id: string; username: string; photo?: string };
  recipients?: Array<{ user?: { _id: string; username: string; photo?: string } }>;
  attachments?: any[];
  name?: string;
  itemType?: string;
  [key: string]: any;
}

export interface TrashDataResponse {
  items: TrashItem[];
  counts: TrashCounts;
}

export const getTrashData = async (type?: FilterType): Promise<TrashDataResponse> => {
  const params = type && type !== 'all' ? { type } : {};
  const response = await api.get('/trash', { params });
  const rawItems = response.data?.data || [];
  const rawCounts = response.data?.counts || { total: 0, incoming: 0, outgoing: 0, folder: 0, message: 0 };

  const items = rawItems.map((item: any) => {
    let resolvedType: TrashItemType = 'incoming';
    if (item.type) {
      resolvedType = item.type;
    } else if (item.itemType === 'outgoing' || item.itemType === 'OutgoingDocument') {
      resolvedType = 'outgoing';
    } else if (item.itemType === 'folder' || item.itemType === 'Folder') {
      resolvedType = 'folder';
    } else if (item.itemType === 'message' || item.itemType === 'Message') {
      resolvedType = 'message';
    } else if (item.itemType === 'incoming' || item.itemType === 'IncomingDocument') {
      resolvedType = 'incoming';
    }

    const resolvedLabel = item.label || item.subject || item.name || item.documentId || 'عنصر بدون عنوان';

    return {
      ...item,
      type: resolvedType,
      label: resolvedLabel,
      deletedAt: item.deletedAt || item.updatedAt,
      deletedBy: item.deletedBy ? {
        _id: item.deletedBy._id || item.deletedBy,
        username: item.deletedBy.username || 'مستخدم'
      } : undefined
    };
  });

  return {
    items,
    counts: {
      total: rawCounts.total || 0,
      incoming: rawCounts.incoming || 0,
      outgoing: rawCounts.outgoing || 0,
      folder: rawCounts.folder || 0,
      message: rawCounts.message || 0
    }
  };
};

export const getTrashItems = async (type?: FilterType): Promise<TrashItem[]> => {
  const res = await getTrashData(type);
  return res.items;
};

export const restoreItem = async (type: TrashItemType, id: string): Promise<void> => {
  const normalizedType = 
    type === 'IncomingDocument' ? 'incoming' : 
    type === 'OutgoingDocument' ? 'outgoing' : 
    type === 'Folder' ? 'folder' : 
    type === 'Message' ? 'message' : type;
  await api.put(`/trash/${normalizedType}/${id}/restore`);
};

export const permanentDeleteItem = async (type: TrashItemType, id: string): Promise<void> => {
  const normalizedType = 
    type === 'IncomingDocument' ? 'incoming' : 
    type === 'OutgoingDocument' ? 'outgoing' : 
    type === 'Folder' ? 'folder' : 
    type === 'Message' ? 'message' : type;
  await api.delete(`/trash/${normalizedType}/${id}/permanent`);
};

export const emptyTrash = async (type?: FilterType): Promise<void> => {
  const params = type && type !== 'all' ? { type } : {};
  await api.delete('/trash/empty', { params });
};
