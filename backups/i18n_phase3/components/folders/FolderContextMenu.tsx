import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { 
  Edit3, 
  Trash2, 
  FolderPlus, 
  FolderOpen, 
  Archive, 
  MoveRight,
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
  onOpenDocuments?: (folder: Folder) => void;
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
  onOpenDocuments,
  readOnly = false
}) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64 bg-white border border-[#e2e8f0] rounded shadow-sm text-sm font-semibold p-1.5 space-y-0.5" dir="rtl">
        <ContextMenuItem 
          onClick={() => onViewDetails(folder)}
          className="cursor-pointer hover:bg-gray-50 flex items-center gap-2.5 py-2 px-3 text-gray-800 rounded"
        >
          <Info className="h-4.5 w-4.5 text-[#2c5282]" />
          <span>تفاصيل وبيانات المجلد</span>
        </ContextMenuItem>

        {onOpenDocuments && (
          <ContextMenuItem 
            onClick={() => onOpenDocuments(folder)}
            className="cursor-pointer hover:bg-gray-50 flex items-center gap-2.5 py-2 px-3 text-gray-800 rounded"
          >
            <FolderOpen className="h-4.5 w-4.5 text-[#d97706]" />
            <span>عرض المستندات المصنفة</span>
          </ContextMenuItem>
        )}
        
        {!readOnly && (
          <>
            <ContextMenuSeparator className="bg-[#e2e8f0] my-1" />
            
            <ContextMenuItem 
              onClick={() => onEdit(folder)}
              className="cursor-pointer hover:bg-gray-50 flex items-center gap-2.5 py-2 px-3 text-gray-800 rounded"
            >
              <Edit3 className="h-4.5 w-4.5 text-slate-600" />
              <span>تعديل المجلد</span>
            </ContextMenuItem>
            
            <ContextMenuItem 
              onClick={() => onCreateSubfolder(folder._id)}
              className="cursor-pointer hover:bg-gray-50 flex items-center gap-2.5 py-2 px-3 text-gray-800 rounded"
            >
              <FolderPlus className="h-4.5 w-4.5 text-[#2c5282]" />
              <span>إنشاء مجلد فرعي بالداخل</span>
            </ContextMenuItem>
            
            <ContextMenuItem 
              onClick={() => onMove(folder)}
              className="cursor-pointer hover:bg-gray-50 flex items-center gap-2.5 py-2 px-3 text-gray-800 rounded"
            >
              <MoveRight className="h-4.5 w-4.5 text-slate-600" />
              <span>نقل المجلد في الهيكل</span>
            </ContextMenuItem>
            
            <ContextMenuSeparator className="bg-[#e2e8f0] my-1" />
            
            <ContextMenuItem 
              onClick={() => onToggleStatus(folder)}
              className="cursor-pointer hover:bg-gray-50 flex items-center gap-2.5 py-2 px-3 text-gray-800 rounded"
            >
              <Archive className="h-4.5 w-4.5 text-amber-600" />
              <span>{folder.status === 'En cours' ? 'إغلاق وأرشفة المجلد' : 'تنشيط المجلد'}</span>
            </ContextMenuItem>
            
            <ContextMenuSeparator className="bg-[#e2e8f0] my-1" />
            
            <ContextMenuItem 
              onClick={() => onDelete(folder)}
              className="cursor-pointer hover:bg-red-50 text-red-600 focus:text-red-700 flex items-center gap-2.5 py-2 px-3 rounded font-bold"
            >
              <Trash2 className="h-4.5 w-4.5 text-red-500" />
              <span>حذف المجلد</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default FolderContextMenu;
