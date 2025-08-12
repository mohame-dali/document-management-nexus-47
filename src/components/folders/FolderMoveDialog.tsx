
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Folder, FolderOpen, ChevronRight, Building2 } from 'lucide-react';
import { getFolders, moveFolder } from '@/services/folderService';
import { useAuth } from '@/contexts/AuthContext';
import { Folder as FolderType } from '@/types';

interface FolderMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderType | null;
  departmentId?: string;
}

const FolderMoveDialog: React.FC<FolderMoveDialogProps> = ({
  open,
  onOpenChange,
  folder,
  departmentId
}) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  
  const targetDepartmentId = departmentId || currentUser?.activeDepartment?._id;

  const { data: folders } = useQuery({
    queryKey: ['folders', targetDepartmentId],
    queryFn: () => getFolders(targetDepartmentId),
    enabled: !!targetDepartmentId && open,
  });

  const moveFolderMutation = useMutation({
    mutationFn: ({ folderId, newParentId }: { folderId: string; newParentId: string | null }) =>
      moveFolder(folderId, newParentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('تم نقل المجلد بنجاح');
      onOpenChange(false);
      setSelectedParentId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في نقل المجلد');
    },
  });

  // Define helper functions first
  const isDescendant = (checkFolder: FolderType, ancestorId: string): boolean => {
    if (!checkFolder.parent) return false;
    const parentId = typeof checkFolder.parent === 'string' ? checkFolder.parent : checkFolder.parent._id;
    if (parentId === ancestorId) return true;
    
    const allFolders = folders || [];
    const parentFolder = allFolders.find(f => f._id === parentId);
    if (!parentFolder) return false;
    
    return isDescendant(parentFolder, ancestorId);
  };

  const getSubfolders = (parentId: string) => {
    const allFolders = folders || [];
    return allFolders.filter(f => {
      const folderId = typeof f.parent === 'string' ? f.parent : f.parent?._id;
      return folderId === parentId;
    });
  };

  // Now define the filtered folders using the helper functions
  const availableFolders = folders?.filter(f => 
    f._id !== folder?._id && // Cannot move to itself
    !isDescendant(f, folder?._id || '') // Cannot move to its own descendant
  ) || [];

  const rootFolders = availableFolders.filter(f => !f.parent);

  const handleMove = () => {
    if (!folder) return;
    
    moveFolderMutation.mutate({
      folderId: folder._id,
      newParentId: selectedParentId
    });
  };

  const renderFolderOption = (folderOption: FolderType, level: number = 0) => {
    const hasChildren = getSubfolders(folderOption._id).length > 0;
    const isSelected = selectedParentId === folderOption._id;
    
    return (
      <div key={folderOption._id}>
        <div
          className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
            isSelected 
              ? 'bg-blue-50 border border-blue-200' 
              : 'hover:bg-gray-50 border border-transparent'
          }`}
          style={{ paddingRight: `${level * 20 + 12}px` }}
          onClick={() => setSelectedParentId(folderOption._id)}
        >
          <div className="flex items-center gap-2 flex-1">
            <div className="p-2 bg-blue-100 rounded-lg">
              {hasChildren ? (
                <FolderOpen className="h-4 w-4 text-blue-600" />
              ) : (
                <Folder className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div>
              <div className="font-medium text-sm">{folderOption.name}</div>
              <div className="text-xs text-gray-500">
                {folderOption.status === 'En cours' ? 'نشط' : 'مؤرشف'}
              </div>
            </div>
          </div>
          {hasChildren && <ChevronRight className="h-4 w-4 text-gray-400" />}
        </div>
        
        {hasChildren && (
          <div className="ml-4">
            {getSubfolders(folderOption._id).map(subfolder => 
              renderFolderOption(subfolder, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            نقل المجلد: {folder?.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              اختر المجلد الذي تريد نقل "{folder?.name}" إليه، أو اتركه فارغاً لجعله مجلد رئيسي.
            </p>
          </div>
          
          <div className="space-y-2">
            <div
              className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                selectedParentId === null 
                  ? 'bg-blue-50 border border-blue-200' 
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
              onClick={() => setSelectedParentId(null)}
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-sm">المجلدات الرئيسية</div>
                <div className="text-xs text-gray-500">جعل هذا مجلد رئيسي</div>
              </div>
            </div>
            
            <ScrollArea className="h-[300px] border rounded-lg p-2">
              <div className="space-y-1">
                {rootFolders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد مجلدات متاحة للنقل إليها</p>
                  </div>
                ) : (
                  rootFolders.map(folderOption => renderFolderOption(folderOption))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button 
            onClick={handleMove}
            disabled={moveFolderMutation.isPending}
          >
            {moveFolderMutation.isPending ? 'جاري النقل...' : 'نقل المجلد'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FolderMoveDialog;
