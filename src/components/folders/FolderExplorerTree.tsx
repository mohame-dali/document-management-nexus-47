import React, { useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  Archive,
  ChevronDown,
  ChevronRight,
  Search,
  ChevronsDown,
  ChevronsUp,
  MoreVertical,
  FolderPlus,
  Edit3,
  MoveRight,
  Trash2,
  Info,
  AlertCircle,
  RefreshCw,
  Home,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Folder as FolderType } from '@/types';
import FolderContextMenu from './FolderContextMenu';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { cn } from '@/lib/utils';

interface FolderExplorerTreeProps {
  folders: FolderType[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedFolderId: string | null;
  onSelectFolder: (folder: FolderType | null) => void;
  canManageFolders: boolean;
  expandedFolders: Set<string>;
  onToggleExpand: (folderId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | 'En cours' | 'Fermé';
  onStatusFilterChange: (value: 'all' | 'En cours' | 'Fermé') => void;
  showDepartmentBadge: boolean;
  onCreateSubfolder: (parentId: string) => void;
  onEdit: (folder: FolderType) => void;
  onMove: (folder: FolderType) => void;
  onToggleStatus: (folder: FolderType) => void;
  onDelete: (folder: FolderType) => void;
  onViewDetails: (folder: FolderType) => void;
}

const getParentId = (folder: FolderType): string | null => {
  if (!folder.parent) return null;
  return typeof folder.parent === 'string' ? folder.parent : folder.parent._id;
};

const FolderExplorerTree: React.FC<FolderExplorerTreeProps> = ({
  folders,
  isLoading,
  isError,
  onRetry,
  selectedFolderId,
  onSelectFolder,
  canManageFolders,
  expandedFolders,
  onToggleExpand,
  onExpandAll,
  onCollapseAll,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  showDepartmentBadge,
  onCreateSubfolder,
  onEdit,
  onMove,
  onToggleStatus,
  onDelete,
  onViewDetails,
}) => {
  const { t } = useLanguage();
  const { dir } = useDirection();

  const childrenMap = useMemo(() => {
    const map = new Map<string, FolderType[]>();
    for (const f of folders) {
      const pId = getParentId(f) || '__root__';
      const list = map.get(pId) || [];
      list.push(f);
      map.set(pId, list);
    }
    return map;
  }, [folders]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  // Determine which folder IDs match filters or have a matching descendant
  const visibleFolderIds = useMemo(() => {
    if (!normalizedSearch && statusFilter === 'all') {
      return null; // All folders visible
    }

    const folderById = new Map(folders.map((f) => [f._id, f]));
    const visible = new Set<string>();

    const matchesSelf = (f: FolderType) => {
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
      const matchesText =
        !normalizedSearch ||
        f.name.toLowerCase().includes(normalizedSearch) ||
        (f.description && f.description.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesText;
    };

    for (const f of folders) {
      if (matchesSelf(f)) {
        let curr: FolderType | undefined = f;
        while (curr) {
          visible.add(curr._id);
          const pId = getParentId(curr);
          curr = pId ? folderById.get(pId) : undefined;
        }
      }
    }

    return visible;
  }, [folders, normalizedSearch, statusFilter]);

  const rootFolders = useMemo(() => {
    const roots = childrenMap.get('__root__') || [];
    if (!visibleFolderIds) return roots;
    return roots.filter((f) => visibleFolderIds.has(f._id));
  }, [childrenMap, visibleFolderIds]);

  const getVisibleChildren = (parentId: string) => {
    const children = childrenMap.get(parentId) || [];
    if (!visibleFolderIds) return children;
    return children.filter((c) => visibleFolderIds.has(c._id));
  };

  const renderFolderRow = (folder: FolderType, level: number = 0): React.ReactNode => {
    const visibleChildren = getVisibleChildren(folder._id);
    const allChildrenCount = (childrenMap.get(folder._id) || []).length;
    const hasChildren = visibleChildren.length > 0;
    const isExpanded =
      expandedFolders.has(folder._id) ||
      Boolean(normalizedSearch && hasChildren) ||
      Boolean(statusFilter !== 'all' && hasChildren);
    const isSelected = selectedFolderId === folder._id;
    const isClosed = folder.status === 'Fermé';
    const docCount = folder.documentCount ?? 0;
    const deptName =
      typeof folder.department === 'object' ? folder.department?.name : '';

    return (
      <div key={folder._id}>
        <FolderContextMenu
          folder={folder}
          onEdit={onEdit}
          onDelete={onDelete}
          onCreateSubfolder={onCreateSubfolder}
          onMove={onMove}
          onToggleStatus={onToggleStatus}
          onViewDetails={onViewDetails}
          onOpenDocuments={onSelectFolder}
          readOnly={!canManageFolders}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectFolder(folder)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectFolder(folder);
              }
            }}
            style={{ paddingInlineStart: `${level * 16 + 10}px` }}
            className={cn(
              'group flex items-center gap-2 py-2 pe-2.5 rounded-lg cursor-pointer transition-colors duration-150 border text-sm select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]',
              isSelected
                ? 'bg-[#2c5282]/10 dark:bg-sky-950/60 border-[#2c5282]/30 dark:border-sky-700/60 text-[#1e3a5f] dark:text-sky-200 font-semibold'
                : 'border-transparent hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
            )}
          >
            {/* Expand/Collapse chevron */}
            {allChildrenCount > 0 ? (
              <button
                type="button"
                aria-label={isExpanded ? t('folders.explorer.collapseAll') : t('folders.explorer.expandAll')}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(folder._id);
                }}
                className="w-5 h-5 rounded flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 hover:text-slate-800 dark:hover:text-slate-100 shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                )}
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}

            {/* Folder Icon */}
            {isClosed ? (
              <Archive
                className={cn(
                  'h-4 w-4 shrink-0',
                  isSelected
                    ? 'text-[#2c5282] dark:text-sky-400'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              />
            ) : isSelected || isExpanded ? (
              <FolderOpen
                className={cn(
                  'h-4 w-4 shrink-0',
                  isSelected
                    ? 'text-[#2c5282] dark:text-sky-400'
                    : 'text-amber-600 dark:text-amber-400'
                )}
              />
            ) : (
              <Folder
                className={cn(
                  'h-4 w-4 shrink-0',
                  isSelected
                    ? 'text-[#2c5282] dark:text-sky-400'
                    : 'text-amber-500 dark:text-amber-400'
                )}
              />
            )}

            {/* Folder Name + Optional Dept Pill */}
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <span className="truncate">{folder.name}</span>
              {showDepartmentBadge && deptName && (
                <span className="hidden sm:inline-block shrink-0 max-w-[90px] truncate px-1.5 py-0.2 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/70">
                  {deptName}
                </span>
              )}
            </div>

            {/* Closed dot */}
            {isClosed && (
              <span
                title={t('folders.explorer.filterClosed')}
                className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0"
              />
            )}

            {/* Document count pill */}
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-bold tabular-nums shrink-0',
                isSelected
                  ? 'bg-[#2c5282] text-white dark:bg-sky-500 dark:text-slate-950'
                  : docCount > 0
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    : 'text-slate-400 dark:text-slate-500'
              )}
            >
              {docCount}
            </span>

            {/* Row Kebab Menu */}
            <DropdownMenu dir={dir}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={t('folders.explorer.colActions')}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-opacity shrink-0"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  onClick={() => onViewDetails(folder)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Info className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                  <span>{t('folders.explorer.details')}</span>
                </DropdownMenuItem>
                {canManageFolders && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onCreateSubfolder(folder._id)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <FolderPlus className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                      <span>{t('folders.explorer.addSubfolder')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onEdit(folder)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Edit3 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                      <span>{t('folders.explorer.edit')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onMove(folder)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <MoveRight className="h-4 w-4 text-slate-600 dark:text-slate-300 rtl:rotate-180" />
                      <span>{t('folders.explorer.move')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onToggleStatus(folder)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Archive className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span>
                        {folder.status === 'En cours'
                          ? t('folders.explorer.archive')
                          : t('folders.explorer.activate')}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(folder)}
                      className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{t('folders.explorer.delete')}</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </FolderContextMenu>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {visibleChildren.map((child) => renderFolderRow(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col">
      {/* Search + Filters */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 space-y-2.5 bg-slate-50/60 dark:bg-slate-900/80">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-500 dark:text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('folders.explorer.searchFoldersPlaceholder')}
            className="h-9 ps-9 pe-3 text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-lg"
          />
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/70 dark:border-slate-700/70">
            {(['all', 'En cours', 'Fermé'] as const).map((status) => {
              const active = statusFilter === status;
              const label =
                status === 'all'
                  ? t('folders.explorer.filterAll')
                  : status === 'En cours'
                    ? t('folders.explorer.filterActive')
                    : t('folders.explorer.filterClosed');
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusFilterChange(status)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
                    active
                      ? 'bg-white dark:bg-slate-900 text-[#2c5282] dark:text-sky-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onExpandAll}
              title={t('folders.explorer.expandAll')}
              className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronsDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onCollapseAll}
              title={t('folders.explorer.collapseAll')}
              className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronsUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tree Content */}
      <div className="p-2.5 space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar">
        {/* Overview root button */}
        <button
          type="button"
          onClick={() => onSelectFolder(null)}
          className={cn(
            'w-full flex items-center gap-2 py-2 px-2.5 rounded-lg text-sm font-medium transition-colors border',
            selectedFolderId === null
              ? 'bg-[#2c5282]/10 dark:bg-sky-950/60 border-[#2c5282]/30 dark:border-sky-700/60 text-[#1e3a5f] dark:text-sky-200 font-semibold'
              : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
          )}
        >
          <Home className="h-4 w-4 text-[#2c5282] dark:text-sky-400 shrink-0" />
          <span className="flex-1 text-start truncate">{t('folders.explorer.overview')}</span>
          <span className="text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">
            {folders.length}
          </span>
        </button>

        {isLoading ? (
          <div className="space-y-2 p-1.5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-6 text-center space-y-3">
            <AlertCircle className="h-7 w-7 text-red-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('folders.errorLoading')}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{t('common.retry')}</span>
            </Button>
          </div>
        ) : rootFolders.length === 0 ? (
          <div className="py-10 px-4 text-center space-y-2">
            <Folder className="h-9 w-9 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {normalizedSearch || statusFilter !== 'all'
                ? t('folders.explorer.noFoldersMatch')
                : t('folders.explorer.noFoldersYet')}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 pt-1">
            {rootFolders.map((folder) => renderFolderRow(folder, 0))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderExplorerTree;
