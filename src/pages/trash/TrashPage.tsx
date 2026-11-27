import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2,
  RotateCcw,
  FileInput,
  FileOutput,
  Folder,
  MessageCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  getTrashData,
  restoreItem,
  permanentDeleteItem,
  emptyTrash,
  TrashItem,
  TrashItemType,
  FilterType
} from '@/services/trashService';
import { formatDateTime } from '@/utils/formatDate';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import PageBreadcrumb from '@/components/common/PageBreadcrumb';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';

const TrashPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const { dir } = useDirection();
  const isFr = language === 'fr';
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state for permanent delete of a single item
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: TrashItemType; label: string } | null>(null);

  // Dialog state for emptying trash
  const [isEmptyTrashOpen, setIsEmptyTrashOpen] = useState(false);

  // Fetch trash items and counts
  const {
    data: trashData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['trash', filterType],
    queryFn: () => getTrashData(filterType),
    refetchInterval: 60 * 1000, // 1 minute
    refetchIntervalInBackground: false,
  });

  const items = trashData?.items || [];
  const counts = trashData?.counts || { total: 0, incoming: 0, outgoing: 0, folder: 0, message: 0 };

  // Invalidate relevant queries helper
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['trash'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['incoming-documents'] });
    queryClient.invalidateQueries({ queryKey: ['outgoing-documents'] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
    queryClient.invalidateQueries({ queryKey: ['folder-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['messages'] });
    queryClient.invalidateQueries({ queryKey: ['messages-count'] });
  };

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: ({ type, id }: { type: TrashItemType; id: string }) => restoreItem(type, id),
    onSuccess: () => {
      toast.success(t('trash.restoreSuccess'));
      invalidateQueries();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const message = e?.response?.data?.message || e?.message || t('trash.restoreError');
      toast.error(message);
    },
  });

  // Permanent delete mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: ({ type, id }: { type: TrashItemType; id: string }) => permanentDeleteItem(type, id),
    onSuccess: () => {
      toast.success(t('trash.deleteSuccess'));
      setItemToDelete(null);
      invalidateQueries();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const message = e?.response?.data?.message || e?.message || t('trash.deleteError');
      toast.error(message);
    },
  });

  // Empty trash mutation
  const emptyTrashMutation = useMutation({
    mutationFn: () => emptyTrash(filterType),
    onSuccess: () => {
      toast.success(t('trash.emptySuccess'));
      setIsEmptyTrashOpen(false);
      invalidateQueries();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const message = e?.response?.data?.message || e?.message || t('trash.emptyError');
      toast.error(message);
    },
  });

  // Handle Restore
  const handleRestore = (item: TrashItem) => {
    restoreMutation.mutate({ type: item.type, id: item._id });
  };

  // Confirm Permanent Delete
  const handleConfirmPermanentDelete = () => {
    if (itemToDelete) {
      permanentDeleteMutation.mutate({ type: itemToDelete.type, id: itemToDelete.id });
    }
  };

  // Filter items by local search if provided
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const labelMatch = item.label?.toLowerCase().includes(q);
    const subjectMatch = item.subject?.toLowerCase().includes(q);
    const contentMatch = item.content?.toLowerCase().includes(q);
    const idMatch = item.documentId?.toLowerCase().includes(q);
    const userMatch = item.deletedBy?.username?.toLowerCase().includes(q);
    const senderMatch = item.sender?.username?.toLowerCase().includes(q);
    return labelMatch || subjectMatch || contentMatch || idMatch || userMatch || senderMatch;
  });

  // Render Type Badge
  const renderTypeBadge = (type: TrashItemType) => {
    switch (type) {
      case 'incoming':
      case 'IncomingDocument':
        return (
          <Badge className="rounded-full bg-[#2c5282]/10 dark:bg-sky-950/60 text-[#2c5282] dark:text-sky-300 hover:bg-[#2c5282]/15 dark:hover:bg-sky-950/80 border border-[#2c5282]/30 dark:border-sky-800/70 gap-1.5 py-1 px-3 font-medium text-xs whitespace-nowrap">
            <FileInput className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
            <span>{t('trash.typeIncoming')}</span>
          </Badge>
        );
      case 'outgoing':
      case 'OutgoingDocument':
        return (
          <Badge className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 border border-emerald-300/80 dark:border-emerald-800/70 gap-1.5 py-1 px-3 font-medium text-xs whitespace-nowrap">
            <FileOutput className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t('trash.typeOutgoing')}</span>
          </Badge>
        );
      case 'folder':
      case 'Folder':
        return (
          <Badge className="rounded-full bg-[#FFCB56]/20 dark:bg-amber-950/50 text-[#744210] dark:text-amber-300 hover:bg-[#FFCB56]/30 dark:hover:bg-amber-950/70 border border-[#d69e2e]/40 dark:border-amber-800/70 gap-1.5 py-1 px-3 font-medium text-xs whitespace-nowrap">
            <Folder className="h-3.5 w-3.5 text-[#b7791f] dark:text-amber-400" />
            <span>{t('trash.typeFolder')}</span>
          </Badge>
        );
      case 'message':
      case 'Message':
        return (
          <Badge className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/70 gap-1.5 py-1 px-3 font-medium text-xs whitespace-nowrap">
            <MessageCircle className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{t('trash.typeMessage')}</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="rounded-full text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 text-xs px-3 py-1 whitespace-nowrap">
            {type}
          </Badge>
        );
    }
  };

  const isTrashEmpty = items.length === 0;
  const isEmptyButtonDisabled = isTrashEmpty || isLoading || emptyTrashMutation.isPending;

  return (
    <div dir={dir} className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-slate-950 text-start">
      <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <PageBreadcrumb
          showHomeIcon
          homeTo="/dashboard"
          homeLabel={t('common.home')}
          items={[
            { label: t('trash.title') },
          ]}
        />

        {/* Header */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 rounded-lg shrink-0">
              <Trash2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('trash.title')}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                {t('trash.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-[44px] px-4 gap-2 rounded-lg text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              <span>{t('trash.refresh')}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className={`h-11 min-h-[44px] px-5 gap-2 rounded-lg font-medium whitespace-nowrap shrink-0 transition-colors ${
                isTrashEmpty
                  ? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/80 dark:text-slate-500 dark:border-slate-700 hover:bg-slate-100 hover:text-slate-400 cursor-not-allowed opacity-100'
                  : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 hover:border-rose-700 hover:text-white shadow-xs'
              }`}
              onClick={() => setIsEmptyTrashOpen(true)}
              disabled={isEmptyButtonDisabled}
            >
              <Trash2 className="h-4 w-4" />
              <span>{t('trash.emptyTrash')}</span>
            </Button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Type Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={filterType === 'all' ? 'default' : 'outline'}
              className={`h-10 min-h-[40px] px-3.5 rounded-lg text-sm font-medium gap-2 whitespace-nowrap shrink-0 ${
                filterType === 'all'
                  ? 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              onClick={() => setFilterType('all')}
            >
              <span>{t('trash.filterAll')}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                  filterType === 'all'
                    ? 'bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {counts.total}
              </span>
            </Button>

            <Button
              type="button"
              variant={filterType === 'incoming' ? 'default' : 'outline'}
              className={`h-10 min-h-[40px] px-3.5 rounded-lg text-sm font-medium gap-2 whitespace-nowrap shrink-0 ${
                filterType === 'incoming'
                  ? 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              onClick={() => setFilterType('incoming')}
            >
              <FileInput className="h-4 w-4" />
              <span>{t('trash.filterIncoming')}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                  filterType === 'incoming'
                    ? 'bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {counts.incoming}
              </span>
            </Button>

            <Button
              type="button"
              variant={filterType === 'outgoing' ? 'default' : 'outline'}
              className={`h-10 min-h-[40px] px-3.5 rounded-lg text-sm font-medium gap-2 whitespace-nowrap shrink-0 ${
                filterType === 'outgoing'
                  ? 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              onClick={() => setFilterType('outgoing')}
            >
              <FileOutput className="h-4 w-4" />
              <span>{t('trash.filterOutgoing')}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                  filterType === 'outgoing'
                    ? 'bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {counts.outgoing}
              </span>
            </Button>

            <Button
              type="button"
              variant={filterType === 'folder' ? 'default' : 'outline'}
              className={`h-10 min-h-[40px] px-3.5 rounded-lg text-sm font-medium gap-2 whitespace-nowrap shrink-0 ${
                filterType === 'folder'
                  ? 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              onClick={() => setFilterType('folder')}
            >
              <Folder className="h-4 w-4" />
              <span>{t('trash.filterFolders')}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                  filterType === 'folder'
                    ? 'bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {counts.folder}
              </span>
            </Button>

            <Button
              type="button"
              variant={filterType === 'message' ? 'default' : 'outline'}
              className={`h-10 min-h-[40px] px-3.5 rounded-lg text-sm font-medium gap-2 whitespace-nowrap shrink-0 ${
                filterType === 'message'
                  ? 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              onClick={() => setFilterType('message')}
            >
              <MessageCircle
                className={`h-4 w-4 ${
                  filterType === 'message'
                    ? 'text-white dark:text-slate-900'
                    : 'text-indigo-600 dark:text-indigo-400'
                }`}
              />
              <span>{t('trash.filterMessages')}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                  filterType === 'message'
                    ? 'bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {counts.message}
              </span>
            </Button>
          </div>

          {/* Local Search input */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder={t('trash.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 min-h-[40px] ps-9 pe-4 rounded-lg bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus-visible:ring-1 focus-visible:ring-slate-400"
            />
          </div>
        </div>

        {/* Main Table / Content Area */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          {isLoading ? (
            <TableSkeleton columns={5} rows={6} />
          ) : isError ? (
            <EmptyState
              icon={<AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />}
              title={t('trash.loadErrorTitle')}
              description={(error as Error)?.message || t('trash.loadErrorDesc')}
              className="border-0 rounded-none py-14"
              action={
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 min-h-[44px] px-4 rounded-lg text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 inline-flex items-center gap-2"
                  onClick={() => refetch()}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>{t('trash.retry')}</span>
                </Button>
              }
            />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={<Trash2 className="h-6 w-6 text-slate-600 dark:text-slate-300" />}
              title={t('trash.emptyTitle')}
              description={
                searchQuery.trim()
                  ? t('trash.emptyNoResults')
                  : t('trash.emptyDesc')
              }
              className="border-0 rounded-none py-14"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold">
                    <th className="py-3 px-4 sm:px-6 text-start w-36 font-bold text-sm">{t('trash.colType')}</th>
                    <th className="py-3 px-4 sm:px-6 text-start font-bold text-sm">{t('trash.colName')}</th>
                    <th className="py-3 px-4 sm:px-6 text-start w-52 font-bold text-sm">{t('trash.colDeletedAt')}</th>
                    <th className="py-3 px-4 sm:px-6 text-start w-48 font-bold text-sm">{t('trash.colDeletedBy')}</th>
                    <th className="py-3 px-4 sm:px-6 text-center w-56 font-bold text-sm">{t('trash.colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {filteredItems.map((item) => {
                  const isRestoring = restoreMutation.isPending && restoreMutation.variables?.id === item._id;
                  const isDeleting = permanentDeleteMutation.isPending && permanentDeleteMutation.variables?.id === item._id;
                  const isMessage = item.type === 'message' || item.type === 'Message';

                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors duration-150 min-h-[64px]"
                    >
                      {/* Column 1: Type */}
                      <td className="py-3 px-4 sm:px-6 align-middle">
                        {renderTypeBadge(item.type)}
                      </td>

                      {/* Column 2: Name / Subject */}
                      <td className="py-3 px-4 sm:px-6 align-middle">
                        {isMessage ? (
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                              {item.subject || item.label || t('trash.noSubject')}
                            </p>
                            {item.content && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                {item.content}
                              </p>
                            )}
                            {item.attachments && item.attachments.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                                <span>📎</span>
                                <span>{t('trash.attachmentCount', { count: item.attachments.length })}</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                              {item.label}
                            </p>
                            {item.documentId && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                                {t('trash.referenceNumber')} {item.documentId}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Column 3: Deletion Date */}
                      <td className="py-3 px-4 sm:px-6 align-middle text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                        <bdi dir={isFr ? 'ltr' : 'rtl'} className="tabular-nums">
                          {formatDateTime(item.deletedAt, isFr ? 'fr' : 'ar')}
                        </bdi>
                      </td>

                      {/* Column 4: Deleted By / Sender & Recipients */}
                      <td className="py-3 px-4 sm:px-6 align-middle text-sm text-slate-700 dark:text-slate-200">
                        {isMessage ? (
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-medium">
                              <span className="text-slate-600 dark:text-slate-300">{t('trash.from')}</span>
                              <span className="truncate max-w-[140px]">{item.sender?.username || '—'}</span>
                            </div>
                            {item.recipients && item.recipients.length > 0 && (
                              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                <span>{t('trash.to')}</span>
                                <span className="truncate max-w-[140px]">
                                  {item.recipients
                                    .map((r: { user?: { username?: string }; username?: string }) => r.user?.username || r.username || t('trash.userFallback'))
                                    .join(isFr ? ', ' : '، ')}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          item.deletedBy?.username || '—'
                        )}
                      </td>

                      {/* Column 5: Actions */}
                      <td className="py-3 px-4 sm:px-6 align-middle text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-10 min-h-[40px] px-3.5 gap-1.5 rounded-lg text-[#2c5282] dark:text-sky-300 border-[#2c5282]/30 dark:border-sky-800/70 bg-white dark:bg-slate-900 hover:bg-[#2c5282] dark:hover:bg-sky-700 hover:text-white transition-colors duration-150 whitespace-nowrap"
                            onClick={() => handleRestore(item)}
                            disabled={isRestoring || isDeleting}
                            title={t('trash.restoreTitle')}
                          >
                            <RotateCcw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
                            <span className="text-sm font-semibold">{t('trash.restore')}</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-10 min-h-[40px] px-3.5 gap-1.5 rounded-lg text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/70 bg-white dark:bg-slate-900 hover:bg-rose-600 dark:hover:bg-rose-700 hover:text-white transition-colors duration-150 whitespace-nowrap"
                            onClick={() =>
                              setItemToDelete({
                                id: item._id,
                                type: item.type,
                                label: item.subject || item.label,
                              })
                            }
                            disabled={isRestoring || isDeleting}
                            title={t('trash.permanentDelete')}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-sm font-semibold">{t('trash.permanentDelete')}</span>
                          </Button>
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

      {/* Confirmation Dialog for Permanent Delete */}
      <AlertDialog
        open={Boolean(itemToDelete)}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent dir={dir} className="text-start rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg">
          <AlertDialogHeader className="text-start sm:text-start">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-200/70 dark:border-rose-900/60">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {t('trash.confirmDeleteTitle')}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              {t('trash.confirmDeleteDesc')}{' '}
              <strong className="text-slate-900 dark:text-slate-100 font-bold">"{itemToDelete?.label}"</strong>{' '}
              {t('trash.confirmDeleteDescSuffix')}
              <br />
              <span className="text-rose-600 dark:text-rose-400 font-medium mt-1 block">
                {t('trash.confirmDeleteWarning')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse justify-start gap-2 mt-4 sm:justify-start">
            <AlertDialogAction
              className="h-11 min-h-[44px] px-5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium"
              onClick={handleConfirmPermanentDelete}
              disabled={permanentDeleteMutation.isPending}
            >
              {permanentDeleteMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('trash.deleting')}</span>
                </div>
              ) : (
                <span>{t('trash.permanentDelete')}</span>
              )}
            </AlertDialogAction>
            <AlertDialogCancel
              className="h-11 min-h-[44px] px-4 rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              disabled={permanentDeleteMutation.isPending}
            >
              {t('trash.cancel')}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Empty Trash */}
      <AlertDialog
        open={isEmptyTrashOpen}
        onOpenChange={setIsEmptyTrashOpen}
      >
        <AlertDialogContent dir={dir} className="text-start rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg">
          <AlertDialogHeader className="text-start sm:text-start">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-200/70 dark:border-rose-900/60">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {t('trash.confirmEmptyTitle')}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              {t('trash.confirmEmptyDesc')}
              <br />
              <span className="text-rose-600 dark:text-rose-400 font-bold mt-1 block">
                {t('trash.confirmEmptyWarning')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse justify-start gap-2 mt-4 sm:justify-start">
            <AlertDialogAction
              className="h-11 min-h-[44px] px-5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
              onClick={() => emptyTrashMutation.mutate()}
              disabled={emptyTrashMutation.isPending}
            >
              {emptyTrashMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('trash.emptying')}</span>
                </div>
              ) : (
                <span>{t('trash.confirmEmptyAction')}</span>
              )}
            </AlertDialogAction>
            <AlertDialogCancel
              className="h-11 min-h-[44px] px-4 rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              disabled={emptyTrashMutation.isPending}
            >
              {t('trash.back')}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
};

export default TrashPage;
