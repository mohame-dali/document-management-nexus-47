import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Folder,
  FolderOpen,
  Archive,
  ChevronRight,
  Search,
  Eye,
  ExternalLink,
  FolderMinus,
  Inbox,
  Send,
  FolderPlus,
  Edit3,
  MoveRight,
  Trash2,
  Tag,
  CheckCircle2,
  ArrowRight,
  Calendar,
  Building2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Folder as FolderType,
  IncomingDocument,
  OutgoingDocument,
} from '@/types';
import {
  getFolderDocuments,
  assignDocumentToFolder,
} from '@/services/folderService';
import CopyReferenceButton from '@/components/documents/CopyReferenceButton';
import DocumentCategoryManager from './DocumentCategoryManager';
import { formatLongDate } from '@/utils/formatDate';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { cn } from '@/lib/utils';

type AnyDoc = IncomingDocument | OutgoingDocument;

interface FolderDetailPaneProps {
  folders: FolderType[];
  selectedFolder: FolderType | null;
  onSelectFolder: (folder: FolderType | null) => void;
  viewMode: 'folder' | 'classify';
  onViewModeChange: (mode: 'folder' | 'classify') => void;
  canManageFolders: boolean;
  targetDepartmentId?: string;
  unclassifiedIncomingCount: number;
  unclassifiedOutgoingCount: number;
  onCreateSubfolder: (parentId: string) => void;
  onEditFolder: (folder: FolderType) => void;
  onMoveFolder: (folder: FolderType) => void;
  onToggleStatus: (folder: FolderType) => void;
  onDeleteFolder: (folder: FolderType) => void;
  onPreviewDocument: (doc: AnyDoc, direction: 'incoming' | 'outgoing') => void;
}

const getParentId = (folder: FolderType): string | null => {
  if (!folder.parent) return null;
  return typeof folder.parent === 'string' ? folder.parent : folder.parent._id;
};

