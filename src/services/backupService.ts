import api from './apiService';

export interface BackupStats {
  totalIncomingDocuments: number;
  totalOutgoingDocuments: number;
  totalFileSize: string;
  lastBackupDate: string | null;
  documentsCreatedToday: number;
  documentsCreatedThisWeek: number;
  documentsCreatedThisMonth: number;
}

export interface BackupPolicy {
  _id?: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  includeAttachments: boolean;
  compressionLevel: 'low' | 'medium' | 'high';
  retentionDays: number;
  lastBackupDate?: string | null;
  nextScheduledBackup?: string | null;
}

export interface BackupHistoryItem {
  _id: string;
  type: 'manual' | 'automatic';
  status: 'in_progress' | 'completed' | 'failed';
  fileName: string;
  fileSize: number;
  documentsCount: {
    incomingDocuments: number;
    outgoingDocuments: number;
  };
  includeAttachments: boolean;
  compressionLevel: string;
  startTime: string;
  endTime: string | null;
  errorMessage: string | null;
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BackupStatus {
  _id: string;
  status: 'in_progress' | 'completed' | 'failed';
  fileName: string;
  filePath?: string;
  fileSize: number;
  errorMessage: string | null;
}

class BackupService {
  async getBackupStats(): Promise<BackupStats> {
    const response = await api.get('/backup/stats');
    return response.data.data;
  }

  async getBackupPolicy(): Promise<BackupPolicy> {
    const response = await api.get('/backup/policy');
    return response.data.data;
  }

  async updateBackupPolicy(policy: Omit<BackupPolicy, '_id'>): Promise<BackupPolicy> {
    const response = await api.put('/backup/policy', policy);
    return response.data.data;
  }

  async createBackup(year?: number, exportPath?: string): Promise<{ backupId: string; message: string }> {
    const response = await api.post('/backup/create', { year, exportPath });
    return response.data.data;
  }

  async getBackupStatus(backupId: string): Promise<BackupStatus> {
    const response = await api.get(`/backup/status/${backupId}`);
    return response.data.data;
  }

  async getBackupHistory(page: number = 1, limit: number = 10): Promise<{
    data: BackupHistoryItem[];
    count: number;
    pagination?: {
      next?: { page: number; limit: number };
      prev?: { page: number; limit: number };
    };
  }> {
    const response = await api.get(`/backup/history?page=${page}&limit=${limit}`);
    return response.data;
  }
}

export const backupService = new BackupService();