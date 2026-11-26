import { assignDocumentToFolder } from './folderService';

export interface DragDropResult {
  success: boolean;
  message: string;
}

export const handleDocumentDrop = async (
  documentId: string,
  documentType: 'incoming' | 'outgoing',
  folderId: string | null,
  _userId?: string
): Promise<DragDropResult> => {
  try {
    const res = await assignDocumentToFolder(documentId, folderId, documentType);
    return {
      success: true,
      message: res?.message || 'تم تحديث تصنيف المستند بنجاح',
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'فشل في نقل المستند';
    return {
      success: false,
      message,
    };
  }
};
