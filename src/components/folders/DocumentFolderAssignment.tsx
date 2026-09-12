
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
    <div className="space-y-4" dir="rtl">
      {/* Current Folder Status */}
      <div className="bg-white border border-[#e2e8f0] rounded p-3 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-700 flex items-center gap-1.5">
            <Archive className="h-3.5 w-3.5 text-[#2c5282]" />
            حالة التصنيف الحالية
          </span>
          {currentFolder && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
              currentFolder.status === 'En cours'
                ? 'bg-[#FFCB56] text-[#78350f] border border-[#FFD758]'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}>
              {currentFolder.status === 'En cours' ? 'نشط' : 'مغلق'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentFolder ? (
            <div className="flex items-center gap-1.5 font-medium text-gray-800">
              <FolderOpen className="h-4 w-4 text-[#2c5282]" />
              <span>{currentFolder.name}</span>
            </div>
          ) : (
            <span className="text-gray-400">هذا المستند غير مصنف في أي مجلد بعد</span>
          )}
        </div>
      </div>

      {/* Folder Tree */}
      <div className="bg-white border border-[#e2e8f0] rounded p-3 text-xs">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#f1f5f9]">
          <span className="font-semibold text-gray-700 flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5 text-[#2c5282]" />
            اختيار المجلد المراد التصنيف فيه
          </span>
          {!isAdminDepartment && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              للعرض فقط
            </span>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto">
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
        <div className="flex gap-2">
          <Button
            onClick={handleAssign}
            disabled={assignMutation.isPending || !selectedFolder}
            className="flex-1 h-8 text-xs rounded bg-[#2c5282] hover:bg-[#234269] text-white font-medium"
          >
            {assignMutation.isPending ? 'جاري التصنيف...' : 'تصنيف في المجلد المحدد'}
          </Button>
          
          {currentFolder && (
            <Button
              variant="outline"
              onClick={handleRemoveFromFolder}
              disabled={assignMutation.isPending}
              className="h-8 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50"
            >
              إزالة التصنيف
            </Button>
          )}
        </div>
      )}

      {!isAdminDepartment && (
        <div className="text-center py-4">
          <Lock className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-muted-foreground">
            يمكن لمدير القسم فقط تغيير تصنيف المستندات
          </p>
        </div>
      )}
    </div>
  );
};

export default DocumentFolderAssignment;
