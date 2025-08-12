
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Archive className="h-4 w-4" />
            حالة التصنيف الحالية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {currentFolder ? (
              <>
                <FolderOpen className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{currentFolder.name}</span>
                <Badge variant={currentFolder.status === 'En cours' ? 'default' : 'secondary'}>
                  {currentFolder.status === 'En cours' ? 'نشط' : 'مغلق'}
                </Badge>
              </>
            ) : (
              <span className="text-gray-500">غير مصنف</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Folder Tree */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            اختيار المجلد
            {!isAdminDepartment && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                للعرض فقط
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto border rounded-md p-2">
            <FolderTreeView
              onFolderSelect={handleFolderSelect}
              selectedFolderId={selectedFolder?._id}
              departmentId={targetDepartmentId}
              readOnly={!isAdminDepartment}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {isAdminDepartment && (
        <div className="flex gap-2">
          <Button
            onClick={handleAssign}
            disabled={assignMutation.isPending}
            className="flex-1"
          >
            {assignMutation.isPending ? 'جاري التصنيف...' : 'تصنيف في المجلد المحدد'}
          </Button>
          
          {currentFolder && (
            <Button
              variant="outline"
              onClick={handleRemoveFromFolder}
              disabled={assignMutation.isPending}
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
