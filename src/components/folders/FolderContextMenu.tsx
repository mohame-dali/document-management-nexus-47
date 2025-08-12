
import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { 
  Edit, 
  Trash2, 
  Plus, 
  FolderOpen, 
  Archive, 
  Move,
  Copy,
  Info
} from 'lucide-react';
import { Folder } from '@/types';

interface FolderContextMenuProps {
  children: React.ReactNode;
  folder: Folder;
  onEdit: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  onCreateSubfolder: (parentId: string) => void;
  onMove: (folder: Folder) => void;
  onToggleStatus: (folder: Folder) => void;
  onViewDetails: (folder: Folder) => void;
  readOnly?: boolean;
}

const FolderContextMenu: React.FC<FolderContextMenuProps> = ({
  children,
  folder,
  onEdit,
  onDelete,
  onCreateSubfolder,
  onMove,
  onToggleStatus,
  onViewDetails,
  readOnly = false
}) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => onViewDetails(folder)}>
          <Info className="ml-2 h-4 w-4" />
          عرض التفاصيل
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => window.open(`/dashboard/folders/${folder._id}`, '_blank')}>
          <FolderOpen className="ml-2 h-4 w-4" />
          فتح في علامة تبويب جديدة
        </ContextMenuItem>
        
        {!readOnly && (
          <>
            <ContextMenuSeparator />
            
            <ContextMenuItem onClick={() => onEdit(folder)}>
              <Edit className="ml-2 h-4 w-4" />
              إعادة تسمية
            </ContextMenuItem>
            
            <ContextMenuItem onClick={() => onCreateSubfolder(folder._id)}>
              <Plus className="ml-2 h-4 w-4" />
              إنشاء مجلد فرعي
            </ContextMenuItem>
            
            <ContextMenuItem onClick={() => onMove(folder)}>
              <Move className="ml-2 h-4 w-4" />
              نقل المجلد
            </ContextMenuItem>
            
            <ContextMenuSeparator />
            
            <ContextMenuItem onClick={() => onToggleStatus(folder)}>
              <Archive className="ml-2 h-4 w-4" />
              {folder.status === 'En cours' ? 'أرشفة المجلد' : 'إلغاء الأرشفة'}
            </ContextMenuItem>
            
            <ContextMenuSeparator />
            
            <ContextMenuItem 
              onClick={() => onDelete(folder)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="ml-2 h-4 w-4" />
              حذف المجلد
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default FolderContextMenu;
