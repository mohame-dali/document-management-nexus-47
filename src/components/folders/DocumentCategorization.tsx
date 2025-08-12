
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getFolders, assignDocumentToFolder } from '@/services/folderService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Folder, FolderOpen, Archive, Lock } from 'lucide-react';

interface DocumentCategorizationProps {
  documentId: string;
  documentType: 'incoming' | 'outgoing';
  currentFolder: string | null;
  onCategorizationUpdate: () => void;
}

const DocumentCategorization: React.FC<DocumentCategorizationProps> = ({
  documentId,
  documentType,
  currentFolder,
  onCategorizationUpdate
}) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const [selectedFolder, setSelectedFolder] = useState<string>(currentFolder || '');

  const isAdminDepartment = currentUser?.role === 'AdminDepartment';

  const { data: folders } = useQuery({
    queryKey: ['folders', currentUser?.activeDepartment?._id],
    queryFn: () => getFolders(currentUser?.activeDepartment?._id),
    enabled: !!currentUser?.activeDepartment
  });

  const categorizeMutation = useMutation({
    mutationFn: ({ documentId, folderId, type }: { 
      documentId: string, 
      folderId: string | null, 
      type: 'incoming' | 'outgoing' 
    }) => assignDocumentToFolder(documentId, folderId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['outgoingDocuments'] });
      onCategorizationUpdate();
      toast.success('تم تصنيف المستند بنجاح');
    },
    onError: () => {
      toast.error('فشل في تصنيف المستند');
    }
  });

  const handleCategorize = () => {
    const folderId = selectedFolder || null;
    categorizeMutation.mutate({
      documentId: documentId,
      folderId: folderId,
      type: documentType
    });
  };

  const getCurrentFolderName = () => {
    if (!currentFolder || !folders) return 'غير مصنف';
    const folder = folders.find(f => f._id === currentFolder);
    return folder?.name || 'غير مصنف';
  };

  return (
    <Card className="w-full" dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          تصنيف المستندات
          {!isAdminDepartment && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              للعرض فقط
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Label>المجلد الحالي:</Label>
          <Badge variant={currentFolder ? 'default' : 'secondary'} className="flex items-center gap-1">
            {currentFolder ? <FolderOpen className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
            {getCurrentFolderName()}
          </Badge>
        </div>

        {isAdminDepartment ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="folder">اختر المجلد الجديد</Label>
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger id="folder">
                  <SelectValue placeholder="اختر مجلداً أو اتركه فارغاً" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      بدون تصنيف
                    </div>
                  </SelectItem>
                  {folders?.map((folder) => (
                    <SelectItem key={folder._id} value={folder._id}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        {folder.name}
                        <Badge variant={folder.status === 'En cours' ? 'default' : 'secondary'} className="text-xs">
                          {folder.status === 'En cours' ? 'نشط' : 'مغلق'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleCategorize} 
              disabled={categorizeMutation.isPending} 
              className="w-full flex items-center gap-2"
            >
              {categorizeMutation.isPending ? (
                'جاري التصنيف...'
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  تصنيف المستند
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <Lock className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-muted-foreground">
              يمكن لمدير القسم فقط تغيير تصنيف المستندات
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              يمكنك عرض التصنيف الحالي للمستند فقط
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentCategorization;
