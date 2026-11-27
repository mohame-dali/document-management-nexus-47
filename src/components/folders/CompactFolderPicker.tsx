import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Archive,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  Loader2,
  Lock,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  assignDocumentToFolder,
  batchMoveDocuments,
  createFolder,
  getFolders,
} from '@/services/folderService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Folder } from '@/types';
import { cn } from '@/lib/utils';
import {
  extractFolderDepartmentId,
  extractFolderParentId,
  getRecentFolders,
  recordRecentFolder,
} from '@/utils/recentFolders';

export interface CompactFolderPickerProps {
  open: boolean;
  documentIds: string[];
  documentType: 'incoming' | 'outgoing';
  currentFolderId?: string | null;
  inferredDepartmentId?: string;
  readOnly?: boolean;
  onSuccess?: () => void;
  onCancel: () => void;
}

interface VisibleFolderRow {
  folder: Folder;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

const CompactFolderPicker: React.FC<CompactFolderPickerProps> = ({
  open,
  documentIds,
  documentType,
  currentFolderId = null,
  inferredDepartmentId,
  readOnly = false,
  onSuccess,
  onCancel,
}) => {
  const { currentUser } = useAuth();
  const { language, dir } = useLanguage();
  const isFr = language === 'fr';
  const isRtl = dir === 'rtl';
  const queryClient = useQueryClient();

  const isBatch = documentIds.length > 1;
  const activeDeptId = currentUser?.activeDepartment?._id;
  const isGlobalAdmin = currentUser?.role === 'Admin';
  const queryDeptId = isGlobalAdmin ? undefined : activeDeptId;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId || null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Inline folder creation state
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createUnderSelected, setCreateUnderSelected] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const { data: folders = [], isLoading } = useQuery<Folder[]>({
    queryKey: ['folders', queryDeptId || 'all'],
    queryFn: () => getFolders(queryDeptId),
    enabled: open && (isGlobalAdmin || Boolean(activeDeptId)),
  });

