
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getFolders, assignDocumentToFolder } from '@/services/folderService';
import { useAuth } from '@/contexts/AuthContext';
import { Folder as FolderType } from '@/types';
import FolderTreeView from './FolderTreeView';
import { Archive, FolderOpen, Lock } from 'lucide-react';

interface DocumentFolderAssignmentProps {
  documentId: string;
  documentType: 'incoming' | 'outgoing';
  currentFolderId?: string | null;
  onAssignmentUpdate: () => void;
  readOnly?: boolean;
}

const DocumentFolderAssignment: React.FC<DocumentFolderAssignmentProps> = ({
  documentId,
  documentType,
  currentFolderId,
  onAssignmentUpdate,
  readOnly = false
}) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  
  const isAdminDepartment = currentUser?.role === 'AdminDepartment' && !readOnly;
  const targetDepartmentId = currentUser?.activeDepartment?._id;

  const { data: folders } = useQuery({
    queryKey: ['folders', targetDepartmentId],
    queryFn: () => getFolders(targetDepartmentId),
    enabled: !!targetDepartmentId,
  });

  const assignMutation = useMutation({
    mutationFn: ({ documentId, folderId, type }: { 
      documentId: string, 
      folderId: string | null, 
      type: 'incoming' | 'outgoing' 
    }) => assignDocumentToFolder(documentId, folderId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: [`${documentType}Documents`] });
      onAssignmentUpdate();
      toast.success('تم تصنيف المستند بنجاح');
    },
    onError: () => {
      toast.error('فشل في تصنيف المستند');
    }
  });

  const getCurrentFolder = () => {
    if (!currentFolderId || !folders) return null;
    return folders.find(f => f._id === currentFolderId);
  };

  const handleFolderSelect = (folder: FolderType | null) => {
    setSelectedFolder(folder);
  };

  const handleAssign = () => {
    const folderId = selectedFolder?._id || null;
    assignMutation.mutate({
      documentId,
      folderId,
      type: documentType
    });
  };

  const handleRemoveFromFolder = () => {
    assignMutation.mutate({
      documentId,
      folderId: null,
      type: documentType
    });
  };

  const currentFolder = getCurrentFolder();

  return (
    <div className="space-y-5" dir="rtl">
      {/* Current Folder Status */}
      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 sm:p-5 text-base">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-[#1a202c] flex items-center gap-2 text-base">
            <Archive className="h-5 w-5 text-[#2c5282]" />
            حالة التصنيف الحالية
          </span>
          {currentFolder && (
            <span className={`px-3 py-1 rounded text-sm font-bold ${
              currentFolder.status === 'En cours'
                ? 'bg-[#FFCB56] text-[#1a202c] border border-[#FFD758]'
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}>
              {currentFolder.status === 'En cours' ? 'نشط' : 'مغلق'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {currentFolder ? (
            <div className="flex items-center gap-2 font-bold text-[#2c5282] text-base">
              <FolderOpen className="h-5 w-5 text-[#2c5282]" />
              <span>{currentFolder.name}</span>
            </div>
          ) : (
            <span className="text-gray-500 text-base">هذا المستند غير مصنف في أي مجلد بعد</span>
          )}
        </div>
      </div>

      {/* Folder Tree */}
      <div className="bg-white border border-[#e2e8f0] rounded p-4 sm:p-5 text-base">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#e2e8f0]">
          <span className="font-bold text-[#1a202c] flex items-center gap-2 text-base">
            <FolderOpen className="h-5 w-5 text-[#2c5282]" />
            اختيار المجلد المراد التصنيف فيه
          </span>
          {!isAdminDepartment && (
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              للعرض فقط
            </span>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          <FolderTreeView
            onFolderSelect={handleFolderSelect}
            selectedFolderId={selectedFolder?._id}
            departmentId={targetDepartmentId}
            readOnly={!isAdminDepartment}
          />
        </div>
      </div>

      {/* Actions */}
      {isAdminDepartment && (
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handleAssign}
            disabled={assignMutation.isPending || !selectedFolder}
            className="flex-1 h-11 text-base rounded bg-[#2c5282] hover:bg-[#234269] text-white font-semibold shadow-none"
          >
            {assignMutation.isPending ? 'جاري التصنيف...' : 'تصنيف في المجلد المحدد'}
          </Button>
          
          {currentFolder && (
            <Button
              variant="outline"
              onClick={handleRemoveFromFolder}
              disabled={assignMutation.isPending}
              className="h-11 text-base rounded border border-red-300 text-red-600 hover:bg-red-50 font-semibold px-6"
            >
              إزالة التصنيف
            </Button>
          )}
        </div>
      )}

      {!isAdminDepartment && (
        <div className="text-center py-6">
          <Lock className="h-10 w-10 mx-auto text-gray-400 mb-2" />
          <p className="text-base text-gray-600">
            يمكن لمدير القسم فقط تغيير تصنيف المستندات
          </p>
        </div>
      )}
    </div>
  );
};

export default DocumentFolderAssignment;
