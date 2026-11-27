import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Folder as FolderIcon, FolderOpen, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getFolders } from '@/services/folderService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Folder } from '@/types';
import { cn } from '@/lib/utils';
import { extractFolderDepartmentId, getFolderBreadcrumbPath } from '@/utils/recentFolders';

interface OptionalArchiveFolderFieldProps {
  value: string;
  onChange: (folderId: string) => void;
  departmentId?: string;
}

const OptionalArchiveFolderField: React.FC<OptionalArchiveFolderFieldProps> = ({
  value,
  onChange,
  departmentId,
}) => {
  const { currentUser } = useAuth();
  const { language, dir } = useLanguage();
  const isFr = language === 'fr';
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const isGlobalAdmin = currentUser?.role === 'Admin';
  const activeDeptId = currentUser?.activeDepartment?._id;
  const scopedDeptId = isGlobalAdmin ? departmentId || undefined : activeDeptId;

  const { data: folders = [], isLoading } = useQuery<Folder[]>({
    queryKey: ['folders', scopedDeptId || 'all'],
    queryFn: () => getFolders(scopedDeptId),
    enabled: isGlobalAdmin || Boolean(activeDeptId),
    staleTime: 60 * 1000,
  });

  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) =>
      a.name.localeCompare(b.name, isFr ? 'fr' : 'ar', { sensitivity: 'base' })
    );
  }, [folders, isFr]);

  const distinctDeptCount = useMemo(() => {
    const ids = new Set<string>();
    folders.forEach((f) => {
      const id = extractFolderDepartmentId(f.department);
      if (id) ids.add(id);
    });
    return ids.size;
  }, [folders]);

  const selectedFolder = useMemo(
    () => folders.find((f) => f._id === value) || null,
    [folders, value]
  );

  const selectedLabel = useMemo(() => {
    if (!selectedFolder) return '';
    return getFolderBreadcrumbPath(selectedFolder._id, folders) || selectedFolder.name;
  }, [selectedFolder, folders]);

  const filteredFolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedFolders;
    return sortedFolders.filter((folder) => {
      const path = getFolderBreadcrumbPath(folder._id, folders).toLowerCase();
      const deptName =
        typeof folder.department === 'object' && folder.department?.name
          ? folder.department.name.toLowerCase()
          : '';
      return path.includes(q) || deptName.includes(q);
    });
  }, [sortedFolders, folders, search]);

  return (
    <div className="space-y-2" dir={dir}>
      <label className="text-sm font-medium leading-none text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
        <FolderOpen className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
        <span>
          {isFr
            ? 'Classer dans un dossier d’archive (facultatif)'
            : 'حفظ في مجلد الأرشيف (اختياري)'}
        </span>
      </label>

      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-11 px-3 text-sm font-normal bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-lg"
            >
              <span className="flex items-center gap-2 min-w-0 truncate">
                <FolderIcon className="h-4 w-4 shrink-0 text-[#2c5282] dark:text-blue-400" />
                {selectedLabel ? (
                  <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {selectedLabel}
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 truncate">
                    {isFr
                      ? 'Sélectionner un dossier (optionnel)...'
                      : 'اختر مجلد الأرشيف لتصنيف الوثيقة مباشرة...'}
                  </span>
                )}
              </span>
              <ChevronDown className="h-4 w-4 opacity-60 shrink-0 ms-2" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            dir={dir}
            className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg"
          >
            <div className="p-2 border-b border-slate-200/80 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isFr ? 'Rechercher un dossier...' : 'ابحث عن مجلد...'}
                  className="h-8 ps-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
              {isLoading ? (
                <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  {isFr ? 'Chargement des dossiers...' : 'جاري تحميل المجلدات...'}
                </div>
              ) : filteredFolders.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  {isFr ? 'Aucun dossier trouvé' : 'لا توجد مجلدات مطابقة'}
                </div>
              ) : (
                filteredFolders.map((folder) => {
                  const path = getFolderBreadcrumbPath(folder._id, folders) || folder.name;
                  const isSelected = value === folder._id;
                  const deptName =
                    distinctDeptCount > 1 &&
                    typeof folder.department === 'object' &&
                    folder.department?.name
                      ? folder.department.name
                      : null;

                  return (
                    <button
                      key={folder._id}
                      type="button"
                      onClick={() => {
                        onChange(isSelected ? '' : folder._id);
                        setOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-xs text-start transition-colors',
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-200 font-semibold'
                          : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0 flex-1">
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[#2c5282] dark:text-blue-400" />
                        <span className="truncate">{path}</span>
                      </span>

                      <span className="flex items-center gap-1.5 shrink-0">
                        {deptName && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 max-w-[100px] truncate">
                            {deptName}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-300" />
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
            title={isFr ? 'Effacer le dossier' : 'إلغاء اختيار المجلد'}
            className="h-11 w-11 p-0 shrink-0 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="text-[0.8rem] text-muted-foreground">
        {isFr
          ? 'Le document sera automatiquement classé dans ce dossier dès son enregistrement.'
          : 'سيتم تصنيف الوثيقة تلقائياً داخل هذا المجلد فور حفظها.'}
      </p>
    </div>
  );
};

export default OptionalArchiveFolderField;
