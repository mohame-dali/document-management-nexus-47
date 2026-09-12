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
import { Folder, FolderOpen, ChevronRight, Home, ArrowRight } from 'lucide-react';
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

  const availableFolders = folders?.filter(f => 
    f._id !== folder?._id && 
    !isDescendant(f, folder?._id || '')
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
          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors duration-200 border text-xs ${
            isSelected 
              ? 'bg-amber-50/70 border-[#FFCB56] text-[#78350f] font-semibold' 
              : 'hover:bg-gray-50 border-transparent text-gray-700'
          }`}
          style={{ paddingRight: `${level * 18 + 8}px` }}
          onClick={() => setSelectedParentId(folderOption._id)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Folder className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-[#d97706]' : 'text-[#2c5282]'}`} />
            <span className="truncate">{folderOption.name}</span>
          </div>
          {folderOption.status === 'En cours' && (
            <span className="text-[10px] text-gray-400">نشط</span>
          )}
        </div>
        
        {hasChildren && (
          <div className="mr-2">
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
      <DialogContent className="sm:max-w-md bg-white border border-[#e2e8f0] rounded p-0 overflow-hidden text-xs" dir="rtl">
        <DialogHeader className="p-4 bg-[#f8fafc] border-b border-[#e2e8f0] text-right">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#2c5282]">
            <ArrowRight className="h-4 w-4 rotate-180 text-[#2c5282]" />
            <span>نقل المجلد: {folder?.name}</span>
          </DialogTitle>
          <p className="text-gray-500 text-xs mt-1">
            اختر المجلد الأصل الجديد، أو انقر على الجذر لجعله مجلداً رئيسياً
          </p>
        </DialogHeader>

        <div className="p-4 space-y-3">
          {/* Root option */}
          <div
            className={`flex items-center gap-2 p-2.5 rounded cursor-pointer border transition-colors duration-200 ${
              selectedParentId === null
                ? 'bg-amber-50/70 border-[#FFCB56] text-[#78350f] font-semibold'
                : 'bg-gray-50 border-[#e2e8f0] text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setSelectedParentId(null)}
          >
            <Home className="h-4 w-4 text-[#2c5282]" />
            <div className="flex-1">
              <span className="block font-medium">المستوى الرئيسي (الجذر)</span>
              <span className="text-[11px] text-gray-500">جعل المجلد في المستوى الأول بدون أب</span>
            </div>
            {selectedParentId === null && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
                محدد
              </span>
            )}
          </div>

          <div className="border border-[#e2e8f0] rounded p-2 bg-[#fcfcfc]">
            <div className="text-[11px] font-medium text-gray-500 mb-1.5 px-1">المجلدات المتاحة:</div>
            <ScrollArea className="h-56">
              <div className="space-y-0.5">
                {rootFolders.map(rootFolder => renderFolderOption(rootFolder))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-3 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-3 rounded border-[#e2e8f0] text-gray-700 hover:bg-gray-100 transition-colors duration-200"
          >
            إلغاء
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleMove}
            disabled={moveFolderMutation.isPending}
            className="h-8 px-4 rounded bg-[#2c5282] hover:bg-[#234269] text-white font-medium transition-colors duration-200"
          >
            {moveFolderMutation.isPending ? 'جاري النقل...' : 'تأكيد النقل'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FolderMoveDialog;