  // Reset state whenever dialog opens
  useEffect(() => {
    if (!open) return;
    setSearchQuery('');
    setSelectedFolderId(currentFolderId || null);
    setIsCreatingInline(false);
    setNewFolderName('');
    setCreateUnderSelected(false);

    const focusTimer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 35);
    return () => clearTimeout(focusTimer);
  }, [open, currentFolderId]);

  // Expand ancestors of currentFolderId on load
  useEffect(() => {
    if (!open || !currentFolderId || folders.length === 0) return;
    const byId = new Map(folders.map((f) => [f._id, f]));
    const ancestors = new Set<string>();
    let cursor = byId.get(currentFolderId);
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor._id)) {
      seen.add(cursor._id);
      const pId = extractFolderParentId(cursor.parent);
      if (pId) {
        ancestors.add(pId);
        cursor = byId.get(pId);
      } else {
        break;
      }
    }
    if (ancestors.size > 0) {
      setExpandedIds((prev) => new Set([...prev, ...ancestors]));
    }
  }, [open, currentFolderId, folders]);

  const foldersById = useMemo(() => new Map(folders.map((f) => [f._id, f])), [folders]);

  const childrenMap = useMemo(() => {
    const map = new Map<string, Folder[]>();
    const roots: Folder[] = [];

    const sorted = [...folders].sort((a, b) =>
      a.name.localeCompare(b.name, isFr ? 'fr' : 'ar', { sensitivity: 'base' })
    );

    for (const folder of sorted) {
      const parentId = extractFolderParentId(folder.parent);
      if (parentId && foldersById.has(parentId)) {
        const list = map.get(parentId) || [];
        list.push(folder);
        map.set(parentId, list);
      } else {
        roots.push(folder);
      }
    }

    return { map, roots };
  }, [folders, foldersById, isFr]);

  // Determine whether folders span multiple departments (for global Admin label clarity)
  const distinctDepartmentCount = useMemo(() => {
    const ids = new Set<string>();
    folders.forEach((f) => {
      const dId = extractFolderDepartmentId(f.department);
      if (dId) ids.add(dId);
    });
    return ids.size;
  }, [folders]);

  // Recent / suggested quick-pick folders (max 3)
  const quickPickFolders = useMemo<Folder[]>(() => {
    if (!folders.length) return [];
    const recentEntries = getRecentFolders(currentUser?._id);
    const picked: Folder[] = [];
    const seen = new Set<string>();

    for (const entry of recentEntries) {
      const match = foldersById.get(entry._id);
      if (match && !seen.has(match._id)) {
        picked.push(match);
        seen.add(match._id);
      }
      if (picked.length >= 3) break;
    }

    if (picked.length < 3) {
      const targetDept = activeDeptId || inferredDepartmentId;
      const fallbackCandidates = [...folders]
        .filter((f) => !seen.has(f._id) && f.status === 'En cours')
        .sort((a, b) => {
          const aMatch = targetDept && extractFolderDepartmentId(a.department) === targetDept ? 0 : 1;
          const bMatch = targetDept && extractFolderDepartmentId(b.department) === targetDept ? 0 : 1;
          if (aMatch !== bMatch) return aMatch - bMatch;
          const aRoot = extractFolderParentId(a.parent) ? 1 : 0;
          const bRoot = extractFolderParentId(b.parent) ? 1 : 0;
          if (aRoot !== bRoot) return aRoot - bRoot;
          return (b.documentCount || 0) - (a.documentCount || 0);
        });

      for (const candidate of fallbackCandidates) {
        picked.push(candidate);
        seen.add(candidate._id);
        if (picked.length >= 3) break;
      }
    }

    return picked;
  }, [folders, foldersById, currentUser?._id, activeDeptId, inferredDepartmentId]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Compute flattened visible rows for tree rendering & keyboard navigation
  const visibleRows = useMemo<VisibleFolderRow[]>(() => {
    const rows: VisibleFolderRow[] = [];

    const matchesSelf = (folder: Folder) => {
      if (!normalizedQuery) return true;
      const deptName =
        typeof folder.department === 'object' && folder.department?.name
          ? folder.department.name.toLowerCase()
          : '';
      return (
        folder.name.toLowerCase().includes(normalizedQuery) ||
        deptName.includes(normalizedQuery)
      );
    };

    const subtreeHasMatch = (folder: Folder): boolean => {
      if (matchesSelf(folder)) return true;
      const kids = childrenMap.map.get(folder._id) || [];
      return kids.some((child) => subtreeHasMatch(child));
    };

    const visit = (folder: Folder, level: number) => {
      if (normalizedQuery && !subtreeHasMatch(folder)) {
        return;
      }

      const kids = childrenMap.map.get(folder._id) || [];
      const matchingKids = normalizedQuery
        ? kids.filter((k) => subtreeHasMatch(k))
        : kids;
      const hasChildren = kids.length > 0;
      const isExpanded = normalizedQuery
        ? matchingKids.length > 0
        : expandedIds.has(folder._id);

      rows.push({ folder, level, hasChildren, isExpanded });

      if (isExpanded && matchingKids.length > 0) {
        matchingKids.forEach((child) => visit(child, level + 1));
      }
    };

    childrenMap.roots.forEach((root) => visit(root, 0));
    return rows;
  }, [childrenMap, expandedIds, normalizedQuery]);

  // Keep activeIndex in sync when visibleRows changes
  useEffect(() => {
    if (visibleRows.length === 0) {
      setActiveIndex(0);
      return;
    }
    if (selectedFolderId) {
      const idx = visibleRows.findIndex((r) => r.folder._id === selectedFolderId);
      if (idx >= 0) {
        setActiveIndex(idx);
        return;
      }
    }
    setActiveIndex((prev) => Math.min(prev, visibleRows.length - 1));
  }, [visibleRows, selectedFolderId]);

  const selectedFolder = selectedFolderId ? foldersById.get(selectedFolderId) || null : null;
  const currentFolder = currentFolderId ? foldersById.get(currentFolderId) || null : null;

  // Target department for creating a new folder inline
  const createDepartmentId = useMemo(() => {
    if (createUnderSelected && selectedFolder) {
      return extractFolderDepartmentId(selectedFolder.department);
    }
    if (activeDeptId) return activeDeptId;
    if (inferredDepartmentId) return inferredDepartmentId;
    if (selectedFolder) return extractFolderDepartmentId(selectedFolder.department);
    const first = folders[0];
    return first ? extractFolderDepartmentId(first.department) : undefined;
  }, [createUnderSelected, selectedFolder, activeDeptId, inferredDepartmentId, folders]);

  const canCreateInline = !readOnly && Boolean(createDepartmentId);

  const assignMutation = useMutation({
    mutationFn: async (folderId: string | null) => {
      if (isBatch) {
        return await batchMoveDocuments(documentIds, folderId, documentType);
      }
      return await assignDocumentToFolder(documentIds[0], folderId, documentType);
    },
    onSuccess: (_data, folderId) => {
      if (folderId) {
        const target = foldersById.get(folderId);
        if (target) {
          recordRecentFolder(currentUser?._id, target);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: [`${documentType}Documents`] });
      queryClient.invalidateQueries({ queryKey: [`${documentType}Document`] });

      const targetName = folderId ? foldersById.get(folderId)?.name : null;
      if (!folderId) {
        toast.success(
          isFr ? 'Document retiré du dossier' : 'تمت إزالة التصنيف بنجاح'
        );
      } else if (isBatch) {
        toast.success(
          isFr
            ? `${documentIds.length} documents classés dans « ${targetName || ''} »`
            : `تم تصنيف ${documentIds.length} مستندات في «${targetName || ''}»`
        );
      } else {
        toast.success(
          isFr
            ? `Document classé dans « ${targetName || ''} »`
            : `تم تصنيف المستند في «${targetName || ''}»`
        );
      }

      onSuccess?.();
      onCancel();
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(
        msg ||
          (isFr ? 'Échec du classement du document' : 'فشل في تصنيف المستند')
      );
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (payload: { name: string; parentId?: string; department: string }) => {
      return await createFolder(payload);
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      if (created?._id) {
        setSelectedFolderId(created._id);
        recordRecentFolder(currentUser?._id, created);
        const parentId = extractFolderParentId(created.parent);
        if (parentId) {
          setExpandedIds((prev) => new Set([...prev, parentId]));
        }
      }
      setIsCreatingInline(false);
      setNewFolderName('');
      setCreateUnderSelected(false);
      toast.success(
        isFr ? `Dossier « ${created.name} » créé` : `تم إنشاء المجلد «${created.name}»`
      );
      setTimeout(() => searchInputRef.current?.focus(), 30);
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (isFr ? 'Échec de création du dossier' : 'فشل في إنشاء المجلد'));
    },
  });

  const handleClassify = (folderId: string | null) => {
    if (readOnly || assignMutation.isPending) return;
    assignMutation.mutate(folderId);
  };

  const handleInlineCreate = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      toast.error(isFr ? 'Veuillez saisir un nom de dossier' : 'يرجى إدخال اسم المجلد');
      inlineInputRef.current?.focus();
      return;
    }
    if (!createDepartmentId) {
      toast.error(isFr ? 'Département introuvable' : 'تعذر تحديد القسم الإداري');
      return;
    }
    createFolderMutation.mutate({
      name: trimmed,
      parentId: createUnderSelected && selectedFolder ? selectedFolder._id : undefined,
      department: createDepartmentId,
    });
  };

  const toggleExpand = (folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const focusRow = (index: number) => {
    const row = visibleRows[index];
    if (!row) return;
    setActiveIndex(index);
    setSelectedFolderId(row.folder._id);
    const el = rowRefs.current.get(row.folder._id);
    el?.scrollIntoView({ block: 'nearest' });
  };

  const handleNavigationKeyDown = (e: React.KeyboardEvent, fromInput: boolean) => {
    if (visibleRows.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = activeIndex < visibleRows.length - 1 ? activeIndex + 1 : 0;
      focusRow(nextIdx);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = activeIndex > 0 ? activeIndex - 1 : visibleRows.length - 1;
      focusRow(prevIdx);
      return;
    }

    if (e.key === 'Enter' && !readOnly) {
      const targetId = selectedFolderId || visibleRows[activeIndex]?.folder._id;
      if (targetId) {
        e.preventDefault();
        handleClassify(targetId);
      }
      return;
    }

    if (!fromInput) {
      const currentRow = visibleRows[activeIndex];
      if (!currentRow) return;
      const expandKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
      const collapseKey = isRtl ? 'ArrowRight' : 'ArrowLeft';

      if (e.key === expandKey && currentRow.hasChildren && !currentRow.isExpanded) {
        e.preventDefault();
        toggleExpand(currentRow.folder._id);
      } else if (e.key === collapseKey && currentRow.hasChildren && currentRow.isExpanded) {
        e.preventDefault();
        toggleExpand(currentRow.folder._id);
      }
    }
  };

  const expandAncestorsOf = (folderId: string) => {
    const ancestors = new Set<string>();
    let cursor = foldersById.get(folderId);
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor._id)) {
      seen.add(cursor._id);
      const pId = extractFolderParentId(cursor.parent);
      if (pId) {
        ancestors.add(pId);
        cursor = foldersById.get(pId);
      } else {
        break;
      }
    }
    if (ancestors.size > 0) {
      setExpandedIds((prev) => new Set([...prev, ...ancestors]));
    }
  };

  return (
    <div className="flex flex-col" dir={dir}>
      {/* Search + Inline New Folder Toolbar */}
      <div className="px-4 pt-3.5 pb-2.5 space-y-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => handleNavigationKeyDown(e, true)}
              placeholder={
                isFr ? 'Recherche rapide de dossier...' : 'بحث سريع عن مجلد...'
              }
              aria-label={
                isFr ? 'Recherche rapide de dossier' : 'بحث سريع عن مجلد'
              }
              className="h-9 ps-9 pe-8 text-sm rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 focus:bg-white dark:focus:bg-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                aria-label={isFr ? 'Effacer la recherche' : 'مسح البحث'}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {canCreateInline && (
            <Button
              type="button"
              variant={isCreatingInline ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                setIsCreatingInline((prev) => {
                  const next = !prev;
                  if (next) {
                    setTimeout(() => inlineInputRef.current?.focus(), 30);
                  }
                  return next;
                });
              }}
              className="h-9 px-3 text-xs font-semibold rounded-lg border-slate-300 dark:border-slate-700 whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <FolderPlus className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-300" />
              <span>{isFr ? '+ Nouveau dossier' : '+ مجلد جديد'}</span>
            </Button>
          )}
        </div>

        {/* Inline Folder Creation Bar */}
        {isCreatingInline && canCreateInline && (
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                ref={inlineInputRef}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInlineCreate();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsCreatingInline(false);
                    setNewFolderName('');
                  }
                }}
                placeholder={
                  isFr ? 'Nom du nouveau dossier...' : 'اسم المجلد الجديد...'
                }
                className="h-8 text-sm rounded-md bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleInlineCreate}
                disabled={createFolderMutation.isPending || !newFolderName.trim()}
                className="h-8 px-3 text-xs font-semibold rounded-md bg-[#2c5282] hover:bg-[#234269] text-white shrink-0"
              >
                {createFolderMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isFr ? (
                  'Créer'
                ) : (
                  'إنشاء'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCreatingInline(false);
                  setNewFolderName('');
                }}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {selectedFolder && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  onClick={() => setCreateUnderSelected((prev) => !prev)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs transition-colors',
                    createUnderSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-[#2c5282] dark:text-blue-300 font-medium'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  {createUnderSelected ? (
                    <Check className="h-3 w-3 shrink-0" />
                  ) : (
                    <FolderOpen className="h-3 w-3 shrink-0" />
                  )}
                  <span>
                    {isFr
                      ? `Créer dans « ${selectedFolder.name} »`
                      : `إنشاء داخل «${selectedFolder.name}»`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recent / Suggested Folders Strip (Up to 3 quick-pick chips) */}
        {!readOnly && quickPickFolders.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 me-0.5">
              <Clock className="h-3 w-3" />
              <span>{isFr ? 'Suggérés :' : 'مقترح:'}</span>
            </span>
            {quickPickFolders.map((chip) => {
              const isSelectedChip = selectedFolderId === chip._id;
              return (
                <button
                  key={chip._id}
                  type="button"
                  onClick={() => {
                    setSelectedFolderId(chip._id);
                    expandAncestorsOf(chip._id);
                  }}
                  onDoubleClick={() => handleClassify(chip._id)}
                  title={
                    isFr
                      ? `Sélectionner ${chip.name} (double-clic pour classer)`
                      : `اختيار ${chip.name} (نقر مزدوج للتصنيف الفوري)`
                  }
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors max-w-[160px]',
                    isSelectedChip
                      ? 'bg-[#2c5282] text-white border-[#2c5282] dark:bg-blue-600 dark:border-blue-600'
                      : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-300 dark:hover:border-blue-700 hover:text-[#2c5282] dark:hover:text-blue-300'
                  )}
                >
                  <FolderIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{chip.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scrollable Folder Tree List */}
      <div
        role="listbox"
        aria-label={isFr ? 'Liste des dossiers' : 'قائمة المجلدات'}
        onKeyDown={(e) => handleNavigationKeyDown(e, false)}
        className="max-h-[290px] min-h-[180px] overflow-y-auto custom-scrollbar p-2.5 bg-slate-50/50 dark:bg-slate-950/60 space-y-1"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin mb-2 text-[#2c5282] dark:text-blue-400" />
            <span className="text-xs">
              {isFr ? 'Chargement des dossiers...' : 'جاري تحميل المجلدات...'}
            </span>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <Archive className="h-7 w-7 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {normalizedQuery
                ? isFr
                  ? 'Aucun dossier ne correspond à votre recherche'
                  : 'لا توجد مجلدات مطابقة للبحث'
                : isFr
                  ? 'Aucun dossier disponible dans ce service'
                  : 'لا توجد مجلدات متاحة حالياً'}
            </p>
            {canCreateInline && normalizedQuery && !isCreatingInline && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewFolderName(searchQuery.trim());
                  setIsCreatingInline(true);
                  setTimeout(() => inlineInputRef.current?.focus(), 30);
                }}
                className="mt-3 h-8 text-xs rounded-lg"
              >
                <FolderPlus className="h-3.5 w-3.5 me-1.5" />
                {isFr
                  ? `Créer « ${searchQuery.trim()} »`
                  : `إنشاء مجلد «${searchQuery.trim()}»`}
              </Button>
            )}
          </div>
        ) : (
          visibleRows.map(({ folder, level, hasChildren, isExpanded }, idx) => {
            const isSelected = selectedFolderId === folder._id;
            const isActiveCursor = idx === activeIndex;
            const isCurrentAssigned = !isBatch && currentFolderId === folder._id;
            const deptName =
              distinctDepartmentCount > 1 &&
              typeof folder.department === 'object' &&
              folder.department?.name
                ? folder.department.name
                : null;

            return (
              <div
                key={folder._id}
                className="flex items-center gap-1"
                style={{
                  paddingInlineStart: `${level * 18}px`,
                }}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(folder._id);
                    }}
                    aria-label={
                      isExpanded
                        ? isFr
                          ? 'Réduire'
                          : 'طي'
                        : isFr
                          ? 'Développer'
                          : 'توسيع'
                    }
                    className="h-7 w-6 flex items-center justify-center rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : isRtl ? (
                      <ChevronLeft className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : (
                  <span className="w-6 shrink-0" />
                )}

                <button
                  ref={(el) => {
                    if (el) rowRefs.current.set(folder._id, el);
                    else rowRefs.current.delete(folder._id);
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setActiveIndex(idx);
                    if (!readOnly) {
                      setSelectedFolderId(folder._id);
                    }
                  }}
                  onDoubleClick={() => {
                    if (!readOnly) {
                      setSelectedFolderId(folder._id);
                      handleClassify(folder._id);
                    }
                  }}
                  className={cn(
                    'flex-1 min-w-0 flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-start transition-colors',
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-[#2c5282]/70 dark:border-blue-600 text-[#1a202c] dark:text-slate-100'
                      : isActiveCursor
                        ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                        : 'bg-white/90 dark:bg-slate-900/80 border-slate-200/70 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {folder.status === 'Fermé' ? (
                      <Archive className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    ) : isSelected || isExpanded ? (
                      <FolderOpen className="h-4 w-4 text-[#2c5282] dark:text-blue-400 shrink-0" />
                    ) : (
                      <FolderIcon className="h-4 w-4 text-[#2c5282] dark:text-blue-400 shrink-0" />
                    )}

                    <span className="text-sm font-medium truncate">{folder.name}</span>

                    {deptName && (
                      <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
                        {deptName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isCurrentAssigned && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70">
                        {isFr ? 'Actuel' : 'حالي'}
                      </span>
                    )}
                    {typeof folder.documentCount === 'number' && (
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums px-1.5 py-0.5 rounded bg-slate-100/80 dark:bg-slate-800">
                        <bdi dir="ltr">{folder.documentCount}</bdi>
                      </span>
                    )}
                    {isSelected && !readOnly && (
                      <Check className="h-4 w-4 text-[#2c5282] dark:text-blue-400 shrink-0" />
                    )}
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Read-only indicator for non-privileged roles (e.g. BO, Director, AdminTuningDesk, User) */}
      {readOnly && (
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>
              {isFr
                ? 'Consultation seule — classement réservé au responsable du service'
                : 'للعرض فقط — التصنيف متاح لمدير القسم أو المسؤول'}
            </span>
          </div>
          {currentFolder && (
            <span className="font-semibold text-emerald-700 dark:text-emerald-300 truncate max-w-[160px]">
              {currentFolder.name}
            </span>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {!readOnly && !isBatch && currentFolderId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleClassify(null)}
              disabled={assignMutation.isPending}
              className="h-9 px-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5 me-1" />
              <span>{isFr ? 'Retirer du dossier' : 'إزالة التصنيف'}</span>
            </Button>
          )}
          {!readOnly && (
            <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500">
              {isFr ? 'Double-clic ou Entrée pour classer' : 'انقر مرتين أو اضغط Enter للحفظ'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 ms-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={assignMutation.isPending}
            className="h-9 px-3.5 text-xs font-medium rounded-lg border-slate-300 dark:border-slate-700 whitespace-nowrap"
          >
            {readOnly ? (isFr ? 'Fermer' : 'إغلاق') : isFr ? 'Annuler' : 'إلغاء'}
          </Button>

          {!readOnly && (
            <Button
              type="button"
              size="sm"
              onClick={() => selectedFolder && handleClassify(selectedFolder._id)}
              disabled={assignMutation.isPending || !selectedFolder}
              className="h-9 px-4 text-xs font-semibold rounded-lg bg-[#2c5282] hover:bg-[#234269] text-white whitespace-nowrap max-w-[230px]"
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin shrink-0" />
                  <span>{isFr ? 'Enregistrement...' : 'جاري الحفظ...'}</span>
                </>
              ) : selectedFolder ? (
                <span className="truncate">
                  {isFr
                    ? `Enregistrer dans : ${selectedFolder.name}`
                    : `حفظ في: ${selectedFolder.name}`}
                </span>
              ) : (
                <span>{isFr ? 'Sélectionnez un dossier' : 'اختر مجلداً'}</span>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompactFolderPicker;
