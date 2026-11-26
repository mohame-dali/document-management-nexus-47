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

const TrashPage: React.FC = () => {
  const queryClient = useQueryClient();
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
      toast.success('تمت استعادة العنصر بنجاح');
      invalidateQueries();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const message = e?.response?.data?.message || e?.message || 'حدث خطأ أثناء استعادة العنصر';
      toast.error(message);
    },
  });

  // Permanent delete mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: ({ type, id }: { type: TrashItemType; id: string }) => permanentDeleteItem(type, id),
    onSuccess: () => {
      toast.success('تم الحذف النهائي للعنصر بنجاح');
      setItemToDelete(null);
      invalidateQueries();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const message = e?.response?.data?.message || e?.message || 'حدث خطأ أثناء الحذف النهائي';
      toast.error(message);
    },
  });

  // Empty trash mutation
  const emptyTrashMutation = useMutation({
    mutationFn: () => emptyTrash(filterType),
    onSuccess: () => {
      toast.success('تم إفراغ سلة المحذوفات بنجاح');
      setIsEmptyTrashOpen(false);
      invalidateQueries();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const message = e?.response?.data?.message || e?.message || 'حدث خطأ أثناء إفراغ السلة';
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
          <Badge className="rounded-full bg-[#2c5282]/10 dark:bg-sky-950/60 text-[#2c5282] dark:text-sky-300 hover:bg-[#2c5282]/15 dark:hover:bg-sky-950/80 border border-[#2c5282]/30 dark:border-sky-800/70 gap-1.5 py-1 px-3 font-medium text-xs">
            <FileInput className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
            <span>بريد وارد</span>
          </Badge>
        );
      case 'outgoing':
      case 'OutgoingDocument':
        return (
          <Badge className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 border border-emerald-300/80 dark:border-emerald-800/70 gap-1.5 py-1 px-3 font-medium text-xs">
            <FileOutput className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>بريد صادر</span>
          </Badge>
        );
      case 'folder':
      case 'Folder':
        return (
          <Badge className="rounded-full bg-[#FFCB56]/20 dark:bg-amber-950/50 text-[#744210] dark:text-amber-300 hover:bg-[#FFCB56]/30 dark:hover:bg-amber-950/70 border border-[#d69e2e]/40 dark:border-amber-800/70 gap-1.5 py-1 px-3 font-medium text-xs">
            <Folder className="h-3.5 w-3.5 text-[#b7791f] dark:text-amber-400" />
            <span>مجلد</span>
          </Badge>
        );
      case 'message':
      case 'Message':
        return (
          <Badge className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/70 gap-1.5 py-1 px-3 font-medium text-xs">
            <MessageCircle className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>رسالة</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="rounded-full text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 text-xs px-3 py-1">
            {type}
          </Badge>
        );
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#e53e3e]/10 dark:bg-red-950/50 text-[#e53e3e] dark:text-red-400 border border-[#e53e3e]/20 dark:border-red-900/60 rounded-lg">
            <Trash2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1a202c] dark:text-slate-100">سلة المحذوفات</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              إدارة العناصر المحذوفة واستعادتها أو حذفها نهائياً من النظام
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-[44px] px-4 gap-2 rounded-lg text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>

          <Button
            type="button"
            variant="destructive"
            className="h-11 min-h-[44px] px-5 gap-2 rounded-lg bg-[#e53e3e] hover:bg-[#c53030] text-white font-medium shadow-sm"
            onClick={() => setIsEmptyTrashOpen(true)}
            disabled={items.length === 0 || isLoading || emptyTrashMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
            <span>إفراغ السلة</span>
          </Button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Type Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={filterType === 'all' ? 'default' : 'outline'}
            className={`h-11 min-h-[44px] px-4 rounded-lg text-sm font-medium gap-2 ${
              filterType === 'all'
                ? 'bg-[#2c5282] hover:bg-[#2a4365] text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            onClick={() => setFilterType('all')}
          >
            <span>الكل</span>
            {counts.total > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                filterType === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}>
                {counts.total}
              </span>
            )}
          </Button>

          <Button
            type="button"
            variant={filterType === 'incoming' ? 'default' : 'outline'}
            className={`h-11 min-h-[44px] px-4 rounded-lg text-sm font-medium gap-2 ${
              filterType === 'incoming'
                ? 'bg-[#2c5282] hover:bg-[#2a4365] text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            onClick={() => setFilterType('incoming')}
          >
            <FileInput className="h-4 w-4" />
            <span>البريد الوارد</span>
            {counts.incoming > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                filterType === 'incoming' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}>
                {counts.incoming}
              </span>
            )}
          </Button>

          <Button
            type="button"
            variant={filterType === 'outgoing' ? 'default' : 'outline'}
            className={`h-11 min-h-[44px] px-4 rounded-lg text-sm font-medium gap-2 ${
              filterType === 'outgoing'
                ? 'bg-[#2c5282] hover:bg-[#2a4365] text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            onClick={() => setFilterType('outgoing')}
          >
            <FileOutput className="h-4 w-4" />
            <span>البريد الصادر</span>
            {counts.outgoing > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                filterType === 'outgoing' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}>
                {counts.outgoing}
              </span>
            )}
          </Button>

          <Button
            type="button"
            variant={filterType === 'folder' ? 'default' : 'outline'}
            className={`h-11 min-h-[44px] px-4 rounded-lg text-sm font-medium gap-2 ${
              filterType === 'folder'
                ? 'bg-[#2c5282] hover:bg-[#2a4365] text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            onClick={() => setFilterType('folder')}
          >
            <Folder className="h-4 w-4" />
            <span>المجلدات</span>
            {counts.folder > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                filterType === 'folder' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}>
                {counts.folder}
              </span>
            )}
          </Button>

          <Button
            type="button"
            variant={filterType === 'message' ? 'default' : 'outline'}
            className={`h-11 min-h-[44px] px-4 rounded-lg text-sm font-medium gap-2 ${
              filterType === 'message'
                ? 'bg-[#2c5282] hover:bg-[#2a4365] text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            onClick={() => setFilterType('message')}
          >
            <MessageCircle className={`h-4 w-4 ${filterType === 'message' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
            <span>الرسائل</span>
            {counts.message > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                filterType === 'message' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}>
                {counts.message}
              </span>
            )}
          </Button>
        </div>

        {/* Local Search input */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <Input
            type="text"
            placeholder="بحث في العناصر المحذوفة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 min-h-[44px] pr-9 pl-4 rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus-visible:ring-1 focus-visible:ring-[#2c5282]"
          />
        </div>
      </div>

      {/* Main Table / Content Area */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#2c5282] dark:text-sky-400 mx-auto" />
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">جاري تحميل عناصر سلة المحذوفات...</p>
          </div>
        ) : isError ? (
          <div className="p-16 text-center space-y-4">
            <div className="p-3 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 rounded-full w-fit mx-auto">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">تعذر تحميل سلة المحذوفات</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {(error as Error)?.message || 'حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.'}
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-[44px] px-4 rounded-lg text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700"
              onClick={() => refetch()}
            >
              إعادة المحاولة
            </Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">السلة فارغة</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              {searchQuery.trim()
                ? 'لا توجد نتائج تطابق معايير البحث الحالية.'
                : 'لا توجد عناصر محذوفة حالياً.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold">
                  <th className="py-3 px-4 sm:px-6 text-right w-36 font-bold text-sm">النوع</th>
                  <th className="py-3 px-4 sm:px-6 text-right font-bold text-sm">الاسم / الموضوع</th>
                  <th className="py-3 px-4 sm:px-6 text-right w-52 font-bold text-sm">تاريخ الحذف</th>
                  <th className="py-3 px-4 sm:px-6 text-right w-48 font-bold text-sm">تم الحذف بواسطة</th>
                  <th className="py-3 px-4 sm:px-6 text-center w-56 font-bold text-sm">الإجراءات</th>
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
                              {item.subject || item.label || 'بدون موضوع'}
                            </p>
                            {item.content && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {item.content}
                              </p>
                            )}
                            {item.attachments && item.attachments.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                                <span>📎</span>
                                <span>{item.attachments.length} مرفق</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                              {item.label}
                            </p>
                            {item.documentId && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                                رقم المرجع: {item.documentId}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Column 3: Deletion Date */}
                      <td className="py-3 px-4 sm:px-6 align-middle text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                        <bdi dir="rtl" className="tabular-nums">{formatDateTime(item.deletedAt, 'ar')}</bdi>
                      </td>

                      {/* Column 4: Deleted By / Sender & Recipients */}
                      <td className="py-3 px-4 sm:px-6 align-middle text-sm text-slate-700 dark:text-slate-200">
                        {isMessage ? (
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-medium">
                              <span className="text-slate-400 dark:text-slate-500">من:</span>
                              <span className="truncate max-w-[140px]">{item.sender?.username || '—'}</span>
                            </div>
                            {item.recipients && item.recipients.length > 0 && (
                              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <span className="text-slate-400 dark:text-slate-500">إلى:</span>
                                <span className="truncate max-w-[140px]">
                                  {item.recipients
                                    .map((r: { user?: { username?: string }; username?: string }) => r.user?.username || r.username || 'مستخدم')
                                    .join('، ')}
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
                            className="h-11 min-h-[44px] px-3.5 gap-1.5 rounded-lg text-[#2c5282] dark:text-sky-300 border-[#2c5282]/30 dark:border-sky-800/70 bg-white dark:bg-slate-900 hover:bg-[#2c5282] dark:hover:bg-sky-700 hover:text-white transition-colors duration-150"
                            onClick={() => handleRestore(item)}
                            disabled={isRestoring || isDeleting}
                            title="استعادة العنصر"
                          >
                            <RotateCcw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
                            <span className="text-sm font-semibold">استعادة</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-11 min-h-[44px] px-3.5 gap-1.5 rounded-lg text-[#e53e3e] dark:text-red-400 border-[#e53e3e]/30 dark:border-red-900/70 bg-white dark:bg-slate-900 hover:bg-[#e53e3e] dark:hover:bg-red-700 hover:text-white transition-colors duration-150"
                            onClick={() =>
                              setItemToDelete({
                                id: item._id,
                                type: item.type,
                                label: item.subject || item.label,
                              })
                            }
                            disabled={isRestoring || isDeleting}
                            title="حذف نهائي"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-sm font-semibold">حذف نهائي</span>
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
        <AlertDialogContent className="text-right rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg">
          <AlertDialogHeader className="text-right sm:text-right">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-lg border border-red-200/70 dark:border-red-900/60">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                تأكيد الحذف النهائي
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              هل أنت متأكد من رغبتك في حذف{' '}
              <strong className="text-slate-900 dark:text-slate-100 font-bold">"{itemToDelete?.label}"</strong> بشكل نهائي؟
              <br />
              <span className="text-red-600 dark:text-red-400 font-medium mt-1 block">
                تحذير: هذا الإجراء لا يمكن التراجع عنه نهائياً وسيتم إزالة كافة الملفات المرتبطة به من القرص.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse justify-start gap-2 mt-4 sm:justify-start">
            <AlertDialogAction
              className="h-11 min-h-[44px] px-5 rounded-lg bg-[#e53e3e] hover:bg-[#c53030] text-white font-medium"
              onClick={handleConfirmPermanentDelete}
              disabled={permanentDeleteMutation.isPending}
            >
              {permanentDeleteMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري الحذف...</span>
                </div>
              ) : (
                <span>حذف نهائي</span>
              )}
            </AlertDialogAction>
            <AlertDialogCancel
              className="h-11 min-h-[44px] px-4 rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              disabled={permanentDeleteMutation.isPending}
            >
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Empty Trash */}
      <AlertDialog
        open={isEmptyTrashOpen}
        onOpenChange={setIsEmptyTrashOpen}
      >
        <AlertDialogContent className="text-right rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg">
          <AlertDialogHeader className="text-right sm:text-right">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-lg border border-red-200/70 dark:border-red-900/60">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                تأكيد إفراغ سلة المحذوفات
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              تحذير شديد: سيتم حذف جميع العناصر الموجودة في سلة المحذوفات نهائياً مع كافة المرفقات والملفات من الخادم.
              <br />
              <span className="text-red-600 dark:text-red-400 font-bold mt-1 block">
                لا يمكن استرجاع أي من هذه العناصر أو التراجع عن هذه العملية بأي شكل!
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse justify-start gap-2 mt-4 sm:justify-start">
            <AlertDialogAction
              className="h-11 min-h-[44px] px-5 rounded-lg bg-[#e53e3e] hover:bg-[#c53030] text-white font-bold"
              onClick={() => emptyTrashMutation.mutate()}
              disabled={emptyTrashMutation.isPending}
            >
              {emptyTrashMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري الإفراغ...</span>
                </div>
              ) : (
                <span>نعم، إفراغ السلة الآن</span>
              )}
            </AlertDialogAction>
            <AlertDialogCancel
              className="h-11 min-h-[44px] px-4 rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              disabled={emptyTrashMutation.isPending}
            >
              تراجع
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TrashPage;
