
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface AuditLog {
  _id: string;
  action: string;
  entityType: 'document' | 'folder' | 'user';
  entityId: string;
  userId: string;
  userDetails: {
    username: string;
    role: string;
  };
  details: Record<string, any>;
  createdAt: Date;
  ipAddress?: string;
}

export interface AuditLogFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: string;
  entityType?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogsResponse {
  success: boolean;
  data: AuditLog[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    startDate: string | null;
    endDate: string | null;
    userId: string | null;
    action: string | null;
    entityType: string | null;
  };
}

// Create axios instance with interceptors
const auditApi = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Add auth token to requests
auditApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors
auditApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Get audit logs with enhanced error handling and response parsing
export const getAuditLogs = async (filters?: AuditLogFilters): Promise<AuditLogsResponse> => {
  try {
    const params = new URLSearchParams();
    
    if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.entityType) params.append('entityType', filters.entityType);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    console.log('Fetching audit logs with params:', params.toString());

    const response = await auditApi.get(`/audit-logs?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new Error('ليس لديك صلاحية لعرض سجلات التدقيق.');
      }
    }
    throw new Error('فشل في جلب سجلات التدقيق. يرجى المحاولة مرة أخرى.');
  }
};

// Export audit logs with enhanced error handling
export const exportAuditLogs = async (format: 'csv' | 'pdf', filters?: AuditLogFilters): Promise<Blob> => {
  try {
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.entityType) params.append('entityType', filters.entityType);

    console.log('Exporting audit logs with params:', params.toString());

    const response = await auditApi.get(`/audit-logs/export?${params.toString()}`, {
      responseType: 'blob',
      timeout: 60000
    });
    
    return response.data;
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('انتهت مهلة التصدير. يرجى تقليل نطاق البيانات والمحاولة مرة أخرى.');
      } else if (error.response?.status === 400) {
        throw new Error('معايير التصدير غير صحيحة. يرجى التحقق من المرشحات.');
      } else if (error.response?.status === 500) {
        throw new Error('خطأ في الخادم أثناء التصدير. يرجى المحاولة لاحقاً.');
      }
    }
    throw new Error('فشل في تصدير سجلات التدقيق. يرجى المحاولة مرة أخرى.');
  }
};

// Get document timeline with enhanced error handling
export const getDocumentTimeline = async (documentId: string): Promise<AuditLog[]> => {
  try {
    console.log('Fetching document timeline for:', documentId);

    const response = await auditApi.get(`/audit-logs/document/${documentId}/timeline`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching document timeline:', error);
    throw new Error('فشل في جلب تاريخ المستند. يرجى المحاولة مرة أخرى.');
  }
};

// Log audit action (for client-side logging)
export const logAuditAction = async (auditData: Partial<AuditLog>): Promise<void> => {
  try {
    await auditApi.post('/audit-logs', auditData);
    console.log('Audit action logged successfully:', auditData.action);
  } catch (error) {
    console.error('Error logging audit action:', error);
    // Don't throw error as this is background logging
  }
};
