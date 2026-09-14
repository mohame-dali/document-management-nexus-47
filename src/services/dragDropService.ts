
import { assignDocumentToFolder } from './folderService';
import { logAuditAction } from './auditService';

export interface DragDropResult {
  success: boolean;
  message: string;
  data?: any;
}

// Handle document drop to folder
export const handleDocumentDrop = async (
  documentId: string,
  documentType: 'incoming' | 'outgoing',
  targetFolderId: string | null,
  userId: string
): Promise<DragDropResult> => {
  try {
    // Assign document to folder
    const updatedDocument = await assignDocumentToFolder(documentId, targetFolderId, documentType);
    
    // Log audit action
    await logAuditAction({
      action: targetFolderId ? 'document_moved_to_folder' : 'document_removed_from_folder',
      entityType: 'document',
      entityId: documentId,
      userId,
      details: {
        documentType,
        targetFolderId,
        documentTitle: updatedDocument.subject || 'Unknown',
      }
    });

    return {
      success: true,
      message: targetFolderId ? 'تم نقل المستند إلى المجلد بنجاح' : 'تم إزالة المستند من المجلد بنجاح',
      data: updatedDocument
    };
  } catch (error: any) {
    console.error('Error handling document drop:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'فشل في نقل المستند'
    };
  }
};

// Validate drop operation
export const validateDrop = (
  dragType: string,
  dropType: string,
  dragData: any,
  dropData: any
): boolean => {
  // Document to folder
  if (dragType === 'document' && dropType === 'folder') {
    return true;
  }
  
  // Document to favorites (remove from current folder)
  if (dragType === 'document' && dropType === 'favorites') {
    return true;
  }
  
  return false;
};