const FolderDetailPane: React.FC<FolderDetailPaneProps> = ({
  folders,
  selectedFolder,
  onSelectFolder,
  viewMode,
  onViewModeChange,
  canManageFolders,
  targetDepartmentId,
  unclassifiedIncomingCount,
  unclassifiedOutgoingCount,
  onCreateSubfolder,
  onEditFolder,
  onMoveFolder,
  onToggleStatus,
  onDeleteFolder,
  onPreviewDocument,
}) => {
  const { t, language } = useLanguage();
  const { dir } = useDirection();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isFr = language === 'fr';
  const locale = isFr ? 'fr' : 'ar';

  const [docSearch, setDocSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');

  const {
    data: folderDocuments,
    isLoading: isDocsLoading,
  } = useQuery({
    queryKey: ['folderDocuments', selectedFolder?._id],
    queryFn: () => getFolderDocuments(selectedFolder!._id),
    enabled: !!selectedFolder && viewMode === 'folder',
  });

  const removeFromFolderMutation = useMutation({
    mutationFn: ({
      documentId,
      type,
    }: {
      documentId: string;
      type: 'incoming' | 'outgoing';
    }) => assignDocumentToFolder(documentId, null, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folderDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['outgoingDocuments'] });
      toast.success(
        isFr ? 'Document retiré du dossier' : 'تمت إزالة المستند من المجلد'
      );
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(
        msg ||
          (isFr ? 'Échec du retrait du document' : 'فشل في إزالة المستند من المجلد')
      );
    },
  });

  // Ancestor breadcrumb chain for selected folder
  const ancestorChain = useMemo(() => {
    if (!selectedFolder) return [];
    const byId = new Map(folders.map((f) => [f._id, f]));
    const chain: FolderType[] = [];
    let current: FolderType | undefined = selectedFolder;
    const visited = new Set<string>();
    while (current && !visited.has(current._id)) {
      visited.add(current._id);
      chain.unshift(current);
      const pId = getParentId(current);
      current = pId ? byId.get(pId) : undefined;
    }
    return chain;
  }, [folders, selectedFolder]);

  // Direct subfolders of selected folder
  const directSubfolders = useMemo(() => {
    if (!selectedFolder) return [];
    return folders.filter((f) => getParentId(f) === selectedFolder._id);
  }, [folders, selectedFolder]);

  // Combined incoming + outgoing documents in selected folder
  const incomingList = useMemo(
    () => folderDocuments?.incomingDocuments || [],
    [folderDocuments]
  );
  const outgoingList = useMemo(
    () => folderDocuments?.outgoingDocuments || [],
    [folderDocuments]
  );

  const mergedDocuments = useMemo(() => {
    type DocRow =
      | { direction: 'incoming'; doc: IncomingDocument; dateStr: string }
      | { direction: 'outgoing'; doc: OutgoingDocument; dateStr: string };

    const items: DocRow[] = [];
    if (docTypeFilter === 'all' || docTypeFilter === 'incoming') {
      for (const doc of incomingList) {
        items.push({
          direction: 'incoming',
          doc,
          dateStr: doc.arrivalDate || doc.createdAt,
        });
      }
    }
    if (docTypeFilter === 'all' || docTypeFilter === 'outgoing') {
      for (const doc of outgoingList) {
        items.push({
          direction: 'outgoing',
          doc,
          dateStr: doc.issueDate || doc.createdAt,
        });
      }
    }

    const q = docSearch.trim().toLowerCase();
    const filtered = q
      ? items.filter(({ doc, direction }) => {
          const refStr = `#${doc.serialNumber}/${doc.year}`;
          const counterpart =
            direction === 'incoming'
              ? (doc as IncomingDocument).source || ''
              : (doc as OutgoingDocument).assignedTo?.join(', ') || '';
          return (
            doc.subject?.toLowerCase().includes(q) ||
            refStr.toLowerCase().includes(q) ||
            String(doc.serialNumber).includes(q) ||
            counterpart.toLowerCase().includes(q)
          );
        })
      : items;

    return filtered.sort(
      (a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime()
    );
  }, [incomingList, outgoingList, docTypeFilter, docSearch]);

  // Recently active folders for initial overview state
  const recentFolders = useMemo(() => {
    return [...folders]
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'En cours' ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 6);
  }, [folders]);

  const unclassifiedTotal = unclassifiedIncomingCount + unclassifiedOutgoingCount;

  // 1. Quick Classification Mode
  if (viewMode === 'classify') {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {t('folders.tab.categorization')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {t('folders.explorer.unclassifiedQuickDesc')}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onViewModeChange('folder')}
            className="h-9 px-3.5 rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold gap-1.5"
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            <span>
              {selectedFolder
                ? `${t('folders.explorer.backToFolder')}: ${selectedFolder.name}`
                : t('folders.explorer.overview')}
            </span>
          </Button>
        </div>

        <DocumentCategoryManager
          folders={folders}
          canManage={canManageFolders}
          departmentId={targetDepartmentId}
          initialTargetFolderId={selectedFolder?._id}
          onPreviewDocument={onPreviewDocument}
        />
      </div>
    );
  }

  // 2. Initial Overview State (no folder selected)
  if (!selectedFolder) {
    return (
      <div className="space-y-5">
        {/* Unclassified Quick Access Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                'w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border',
                unclassifiedTotal > 0
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/70'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/70'
              )}
            >
              {unclassifiedTotal > 0 ? (
                <Tag className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {unclassifiedTotal > 0
                    ? t('folders.explorer.unclassifiedQuickAccess')
                    : t('folders.explorer.allClassified')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70">
                  {unclassifiedTotal}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {t('folders.explorer.unclassifiedQuickDesc')}
                {' · '}
                <span className="tabular-nums font-medium">
                  {unclassifiedIncomingCount} {t('folders.explorer.incoming')} ·{' '}
                  {unclassifiedOutgoingCount} {t('folders.explorer.outgoing')}
                </span>
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => onViewModeChange('classify')}
            className="h-10 px-4 rounded-lg bg-[#2c5282] hover:bg-[#1e3a5f] text-white font-semibold shrink-0 gap-2"
          >
            <Tag className="h-4 w-4" />
            <span>{t('folders.explorer.openQuickClassify')}</span>
          </Button>
        </div>

        {/* Recently Active Folders Grid */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FolderOpen className="h-4.5 w-4.5 text-[#2c5282] dark:text-sky-400" />
              <span>{t('folders.explorer.recentFolders')}</span>
            </h3>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              {folders.length} {t('folders.explorer.foldersStat')}
            </span>
          </div>

          {recentFolders.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-slate-600 dark:text-slate-400">
              <Folder className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">{t('folders.explorer.noFoldersYet')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {recentFolders.map((folder) => {
                const deptName =
                  typeof folder.department === 'object' ? folder.department?.name : '';
                const isClosed = folder.status === 'Fermé';
                return (
                  <button
                    key={folder._id}
                    type="button"
                    onClick={() => onSelectFolder(folder)}
                    className="text-start p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 hover:bg-blue-50/40 dark:hover:bg-slate-800/80 hover:border-[#2c5282]/40 dark:hover:border-sky-700/60 transition-colors duration-150 flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#2c5282]/10 dark:bg-sky-950/60 text-[#2c5282] dark:text-sky-300 flex items-center justify-center shrink-0">
                          {isClosed ? (
                            <Archive className="h-4.5 w-4.5 text-slate-500" />
                          ) : (
                            <Folder className="h-4.5 w-4.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-[#2c5282] dark:group-hover:text-sky-300">
                            {folder.name}
                          </h4>
                          {deptName && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
                              {deptName}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold tabular-nums bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 shrink-0">
                        {folder.documentCount ?? 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                      <span
                        className={cn(
                          'font-semibold',
                          isClosed
                            ? 'text-slate-500 dark:text-slate-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        )}
                      >
                        {isClosed
                          ? t('folders.explorer.filterClosed')
                          : t('folders.explorer.filterActive')}
                      </span>
                      <span className="tabular-nums">
                        <bdi dir={dir}>{formatLongDate(folder.createdAt, locale)}</bdi>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Selected Folder Detail View
  const deptName =
    typeof selectedFolder.department === 'object'
      ? selectedFolder.department?.name
      : '';
  const totalInFolder = incomingList.length + outgoingList.length;

  return (
    <div className="space-y-4">
      {/* Folder Path + Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Ancestor Path */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => onSelectFolder(null)}
            className="hover:text-[#2c5282] dark:hover:text-sky-300 font-medium transition-colors"
          >
            {t('folders.explorer.root')}
          </button>
          {ancestorChain.map((item, index) => {
            const isLast = index === ancestorChain.length - 1;
            return (
              <React.Fragment key={item._id}>
                <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180 text-slate-400 shrink-0" />
                {isLast ? (
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {item.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectFolder(item)}
                    className="hover:text-[#2c5282] dark:hover:text-sky-300 font-medium transition-colors"
                  >
                    {item.name}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-[#2c5282]/10 dark:bg-sky-950/60 border border-[#2c5282]/20 dark:border-sky-800/60 text-[#2c5282] dark:text-sky-300 flex items-center justify-center shrink-0">
              {selectedFolder.status === 'Fermé' ? (
                <Archive className="h-5 w-5" />
              ) : (
                <FolderOpen className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                  {selectedFolder.name}
                </h2>
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-bold border',
                    selectedFolder.status === 'En cours'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/70'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                  )}
                >
                  {selectedFolder.status === 'En cours'
                    ? t('folders.explorer.filterActive')
                    : t('folders.explorer.filterClosed')}
                </span>
                {deptName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700">
                    <Building2 className="h-3 w-3 text-[#2c5282] dark:text-sky-400" />
                    <span>{deptName}</span>
                  </span>
                )}
              </div>
              {selectedFolder.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {selectedFolder.description}
                </p>
              )}
            </div>
          </div>

          {canManageFolders && (
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onCreateSubfolder(selectedFolder._id)}
                className="h-8 px-2.5 text-xs font-semibold gap-1.5"
              >
                <FolderPlus className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
                <span>{t('folders.explorer.addSubfolder')}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onEditFolder(selectedFolder)}
                className="h-8 px-2.5 text-xs font-semibold gap-1"
                title={t('folders.explorer.edit')}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">{t('folders.explorer.edit')}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onMoveFolder(selectedFolder)}
                className="h-8 px-2.5 text-xs font-semibold gap-1"
                title={t('folders.explorer.move')}
              >
                <MoveRight className="h-3.5 w-3.5 rtl:rotate-180" />
                <span className="hidden xl:inline">{t('folders.explorer.move')}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onToggleStatus(selectedFolder)}
                className="h-8 px-2.5 text-xs font-semibold gap-1"
                title={
                  selectedFolder.status === 'En cours'
                    ? t('folders.explorer.archive')
                    : t('folders.explorer.activate')
                }
              >
                <Archive className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onDeleteFolder(selectedFolder)}
                className="h-8 px-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200/80 dark:border-red-900/60"
                title={t('folders.explorer.delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Subfolders Grid (if any) */}
      {directSubfolders.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Folder className="h-4 w-4 text-amber-500" />
              <span>{t('folders.explorer.subfolders')}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                ({directSubfolders.length})
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {directSubfolders.map((sub) => (
              <button
                key={sub._id}
                type="button"
                onClick={() => onSelectFolder(sub)}
                className="flex items-center justify-between gap-2.5 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-blue-50/50 dark:hover:bg-slate-800/70 hover:border-[#2c5282]/40 transition-colors text-start"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {sub.status === 'Fermé' ? (
                    <Archive className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {sub.name}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold tabular-nums bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                  {sub.documentCount ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Classified Documents Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 me-2">
              <FileText className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
              <span>{t('folders.explorer.classifiedDocuments')}</span>
            </h3>

            <div className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/70 dark:border-slate-700/70">
              <button
                type="button"
                onClick={() => setDocTypeFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors tabular-nums',
                  docTypeFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-[#2c5282] dark:text-sky-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                )}
              >
                {t('folders.explorer.allTypes')} ({totalInFolder})
              </button>
              <button
                type="button"
                onClick={() => setDocTypeFilter('incoming')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors tabular-nums',
                  docTypeFilter === 'incoming'
                    ? 'bg-white dark:bg-slate-900 text-[#2c5282] dark:text-sky-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                )}
              >
                {t('folders.explorer.incoming')} ({incomingList.length})
              </button>
              <button
                type="button"
                onClick={() => setDocTypeFilter('outgoing')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors tabular-nums',
                  docTypeFilter === 'outgoing'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                )}
              >
                {t('folders.explorer.outgoing')} ({outgoingList.length})
              </button>
            </div>
          </div>

          <div className="relative sm:w-64">
            <Search className="h-4 w-4 text-slate-500 dark:text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder={t('folders.explorer.searchDocsPlaceholder')}
              className="h-9 ps-9 pe-3 text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>

        {isDocsLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : mergedDocuments.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2.5">
            <FolderOpen className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('folders.explorer.noDocsInFolder')}
            </p>
            {canManageFolders && unclassifiedTotal > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onViewModeChange('classify')}
                className="gap-1.5 mt-1"
              >
                <Tag className="h-3.5 w-3.5" />
                <span>{t('folders.explorer.classifyUnclassified')}</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs font-bold text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-4 text-start whitespace-nowrap">
                    {t('folders.explorer.colRef')}
                  </th>
                  <th className="py-2.5 px-4 text-start">
                    {t('folders.explorer.colSubject')}
                  </th>
                  <th className="py-2.5 px-4 text-start whitespace-nowrap">
                    {t('folders.explorer.colDate')}
                  </th>
                  <th className="py-2.5 px-4 text-end whitespace-nowrap">
                    {t('folders.explorer.colActions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
                {mergedDocuments.map(({ direction, doc, dateStr }) => {
                  const isIncoming = direction === 'incoming';
                  const refText = `${doc.serialNumber}/${doc.year}`;
                  const counterpart = isIncoming
                    ? (doc as IncomingDocument).source
                    : (doc as OutgoingDocument).assignedTo?.join(', ');

                  return (
                    <tr
                      key={`${direction}-${doc._id}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border tabular-nums',
                              isIncoming
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300 border-blue-200/80 dark:border-blue-800/70'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/70'
                            )}
                          >
                            {isIncoming ? (
                              <Inbox className="h-3 w-3" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            <bdi dir="ltr">#{refText}</bdi>
                          </span>
                          <CopyReferenceButton value={refText} />
                        </div>
                      </td>

                      <td className="py-3 px-4 align-middle max-w-md">
                        <button
                          type="button"
                          onClick={() =>
                            doc.scannedDocument
                              ? onPreviewDocument(doc, direction)
                              : navigate(`/dashboard/mail/${direction}/${doc._id}`)
                          }
                          className="font-semibold text-slate-900 dark:text-slate-100 hover:text-[#2c5282] dark:hover:text-sky-300 text-start line-clamp-1 transition-colors"
                          title={doc.subject}
                        >
                          {doc.subject}
                        </button>
                        {counterpart && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {counterpart}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 align-middle whitespace-nowrap text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <bdi dir={dir}>{formatLongDate(dateStr, locale)}</bdi>
                        </span>
                      </td>

                      <td className="py-3 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {doc.scannedDocument && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onPreviewDocument(doc, direction)}
                              title={t('folders.explorer.previewPdf')}
                              className="h-8 w-8 p-0 text-[#2c5282] dark:text-sky-300 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/dashboard/mail/${direction}/${doc._id}`)
                            }
                            title={t('folders.explorer.openDetails')}
                            className="h-8 w-8 p-0 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>

                          {canManageFolders && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={removeFromFolderMutation.isPending}
                              onClick={() =>
                                removeFromFolderMutation.mutate({
                                  documentId: doc._id,
                                  type: direction,
                                })
                              }
                              title={t('folders.explorer.removeFromFolder')}
                              className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              <FolderMinus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderDetailPane;
