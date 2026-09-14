
import { useAuth } from '@/contexts/AuthContext';
import { logAuditAction } from '@/services/auditService';

export const useAuditLogger = () => {
  const { currentUser } = useAuth();

  const logAction = async (
    action: string,
    entityType: 'document' | 'folder' | 'user',
    entityId: string,
    details?: Record<string, any>
  ) => {
    if (!currentUser) return;

    try {
      await logAuditAction({
        action,
        entityType,
        entityId,
        userId: currentUser._id,
        userDetails: {
          username: currentUser.username,
          role: currentUser.role
        },
        details: details || {},
        ipAddress: await getClientIP()
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw error as this is background logging
    }
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  // Specific logging methods for common actions
  const logDocumentView = (documentId: string, documentType: string, subject?: string) => {
    return logAction('document_view', 'document', documentId, {
      documentType,
      subject
    });
  };

  const logDocumentDownload = (documentId: string, documentType: string, fileName?: string) => {
    return logAction('document_download', 'document', documentId, {
      documentType,
      fileName
    });
  };

  const logFolderAction = (action: string, folderId: string, folderName?: string) => {
    return logAction(action, 'folder', folderId, {
      folderName
    });
  };

  return { 
    logAction,
    logDocumentView,
    logDocumentDownload,
    logFolderAction
  };
};
