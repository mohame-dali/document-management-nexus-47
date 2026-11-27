import React, { useState, useEffect } from 'react';
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
import { Folder, Home, ArrowRight } from 'lucide-react';
import { getFolders, moveFolder } from '@/services/folderService';
import { useAuth } from '@/contexts/AuthContext';
import { Folder as FolderType } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';

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
  departmentId,
}) => {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isFr = language === 'fr';
  const queryClient = useQueryClient();
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  const folderDeptId =
    folder && typeof folder.department === 'object'
      ? folder.department?._id
      : folder?.department;

  const targetDepartmentId =
    folderDeptId || departmentId || currentUser?.activeDepartment?._id;

  useEffect(() => {
    if (open) {
      const currentParentId = folder?.parent
        ? typeof folder.parent === 'string'
          ? folder.parent
          : folder.parent._id
        : null;
      setSelectedParentId(currentParentId);
    }
  }, [open, folder]);

  const { data: folders } = useQuery({
    queryKey: ['folders', targetDepartmentId],
    queryFn: () => getFolders(targetDepartmentId),
    enabled: open && (!!targetDepartmentId || currentUser?.role === 'Admin'),
  });

  const moveFolderMutation = useMutation({
    mutationFn: ({
      folderId,
      newParentId,
    }: {
      folderId: string;
      newParentId: string | null;
    }) => moveFolder(folderId, newParentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success(isFr ? 'Dossier déplacé avec succès' : 'تم نقل المجلد بنجاح');
      onOpenChange(false);
      setSelectedParentId(null);
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || (isFr ? 'Échec du déplacement du dossier' : 'فشل في نقل المجلد'));
    },
  });

  const isDescendant = (checkFolder: FolderType, ancestorId: string): boolean => {
    if (!checkFolder.parent) return false;
    const parentId =
      typeof checkFolder.parent === 'string'
        ? checkFolder.parent
        : checkFolder.parent._id;
    if (parentId === ancestorId) return true;

    const allFolders = folders || [];
    const parentFolder = allFolders.find((f) => f._id === parentId);
    if (!parentFolder) return false;

    return isDescendant(parentFolder, ancestorId);
  };

  const getSubfolders = (parentId: string) => {
    const allFolders = folders || [];
    return allFolders.filter((f) => {
      const fParentId =
        typeof f.parent === 'string' ? f.parent : f.parent?._id;
      return fParentId === parentId;
    });
  };

  const availableFolders =
    folders?.filter(
      (f) => f._id !== folder?._id && !isDescendant(f, folder?._id || '')
    ) || [];

  const rootFolders = availableFolders.filter((f) => !f.parent);

  const handleMove = () => {
    if (!folder) return;
    moveFolderMutation.mutate({
      folderId: folder._id,
      newParentId: selectedParentId,
    });
  };

  const renderFolderOption = (folderOption: FolderType, level: number = 0) => {
    const children = getSubfolders(folderOption._id).filter(
      (f) => f._id !== folder?._id && !isDescendant(f, folder?._id || '')
    );
    const isSelected = selectedParentId === folderOption._id;

    return (
      <div key={folderOption._id}>
        <div
          className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors duration-150 border text-sm sm:text-base ${
            isSelected
              ? 'bg-amber-50/70 dark:bg-amber-950/35 border-amber-400/80 dark:border-amber-700 text-[#1a202c] dark:text-amber-100 font-bold'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 border-transparent text-slate-700 dark:text-slate-200 font-medium'
          }`}
          style={{ paddingInlineStart: `${level * 22 + 12}px` }}
          onClick={() => setSelectedParentId(folderOption._id)}
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Folder
              className={`h-4 w-4 flex-shrink-0 ${
                isSelected
                  ? 'text-[#2c5282] dark:text-sky-400'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            />
            <span className="truncate">{folderOption.name}</span>
          </div>
          {folderOption.status === 'En cours' && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70">
              {isFr ? 'Actif' : 'نشط'}
            </span>
          )}
          {isSelected && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70">
              {isFr ? 'Sélectionné' : 'محدد'}
            </span>
          )}
        </div>

        {children.length > 0 && (
          <div className="ms-3 border-s border-slate-200 dark:border-slate-700">
            {children.map((subfolder) =>
              renderFolderOption(subfolder, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] sm:w-[90vw] sm:max-w-[680px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-0 overflow-hidden shadow-lg text-base"
        dir={dir}
      >
        <DialogHeader className="p-5 sm:p-6 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-start">
          <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#2c5282] dark:text-sky-300">
            <div className="w-10 h-10 rounded-lg bg-[#2c5282]/10 dark:bg-sky-900/40 flex items-center justify-center text-[#2c5282] dark:text-sky-300 shrink-0">
              <ArrowRight className="h-5 w-5 rtl:rotate-180 text-[#2c5282] dark:text-sky-300" />
            </div>
            <span className="truncate">
              {isFr ? `Déplacer le dossier : ${folder?.name}` : `نقل المجلد: ${folder?.name}`}
            </span>
          </DialogTitle>
          <p className="text-slate-700 dark:text-slate-300 text-sm mt-1">
            {isFr
              ? 'Choisissez le nouveau dossier parent, ou sélectionnez la racine'
              : 'اختر المجلد الأصل الجديد، أو انقر على الجذر لجعله مجلداً رئيسياً'}
          </p>
        </DialogHeader>

        <div className="p-5 sm:p-6 space-y-4">
          <div
            className={`flex items-center gap-3 p-3.5 rounded-lg cursor-pointer border transition-colors duration-150 ${
              selectedParentId === null
                ? 'bg-amber-50/70 dark:bg-amber-950/35 border-amber-400/80 dark:border-amber-700 text-[#1a202c] dark:text-amber-100 font-bold'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70'
            }`}
            onClick={() => setSelectedParentId(null)}
          >
            <div className="w-9 h-9 rounded-lg bg-[#2c5282]/10 dark:bg-sky-900/40 flex items-center justify-center text-[#2c5282] dark:text-sky-300 shrink-0">
              <Home className="h-4 w-4 text-[#2c5282] dark:text-sky-300" />
            </div>
            <div className="flex-1">
              <span className="block font-bold text-sm sm:text-base text-[#1a202c] dark:text-slate-100">
                {isFr ? 'Niveau principal (Racine)' : 'المستوى الرئيسي (الجذر)'}
              </span>
              <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-normal">
                {isFr
                  ? 'Placer ce dossier au premier niveau sans dossier parent'
                  : 'جعل المجلد في المستوى الأول بدون مجلد أب'}
              </span>
            </div>
            {selectedParentId === null && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70">
                {isFr ? 'Sélectionné' : 'محدد'}
              </span>
            )}
          </div>

          <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 px-1">
              {isFr ? 'Dossiers disponibles :' : 'المجلدات المتاحة:'}
            </div>
            <ScrollArea className="h-60">
              <div className="space-y-1">
                {rootFolders.map((rootFolder) => renderFolderOption(rootFolder))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-4 sm:p-5 bg-slate-50/90 dark:bg-slate-800/60 border-t border-slate-200/80 dark:border-slate-800 flex flex-row-reverse justify-start gap-3">
          <Button
            type="button"
            onClick={handleMove}
            disabled={moveFolderMutation.isPending}
            className="h-10 px-6 rounded-lg bg-[#2c5282] hover:bg-[#234269] text-white text-sm sm:text-base font-semibold shadow-sm"
          >
            {moveFolderMutation.isPending
              ? isFr
                ? 'Déplacement...'
                : 'جاري النقل...'
              : isFr
                ? 'Confirmer le déplacement'
                : 'تأكيد النقل'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm sm:text-base font-medium"
          >
            {isFr ? 'Annuler' : 'إلغاء'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FolderMoveDialog;
