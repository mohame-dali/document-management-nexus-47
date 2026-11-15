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
          className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors duration-200 border text-base ${
            isSelected 
              ? 'bg-amber-50/70 border-[#FFCB56] text-[#1a202c] font-bold' 
              : 'hover:bg-gray-50 border-transparent text-gray-700 font-medium'
          }`}
          style={{ paddingRight: `${level * 24 + 12}px` }}
          onClick={() => setSelectedParentId(folderOption._id)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Folder className={`h-5 w-5 flex-shrink-0 ${isSelected ? 'text-[#2c5282]' : 'text-gray-400'}`} />
            <span className="truncate">{folderOption.name}</span>
          </div>
          {folderOption.status === 'En cours' && (
            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              نشط
            </span>
          )}
          {isSelected && (
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#FFCB56] text-[#1a202c] border border-[#FFD758]">
              محدد
            </span>
          )}
        </div>
        
        {hasChildren && (
          <div className="mr-2 border-r border-[#e2e8f0]">
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
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white border border-[#e2e8f0] rounded p-0 overflow-hidden shadow-sm text-base" dir="rtl">
        <DialogHeader className="p-6 bg-[#f8fafc] border-b border-[#e2e8f0] text-right">
          <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-[#2c5282]">
            <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282] shrink-0">
              <ArrowRight className="h-5 w-5 rotate-180 text-[#2c5282]" />
            </div>
            <span>نقل المجلد: {folder?.name}</span>
          </DialogTitle>
          <p className="text-gray-600 text-base mt-1.5">
            اختر المجلد الأصل الجديد، أو انقر على الجذر لجعله مجلداً رئيسياً
          </p>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Root option */}
          <div
            className={`flex items-center gap-3 p-4 rounded cursor-pointer border transition-colors duration-200 ${
              selectedParentId === null
                ? 'bg-amber-50/70 border-[#FFCB56] text-[#1a202c] font-bold'
                : 'bg-white border-[#e2e8f0] text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedParentId(null)}
          >
            <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282] shrink-0">
              <Home className="h-5 w-5 text-[#2c5282]" />
            </div>
            <div className="flex-1">
              <span className="block font-bold text-base text-[#1a202c]">المستوى الرئيسي (الجذر)</span>
              <span className="text-sm text-gray-500 font-normal">جعل المجلد في المستوى الأول بدون مجلد أب</span>
            </div>
            {selectedParentId === null && (
              <span className="px-2.5 py-1 rounded text-sm font-bold bg-[#FFCB56] text-[#1a202c] border border-[#FFD758]">
                محدد
              </span>
            )}
          </div>

          <div className="border border-[#e2e8f0] rounded p-3 bg-[#fcfcfc]">
            <div className="text-sm font-bold text-gray-700 mb-2 px-1">المجلدات المتاحة:</div>
            <ScrollArea className="h-64">
              <div className="space-y-1">
                {rootFolders.map(rootFolder => renderFolderOption(rootFolder))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-4 sm:p-6 bg-[#f8fafc] border-t border-[#e2e8f0] flex flex-row-reverse justify-start gap-3">
          <Button
            type="button"
            onClick={handleMove}
            disabled={moveFolderMutation.isPending}
            className="h-11 px-7 rounded bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold shadow-none"
          >
            {moveFolderMutation.isPending ? 'جاري النقل...' : 'تأكيد النقل'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 px-6 rounded border-[#cbd5e1] text-gray-700 hover:bg-gray-100 text-base font-medium"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FolderMoveDialog;
