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
  Info,
} from 'lucide-react';
import { Folder } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';

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
  readOnly = false,
}) => {
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isFr = language === 'fr';

  return (
    <ContextMenu dir={dir}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-md text-sm font-medium p-1.5 space-y-0.5">
        <ContextMenuItem
          onClick={() => onViewDetails(folder)}
          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 py-2 px-3 text-slate-800 dark:text-slate-100 rounded-md"
        >
          <Info className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
          <span>{isFr ? 'Détails du dossier' : 'تفاصيل وبيانات المجلد'}</span>
        </ContextMenuItem>

        {onOpenDocuments && (
          <ContextMenuItem
            onClick={() => onOpenDocuments(folder)}
            className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 py-2 px-3 text-slate-800 dark:text-slate-100 rounded-md"
          >
            <FolderOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>{isFr ? 'Afficher les documents' : 'عرض المستندات المصنفة'}</span>
          </ContextMenuItem>
        )}

        {!readOnly && (
          <>
            <ContextMenuSeparator className="bg-slate-200 dark:bg-slate-800 my-1" />

            <ContextMenuItem
              onClick={() => onEdit(folder)}
              className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 py-2 px-3 text-slate-800 dark:text-slate-100 rounded-md"
            >
              <Edit3 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              <span>{isFr ? 'Modifier le dossier' : 'تعديل المجلد'}</span>
            </ContextMenuItem>

            <ContextMenuItem
              onClick={() => onCreateSubfolder(folder._id)}
              className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 py-2 px-3 text-slate-800 dark:text-slate-100 rounded-md"
            >
              <FolderPlus className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
              <span>{isFr ? 'Créer un sous-dossier' : 'إنشاء مجلد فرعي بالداخل'}</span>
            </ContextMenuItem>

            <ContextMenuItem
              onClick={() => onMove(folder)}
              className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 py-2 px-3 text-slate-800 dark:text-slate-100 rounded-md"
            >
              <MoveRight className="h-4 w-4 text-slate-600 dark:text-slate-300 rtl:rotate-180" />
              <span>{isFr ? 'Déplacer dans la hiérarchie' : 'نقل المجلد في الهيكل'}</span>
            </ContextMenuItem>

            <ContextMenuSeparator className="bg-slate-200 dark:bg-slate-800 my-1" />

            <ContextMenuItem
              onClick={() => onToggleStatus(folder)}
              className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 py-2 px-3 text-slate-800 dark:text-slate-100 rounded-md"
            >
              <Archive className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>
                {folder.status === 'En cours'
                  ? isFr
                    ? 'Fermer et archiver'
                    : 'إغلاق وأرشفة المجلد'
                  : isFr
                    ? 'Réactiver le dossier'
                    : 'تنشيط المجلد'}
              </span>
            </ContextMenuItem>

            <ContextMenuSeparator className="bg-slate-200 dark:bg-slate-800 my-1" />

            <ContextMenuItem
              onClick={() => onDelete(folder)}
              className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 focus:text-red-700 flex items-center gap-2.5 py-2 px-3 rounded-md font-semibold"
            >
              <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
              <span>{isFr ? 'Supprimer le dossier' : 'حذف المجلد'}</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default FolderContextMenu;
