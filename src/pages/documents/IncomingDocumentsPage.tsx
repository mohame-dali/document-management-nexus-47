import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  PlusCircle, 
  LayoutGrid, 
  LayoutList, 
  Search, 
  Calendar, 
  FileText, 
  FileInput,
  Clock, 
  Users, 
  Loader2,
  Eye,
  MessageSquare,
  FolderOpen,
  UserPlus,
  MoreHorizontal,
  Download,
  Edit,
  Trash2,
  RotateCcw,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building2,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ShieldAlert,
  Inbox,
  Bookmark
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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

import { getDepartments } from '@/services/departmentService';
import { getDocumentOptions } from '@/services/documentOptionsService';
import { deleteIncomingDocument, downloadDocument, getIncomingDocuments } from '@/services/documentService';
import { getOrganizationSettings } from '@/services/organizationSettingsService';
import { useAuth } from '@/contexts/AuthContext';
import { IncomingDocument, Department } from '@/types';
import { useYearPersistence } from '@/hooks/useYearPersistence';
import { formatLongDate } from '@/utils/formatDate';
import { getActivityUrgency, getDocumentPriority } from '@/utils/activityUtils';
import { extractDeptMeta, isBureauOrdreUserAccount } from '@/utils/departmentScope';
import DocumentFolderDialog from '@/components/documents/DocumentFolderDialog';
import AssignResponseDialog from '@/components/documents/AssignResponseDialog';
import AssignResponsibleDialog from '@/components/documents/AssignResponsibleDialog';
import DocumentPreviewModal from '@/components/documents/DocumentPreviewModal';
import CopyReferenceButton from '@/components/documents/CopyReferenceButton';
import ScrollToTop from '@/components/common/ScrollToTop';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { usePdfExport } from '@/hooks/usePdfExport';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import PageBreadcrumb from '@/components/common/PageBreadcrumb';
import { exportToCsv } from '@/utils/exportCsv';

const isAnswerDeleted = (doc: IncomingDocument) =>
  typeof doc.answer === 'object' && doc.answer !== null && Boolean(doc.answer.isDeleted);

const hasActiveAnswer = (doc: IncomingDocument) =>
  Boolean(doc.answer) && !isAnswerDeleted(doc);

const IncomingDocumentsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language === 'fr';
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isExporting, exportPdf } = usePdfExport();

  // Filters & UI State with persistence
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query by 300ms and reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [viewMode, setViewMode] = useLocalStorageState<'table' | 'grid'>('incomingDocs_viewMode', 'table');
  const [selectedDepartment, setSelectedDepartment] = useLocalStorageState<string>('incomingDocs_selectedDepartment', 'all');
  const [selectedSource, setSelectedSource] = useLocalStorageState<string>('incomingDocs_selectedSource', 'all_sources');
  const [statusFilter, setStatusFilter] = useLocalStorageState<string>('incomingDocs_statusFilter', 'all');
  const [searchParams] = useSearchParams();
  const statusQueryParam = searchParams.get('status');

  useEffect(() => {
    if (
      statusQueryParam &&
      ['all', 'pending', 'answered', 'urgent'].includes(statusQueryParam)
    ) {
      setStatusFilter(statusQueryParam);
      setCurrentPage(1);
    }
  }, [statusQueryParam, setStatusFilter]);
  const [sortBy, setSortBy] = useLocalStorageState<string>('incomingDocs_sortBy', 'newest-arrival');
  const [sortField, setSortField] = useLocalStorageState<string>('incomingDocs_sortField', 'arrivalDate');
  const [sortDirection, setSortDirection] = useLocalStorageState<'asc' | 'desc'>('incomingDocs_sortDirection', 'desc');

  const handleTableSort = (field: string) => {
    const nextDirection: 'asc' | 'desc' =
      sortField === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortField(field);
    setSortDirection(nextDirection);
    if (field === 'serialNumber') {
      setSortBy(nextDirection === 'asc' ? 'serial-asc' : 'serial-desc');
    } else if (field === 'arrivalDate') {
      setSortBy(nextDirection === 'asc' ? 'oldest-arrival' : 'newest-arrival');
    }
    setCurrentPage(1);
  };
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Dialogs State
  const [folderDoc, setFolderDoc] = useState<IncomingDocument | null>(null);
  const [responseDoc, setResponseDoc] = useState<IncomingDocument | null>(null);
  const [responsibleDoc, setResponsibleDoc] = useState<IncomingDocument | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<IncomingDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<IncomingDocument | null>(null);

  // Year persistence hook
  const { selectedYear, setSelectedYear, isValidYear } = useYearPersistence('incomingDocumentsSelectedYear');

  // Local state for year input to allow smooth 4-digit typing without premature validation or unmounting
  const [yearInput, setYearInput] = useState<string>(selectedYear);

  // Synchronize yearInput whenever selectedYear updates from storage or external events
  useEffect(() => {
    setYearInput(selectedYear);
  }, [selectedYear]);

  // Safe year input handler: allows typing freely up to 4 digits without premature view switching
  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d{1,4}$/.test(val)) {
      setYearInput(val);
      if (val.length === 4 && /^\d{4}$/.test(val)) {
        setSelectedYear(val);
        setCurrentPage(1);
      }
    }
  };

  const handleApplyYear = (targetYear?: string) => {
    const val = targetYear ?? yearInput;
    if (val.length === 4 && /^\d{4}$/.test(val)) {
      setSelectedYear(val);
      setCurrentPage(1);
    } else {
      setYearInput(selectedYear);
    }
  };

  // Role permissions
  const isDirector = currentUser?.role === 'Director';
  const isAdmin = currentUser?.role === 'Admin';
  const isAdminTuningDesk = currentUser?.role === 'AdminTuningDesk';
  const isAdminDepartment = currentUser?.role === 'AdminDepartment';

  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: 5 * 60 * 1000,
  });

  const bureauOrdreDeptId = extractDeptMeta(orgSettings?.bureauOrdreDepartmentId).id;
  const isBureauOrdreUser = isBureauOrdreUserAccount(currentUser, bureauOrdreDeptId);

  const canAddDocuments = isAdmin || isAdminTuningDesk;
  const canEdit = isAdmin || isAdminTuningDesk;
  const canDelete = isAdmin || isAdminTuningDesk;
  const canOrganizeDocuments = isAdminDepartment && !isBureauOrdreUser;
  const canViewCategorization = isAdmin || isDirector || isAdminTuningDesk || isAdminDepartment || currentUser?.role === 'User';
  const canAssignOrRespond = isAdminDepartment || isAdmin || isAdminTuningDesk;
  const canAssignResponsible = (isAdminDepartment || isAdmin) && !isBureauOrdreUser;

  // Fetch departments for AdminTuningDesk filtering and document assignment
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

  // Fetch source options for source filtering
  const { data: sourceOptions = [] } = useQuery({
    queryKey: ['documentOptions', 'source', 'incoming'],
    queryFn: () => getDocumentOptions({ category: 'source', documentType: 'incoming' }),
    enabled: true,
  });

  // Server-paginated, server-filtered & server-sorted documents query
  const {
    data: docsResponse,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      'incomingDocuments',
      selectedYear,
      selectedDepartment,
      selectedSource,
      statusFilter,
      sortBy,
      sortField,
      sortDirection,
      currentPage,
      pageSize,
      debouncedSearch,
    ],
    queryFn: () => getIncomingDocuments({
      year: selectedYear,
      department: selectedDepartment === 'all' ? undefined : selectedDepartment,
      source: selectedSource === 'all_sources' ? undefined : selectedSource,
      status: statusFilter === 'all' ? undefined : statusFilter,
      urgency: statusFilter === 'urgent' ? 'true' : undefined,
      sortBy,
      sortField,
      sortDirection,
      page: currentPage,
      limit: pageSize,
      q: debouncedSearch,
    }),
    enabled: isValidYear,
  });

  const documents = useMemo(() => docsResponse?.data || [], [docsResponse]);
  const totalCount = docsResponse?.totalCount || 0;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteIncomingDocument(id);
    },
    onSuccess: () => {
      toast.success(t('incoming.toasts.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
      setDeleteDoc(null);
    },
    onError: (err: unknown) => {
      console.error('Error deleting document:', err);
      toast.error(t('incoming.toasts.deleteError'));
    },
  });

  // Documents are already filtered, sorted and paginated server-side across all pages
  const filteredDocuments = documents as IncomingDocument[];
  const sortedDocuments = filteredDocuments;

  // Pagination calculation
  const totalFiltered = totalCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const clampedPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (clampedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + sortedDocuments.length, totalCount);
  const paginatedDocuments = sortedDocuments;

  // Reset pagination on filter change
  const handleFilterReset = () => {
    setSearchQuery('');
    setSelectedDepartment('all');
    setSelectedSource('all_sources');
    setStatusFilter('all');
    setSortBy('newest-arrival');
    setSortField('arrivalDate');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedDepartment !== 'all' ||
    selectedSource !== 'all_sources' ||
    statusFilter !== 'all' ||
    sortBy !== 'newest-arrival'
  );

  // Document actions handlers
  const handleView = (id: string) => {
    navigate(`/dashboard/incoming-documents/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/dashboard/incoming-documents/${id}/edit`);
  };

  const handleExportPdf = async () => {
    if (sortedDocuments.length === 0) {
      toast.info(t('incoming.toasts.noDocsToExport'));
      return;
    }

    const rows = sortedDocuments.map((doc: IncomingDocument) => ({
      serialNumber: doc.serialNumber || '',
      arrivalDate: formatLongDate(doc.arrivalDate, isFr ? 'fr' : 'ar'),
      subject: doc.subject || '',
      source: doc.source || t('incoming.source.unspecified'),
      typeDocument: doc.typeDocument || t('incoming.type.general'),
      status: isAnswerDeleted(doc)
        ? t('incoming.status.answerInTrash')
        : hasActiveAnswer(doc)
          ? t('incoming.status.answered')
          : t('incoming.status.pending'),
    }));

    await exportPdf({
      title: t('incoming.exportPdf.title'),
      subtitle: t('incoming.exportPdf.subtitle', { year: selectedYear, count: rows.length }),
      columns: [
        { header: t('incoming.exportPdf.colSerial'), dataKey: 'serialNumber', align: 'center', width: 28 },
        { header: t('incoming.exportPdf.colArrivalDate'), dataKey: 'arrivalDate', align: 'center', width: 32 },
        { header: t('incoming.exportPdf.colSubject'), dataKey: 'subject', align: 'right' },
        { header: t('incoming.exportPdf.colSource'), dataKey: 'source', align: 'right', width: 40 },
        { header: t('incoming.exportPdf.colType'), dataKey: 'typeDocument', align: 'center', width: 28 },
        { header: t('incoming.exportPdf.colStatus'), dataKey: 'status', align: 'center', width: 30 },
      ],
      rows,
      fileName: t('incoming.exportPdf.fileName', { year: selectedYear }),
      orientation: 'landscape',
      footerText: t('incoming.exportPdf.footer'),
    });
  };

  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const handleDownload = async (doc: IncomingDocument) => {
    if (doc.scannedDocument) {
      try {
        setDownloadingDocId(doc._id);
        toast.info(t('incoming.toasts.downloadStarting'));
        await downloadDocument(doc.scannedDocument, `incoming-doc-${doc.serialNumber}-${doc.year}.pdf`);
        toast.success(t('incoming.toasts.downloadSuccess'));
      } catch (error) {
        console.error('Error downloading document:', error);
        toast.error(t('incoming.toasts.downloadError'));
      } finally {
        setDownloadingDocId(null);
      }
    } else {
      toast.info(t('incoming.toasts.noScannedDoc'));
    }
  };

  // Status stats & KPI summary computed from existing loaded mail data
  const kpiStats = useMemo(() => {
    const pending = documents.filter((d: IncomingDocument) => !hasActiveAnswer(d)).length;
    const overdue = documents.filter(
      (d: IncomingDocument) => !hasActiveAnswer(d) && getActivityUrgency(d)?.type === 'overdue'
    ).length;
    const answeredOrArchived = documents.filter(
      (d: IncomingDocument) => hasActiveAnswer(d) || Boolean(d.folder)
    ).length;

    return {
      total: totalCount,
      pending,
      overdue,
      answeredOrArchived,
    };
  }, [documents, totalCount]);

  // Search match highlight
  const highlightMatch = (text: string, query: string) => {
    if (!query || !query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-[#FFCB56] text-[#1a202c] px-1 py-0.5 rounded font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Incomplete year view
  if (!isValidYear) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-slate-950 p-6 sm:p-8">
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center mx-auto">
            <Calendar className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#1a202c] dark:text-slate-100">{t('incoming.yearModal.title')}</h2>
          <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
            {t('incoming.yearModal.description', { year: new Date().getFullYear() })}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleApplyYear();
            }}
            className="pt-2 flex flex-col items-center space-y-4"
          >
            <div className="relative">
              <Calendar className="absolute start-3.5 top-1/2 transform -translate-y-1/2 text-slate-700 dark:text-slate-300 h-4 w-4 pointer-events-none" />
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={new Date().getFullYear().toString()}
                value={yearInput}
                onChange={handleYearInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyYear();
                  }
                }}
                onBlur={() => {
                  if (yearInput.length === 4 && /^\d{4}$/.test(yearInput)) {
                    handleApplyYear();
                  } else {
                    setYearInput(selectedYear);
                  }
                }}
                maxLength={4}
                autoFocus
                className="w-40 h-12 ps-10 text-center text-lg font-bold tabular-nums border-slate-300 dark:border-slate-700 rounded-lg focus:border-[#2c5282] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
            {yearInput.length > 0 && yearInput.length < 4 && (
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {t('incoming.yearModal.incomplete')}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={yearInput.length !== 4 || !/^\d{4}$/.test(yearInput)}
                className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-200"
              >
                {t('incoming.yearModal.confirmButton')}
              </Button>
            </div>
            {/* Quick Year Shortcuts */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('incoming.yearModal.quickYears')}</span>
              {[
                new Date().getFullYear(),
                new Date().getFullYear() - 1,
                new Date().getFullYear() - 2,
              ].map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    const yrStr = yr.toString();
                    setYearInput(yrStr);
                    setSelectedYear(yrStr);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-[#2c5282] dark:hover:text-blue-300 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <bdi dir="ltr">{yr}</bdi>
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Loading view
  if (isLoading && isValidYear) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-slate-950 p-3 sm:p-4 lg:p-5 space-y-4">
        <Skeleton className="h-5 w-52 rounded-md" />
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <TableSkeleton columns={6} rows={8} />
        </div>
      </div>
    );
  }

  // Error view
  if (isError && isValidYear) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-slate-950 p-6 sm:p-8">
        <div className="max-w-xl mx-auto">
          <EmptyState
            icon={<AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />}
            title={t('incoming.error.title')}
            description={t('incoming.error.description')}
            className="rounded-xl border-red-200/80 dark:border-red-900/60 shadow-xs py-12"
            action={
              <Button
                type="button"
                onClick={() => refetch()}
                className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg inline-flex items-center gap-2 transition-colors duration-200"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{t('incoming.error.retry')}</span>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-slate-950 p-2 sm:p-4 lg:p-5 space-y-4">
      {/* Breadcrumb */}
      <PageBreadcrumb
        showHomeIcon
        homeTo="/dashboard"
        homeLabel={t('common.home')}
        items={[
          { label: t('documents.viewIncoming.breadcrumb.mailHub'), to: '/dashboard/mail/incoming' },
          { label: t('incoming.page.breadcrumb') },
        ]}
      />

      {/* 1. Page Header (En-tête) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-lg bg-[#2c5282] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <FileInput className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2c5282] dark:text-blue-300 leading-normal flex items-center gap-2.5">
              {t('incoming.page.title')}
            </h1>
            <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed mt-1">
              {t('incoming.page.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Institutional Stats Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold bg-[#FFCB56] text-[#1a202c] border border-[#e5b23e] tabular-nums shadow-xs"
              title={t('incoming.stats.totalDocsTooltip')}
            >
              <Inbox className="h-4 w-4" />
              {t('incoming.stats.totalDocs', { count: totalCount })}
            </span>

            {isDirector && (
              <span 
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold bg-[#FFD758] text-[#1a202c] border border-[#e5b836] shadow-xs"
                title={t('incoming.stats.allDepartmentsTooltip')}
              >
                <Building2 className="h-4 w-4 text-[#1a202c]" />
                {t('incoming.stats.allDepartments')}
              </span>
            )}

            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-slate-100/90 dark:bg-slate-800 text-[#1a202c] dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 tabular-nums"
              title={t('incoming.stats.activeYearTooltip')}
            >
              <Calendar className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
              {t('incoming.stats.activeYear', { year: selectedYear })}
            </span>
          </div>

          {/* Export PDF Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleExportPdf}
            disabled={isExporting || sortedDocuments.length === 0}
            className="h-11 px-4 text-base font-semibold border-slate-300 dark:border-slate-700 text-[#2c5282] dark:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200 flex items-center gap-2 print:hidden"
            title={t('incoming.actions.exportPdfTooltip')}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{t('incoming.actions.exportPdf')}</span>
          </Button>

          {/* Export Excel Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => exportToCsv('courriers-entrants.csv', documents as unknown as Record<string, unknown>[])}
            disabled={documents.length === 0}
            className="h-11 px-4 text-base font-semibold border-slate-300 dark:border-slate-700 text-[#2c5282] dark:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200 flex items-center gap-2 print:hidden"
            title="تصدير Excel"
          >
            <Download className="h-4 w-4" />
            <span>تصدير Excel</span>
          </Button>

          {/* Refresh Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-11 px-4 text-base font-semibold border-slate-300 dark:border-slate-700 text-[#2c5282] dark:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200 flex items-center gap-2 print:hidden"
            title={t('common.refresh')}
          >
            <RotateCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{t('common.refresh')}</span>
          </Button>

          {/* Add Document Action Button */}
          {canAddDocuments && (
            <Button
              onClick={() => navigate('/dashboard/incoming-documents/create')}
              className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg shadow-sm transition-colors duration-200 flex items-center gap-2 print:hidden"
            >
              <PlusCircle className="h-5 w-5" />
              <span>{t('incoming.actions.add')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 1b. Compact 4-Card KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-[#2c5282] dark:border-t-blue-500 rounded-lg px-4 py-3 shadow-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
              {isFr ? 'Total entrants' : 'إجمالي الوارد'}
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
              {kpiStats.total}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center shrink-0">
            <Inbox className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-amber-500 rounded-lg px-4 py-3 shadow-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
              {isFr ? 'En attente de traitement' : 'بانتظار المعالجة'}
            </p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300 tabular-nums mt-0.5">
              {kpiStats.pending}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200/70 dark:border-amber-800/60 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-red-500 rounded-lg px-4 py-3 shadow-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
              {isFr ? 'En retard' : 'متأخر'}
            </p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums mt-0.5">
              {kpiStats.overdue}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-red-50/90 dark:bg-red-950/50 border border-red-200/70 dark:border-red-800/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-emerald-500 rounded-lg px-4 py-3 shadow-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
              {isFr ? 'Répondu / Archivé' : 'تم الرد / مؤرشف'}
            </p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums mt-0.5">
              {kpiStats.answeredOrArchived}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2. Filters and Sorting Section (Filtres / Tri) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-4 sm:p-5 space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-slate-700 dark:text-slate-300 h-4 w-4 pointer-events-none" />
            <Input
              placeholder={t('incoming.filters.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 ps-10 text-base text-start border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200"
            />
          </div>

          {/* Year Filter */}
          <div>
            <div className="relative">
              <Calendar className="absolute start-3 top-1/2 transform -translate-y-1/2 text-slate-700 dark:text-slate-300 h-4 w-4 pointer-events-none" />
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={t('incoming.filters.yearPlaceholder')}
                value={yearInput}
                onChange={handleYearInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyYear();
                  }
                }}
                onBlur={() => {
                  if (yearInput.length === 4 && /^\d{4}$/.test(yearInput)) {
                    handleApplyYear();
                  } else {
                    setYearInput(selectedYear);
                  }
                }}
                maxLength={4}
                className="h-11 ps-10 text-base text-center font-bold tabular-nums border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200"
              />
            </div>
          </div>

          {/* Source Filter */}
          <div>
            <Select 
              value={selectedSource} 
              onValueChange={(val) => {
                setSelectedSource(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 text-base text-start border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                <SelectValue placeholder={t('incoming.filters.sourcePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_sources" className="text-base">{t('incoming.filters.allSources')}</SelectItem>
                {sourceOptions.filter(opt => opt.isActive).map((opt) => (
                  <SelectItem key={opt._id} value={opt.value} className="text-base">
                    {opt.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <Select 
              value={statusFilter} 
              onValueChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 text-base text-start border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                <SelectValue placeholder={t('incoming.filters.statusPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-base">{t('incoming.filters.allStatuses')}</SelectItem>
                <SelectItem value="pending" className="text-base">{t('incoming.filters.pending')}</SelectItem>
                <SelectItem value="answered" className="text-base">{t('incoming.filters.answered')}</SelectItem>
                <SelectItem value="urgent" className="text-base">{t('incoming.filters.urgent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Department Filter row (if AdminTuningDesk) + Sort and Reset Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-3 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Department Filter - AdminTuningDesk */}
            {currentUser?.role === 'AdminTuningDesk' && departments && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{t('incoming.filters.departmentLabel')}</span>
                <Select 
                  value={selectedDepartment} 
                  onValueChange={(val) => {
                    setSelectedDepartment(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 min-w-[180px] text-sm text-start border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    <SelectValue placeholder={t('incoming.filters.departmentPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-sm">{t('incoming.filters.allDepartments')}</SelectItem>
                    {departments
                      .filter((dept) => {
                        const rawName = dept.name || '';
                        const normalized = rawName
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[’']/g, "'")
                          .trim();
                        return !(
                          /\bbo\b/.test(normalized) ||
                          normalized.includes("bureau d'ordre") ||
                          normalized.includes('bureau ordre') ||
                          normalized.includes('bureau directeur') ||
                          normalized.includes('direction') ||
                          rawName.includes('مكتب الضبط') ||
                          rawName.includes('مكتب المدير')
                        );
                      })
                      .map((dept) => (
                        <SelectItem key={dept._id} value={dept._id} className="text-sm">
                          {dept.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
                <ArrowUpDown className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                {t('incoming.sort.label')}
              </span>
              <Select
                value={sortBy}
                onValueChange={(val) => {
                  setSortBy(val);
                  if (val === 'newest-arrival') {
                    setSortField('arrivalDate');
                    setSortDirection('desc');
                  } else if (val === 'oldest-arrival') {
                    setSortField('arrivalDate');
                    setSortDirection('asc');
                  } else if (val === 'serial-desc') {
                    setSortField('serialNumber');
                    setSortDirection('desc');
                  } else if (val === 'serial-asc') {
                    setSortField('serialNumber');
                    setSortDirection('asc');
                  }
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 min-w-[170px] text-sm text-start border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest-arrival" className="text-sm">{t('incoming.sort.newestArrival')}</SelectItem>
                  <SelectItem value="oldest-arrival" className="text-sm">{t('incoming.sort.oldestArrival')}</SelectItem>
                  <SelectItem value="serial-desc" className="text-sm">{t('incoming.sort.serialDesc')}</SelectItem>
                  <SelectItem value="serial-asc" className="text-sm">{t('incoming.sort.serialAsc')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFilterReset}
                className="h-11 px-4 text-sm font-semibold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] border border-[#e5b23e] rounded-lg flex items-center gap-1.5 transition-colors duration-200"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#1a202c]" />
                <span>{t('incoming.filters.reset')}</span>
              </Button>
            )}
          </div>

          {/* Right controls: View Toggle and Live Fetch indicator */}
          <div className="flex items-center gap-3">
            {isFetching && (
              <span className="text-xs text-[#2c5282] dark:text-blue-200 font-semibold flex items-center gap-1 bg-blue-50/90 dark:bg-blue-950/50 px-2.5 py-1 rounded-full border border-blue-200/80 dark:border-blue-800/70">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('incoming.filters.refreshingData')}
              </span>
            )}

            {/* View Mode Toggle */}
            <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-label={t('incoming.view.tableLabel')}
                className={`h-11 px-3.5 text-base flex items-center gap-1.5 transition-colors duration-200 ${
                  viewMode === 'table'
                    ? 'bg-[#2c5282] text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title={t('incoming.view.tableLabel')}
              >
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">{t('incoming.view.table')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label={t('incoming.view.cardsLabel')}
                className={`h-11 px-3.5 text-base flex items-center gap-1.5 border-s border-slate-300 dark:border-slate-700 transition-colors duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-[#2c5282] text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title={t('incoming.view.cardsLabel')}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">{t('incoming.view.cards')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Documents Content: Table or Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-6 sm:p-8 space-y-6">
        {totalFiltered === 0 ? (
          /* Empty State */
          <EmptyState
            icon={<FileText className="h-6 w-6 text-[#2c5282] dark:text-sky-400" />}
            title={t('incoming.empty.title')}
            description={
              hasActiveFilters
                ? t('incoming.empty.filtered')
                : t('incoming.empty.noDocsYear', { year: selectedYear })
            }
            className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl py-12"
            action={
              hasActiveFilters ? (
                <Button
                  type="button"
                  onClick={handleFilterReset}
                  className="h-11 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg inline-flex items-center gap-2 transition-colors duration-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{t('incoming.empty.showAllYear', { year: selectedYear })}</span>
                </Button>
              ) : canAddDocuments ? (
                <Button
                  type="button"
                  onClick={() => navigate('/dashboard/mail/incoming/create')}
                  className="h-11 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg inline-flex items-center gap-2 transition-colors duration-200"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>{t('incoming.actions.addShort')}</span>
                </Button>
              ) : undefined
            }
          />
        ) : viewMode === 'table' ? (
          /* TABULAR VIEW (AdminLTE style, 8h/day professional ergonomics) */
          <div className="overflow-x-auto custom-scrollbar border border-slate-200/80 dark:border-slate-800 rounded-lg">
            <table className="w-full text-start border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                  <th
                    className="p-0 font-bold text-sm whitespace-nowrap"
                    aria-sort={sortField === 'serialNumber' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      type="button"
                      onClick={() => handleTableSort('serialNumber')}
                      className="w-full min-h-[44px] py-3 px-4 flex items-center gap-1.5 font-bold text-sm text-start hover:bg-slate-100/80 dark:hover:bg-slate-700/60 select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282] focus-visible:ring-inset"
                    >
                      <span>{t('incoming.table.serialNumber')}</span>
                      {sortField === 'serialNumber' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />}
                      {sortField === 'serialNumber' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />}
                      {sortField !== 'serialNumber' && <ChevronsUpDown className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                    </button>
                  </th>
                  <th
                    className="p-0 font-bold text-sm"
                    aria-sort={sortField === 'subject' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      type="button"
                      onClick={() => handleTableSort('subject')}
                      className="w-full min-h-[44px] py-3 px-4 flex items-center gap-1.5 font-bold text-sm text-start hover:bg-slate-100/80 dark:hover:bg-slate-700/60 select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282] focus-visible:ring-inset"
                    >
                      <span>{t('incoming.table.subjectAndType')}</span>
                      {sortField === 'subject' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />}
                      {sortField === 'subject' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />}
                      {sortField !== 'subject' && <ChevronsUpDown className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                    </button>
                  </th>
                  <th
                    className="p-0 font-bold text-sm whitespace-nowrap"
                    aria-sort={sortField === 'arrivalDate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      type="button"
                      onClick={() => handleTableSort('arrivalDate')}
                      className="w-full min-h-[44px] py-3 px-4 flex items-center gap-1.5 font-bold text-sm text-start hover:bg-slate-100/80 dark:hover:bg-slate-700/60 select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282] focus-visible:ring-inset"
                    >
                      <span>{t('incoming.table.arrivalDate')}</span>
                      {sortField === 'arrivalDate' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />}
                      {sortField === 'arrivalDate' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />}
                      {sortField !== 'arrivalDate' && <ChevronsUpDown className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                    </button>
                  </th>
                  <th className="py-3 px-4 font-bold text-sm text-start">{t('incoming.table.source')}</th>
                  <th
                    className="p-0 font-bold text-sm"
                    aria-sort={sortField === 'status' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      type="button"
                      onClick={() => handleTableSort('status')}
                      className="w-full min-h-[44px] py-3 px-4 flex items-center gap-1.5 font-bold text-sm text-start hover:bg-slate-100/80 dark:hover:bg-slate-700/60 select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282] focus-visible:ring-inset"
                    >
                      <span>{t('incoming.table.status')}</span>
                      {sortField === 'status' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />}
                      {sortField === 'status' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />}
                      {sortField !== 'status' && <ChevronsUpDown className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                    </button>
                  </th>
                  <th className="py-3 px-4 font-bold text-sm text-center">{t('incoming.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {paginatedDocuments.map((doc: IncomingDocument) => {
                  const urgency = getActivityUrgency(doc);
                  const priority = getDocumentPriority(doc, isFr);
                  const serialLabel = `#${doc.serialNumber} / ${doc.year}`;

                  return (
                    <tr 
                      key={doc._id}
                      className={`hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors duration-150 min-h-[64px] ${priority.rowAccentClasses}`}
                    >
                      {/* Serial Number & Year + External Correspondence Reference */}
                      <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                priority.level === 'very-urgent'
                                  ? 'bg-red-500'
                                  : priority.level === 'urgent'
                                    ? 'bg-amber-500'
                                    : 'bg-[#2c5282] dark:bg-blue-400'
                              }`}
                            />
                            <span className="font-mono text-sm font-bold text-[#1a202c] dark:text-slate-100 tabular-nums tracking-tight whitespace-nowrap">
                              <bdi dir="ltr">#{highlightMatch(String(doc.serialNumber), searchQuery)} / {doc.year}</bdi>
                            </span>
                            <CopyReferenceButton value={serialLabel} />
                          </div>
                          {doc.correspondenceNumber && (
                            <div className="flex items-center gap-1 ps-3.5 text-xs text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                              <span>
                                <bdi dir="ltr">{doc.correspondenceNumber}</bdi>
                              </span>
                              <CopyReferenceButton
                                value={doc.correspondenceNumber}
                                label={isFr ? 'Copier la référence externe' : 'نسخ رقم المراسلة'}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Subject, Document Type, Priority & Due-Date Cues */}
                      <td className="py-3 px-4">
                        <div className="max-w-[360px] space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleView(doc._id)}
                            className="text-start font-bold text-base text-[#1a202c] dark:text-slate-100 hover:text-[#2c5282] dark:hover:text-blue-300 cursor-pointer leading-relaxed transition-colors duration-200 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]"
                            title={doc.subject}
                          >
                            {highlightMatch(doc.subject, searchQuery)}
                          </button>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${priority.pillClasses}`}>
                              {priority.level !== 'normal' && <AlertTriangle className="h-3 w-3 shrink-0" />}
                              {priority.label}
                            </span>

                            {doc.typeDocument && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100/90 dark:bg-slate-800 text-[#2d3748] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                                {doc.typeDocument}
                              </span>
                            )}

                            {doc.activity && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/70">
                                <Bookmark className="h-3 w-3" />
                                {doc.activity}
                              </span>
                            )}

                            {(urgency || doc.dateActivity) && (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
                                  urgency
                                    ? urgency.badgeColor
                                    : 'bg-slate-100/90 text-slate-600 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}
                              >
                                <Clock className="h-3 w-3 shrink-0" />
                                {urgency ? urgency.label : null}
                                {doc.dateActivity && (
                                  <bdi dir={isFr ? 'ltr' : 'rtl'}>{formatLongDate(doc.dateActivity, isFr ? 'fr' : 'ar')}</bdi>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Arrival Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                          <bdi dir={isFr ? 'ltr' : 'rtl'}>{formatLongDate(doc.arrivalDate, isFr ? 'fr' : 'ar')}</bdi>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-sm font-normal text-[#2d3748] dark:text-slate-200">
                          <Building2 className="h-4 w-4 text-slate-700 dark:text-slate-300 flex-shrink-0" />
                          <span className="line-clamp-1" title={doc.source || t('incoming.source.unspecified')}>
                            {highlightMatch(doc.source || t('incoming.source.unspecified'), searchQuery)}
                          </span>
                        </div>
                      </td>

                      {/* Follow-up / Answer Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {isAnswerDeleted(doc) ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/70 w-fit">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              {t('incoming.status.answerInTrash')}
                            </span>
                          ) : doc.answer ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/70 w-fit">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              {t('incoming.status.answered')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/70 w-fit">
                              <Clock className="h-3.5 w-3.5 text-[#d69e2e] dark:text-amber-400" />
                              {t('incoming.status.pending')}
                            </span>
                          )}

                          {doc.responsibleUser && typeof doc.responsibleUser === 'object' && (
                            <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Users className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                              {t('incoming.responsible.label', { name: doc.responsibleUser.username })}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions: 2 primary actions + ... menu */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Primary 1: Voir */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(doc._id)}
                            title={t('incoming.actions.viewTooltip')}
                            className="h-8 px-2.5 text-xs font-semibold rounded-md text-[#2c5282] dark:text-blue-200 border-blue-200/80 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors duration-200 whitespace-nowrap shrink-0"
                          >
                            <Eye className="h-3.5 w-3.5 me-1 shrink-0" />
                            {t('incoming.actions.view')}
                          </Button>

                          {/* Primary 2: Traiter (if allowed) else Aperçu */}
                          {canAssignOrRespond ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setResponseDoc(doc)}
                              title={t('incoming.actions.processTooltip')}
                              className="h-8 px-2.5 text-xs font-bold rounded-md text-[#1a202c] dark:text-amber-200 border-[#FFD758] dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/50 hover:bg-[#FFCB56] dark:hover:bg-amber-900/70 transition-colors duration-200 whitespace-nowrap shrink-0"
                            >
                              <MessageSquare className="h-3.5 w-3.5 me-1 text-[#1a202c] dark:text-amber-300 shrink-0" />
                              {t('incoming.actions.process')}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewDoc(doc)}
                              title={t('incoming.actions.previewTooltip')}
                              className="h-8 px-2.5 text-xs font-semibold rounded-md text-amber-800 dark:text-amber-200 border-amber-300/80 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors duration-200 whitespace-nowrap shrink-0"
                            >
                              <FileText className="h-3.5 w-3.5 me-1 shrink-0" />
                              {t('incoming.actions.preview')}
                            </Button>
                          )}

                          {/* Secondary Actions Dropdown (...) */}
                          {(canAssignOrRespond || canViewCategorization || doc.scannedDocument || canEdit || canDelete) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  aria-label={t('incoming.actions.more')}
                                  className="h-8 w-8 p-0 text-slate-700 dark:text-slate-300 hover:text-[#1a202c] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md shrink-0"
                                  title={t('incoming.actions.more')}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm">
                                {canAssignOrRespond && (
                                  <DropdownMenuItem
                                    onClick={() => setPreviewDoc(doc)}
                                    className="text-sm py-2.5 cursor-pointer"
                                  >
                                    <FileText className="me-2 h-4 w-4 text-amber-700" />
                                    {t('incoming.actions.previewModal')}
                                  </DropdownMenuItem>
                                )}

                                {canViewCategorization && (
                                  <DropdownMenuItem
                                    onClick={() => setFolderDoc(doc)}
                                    className="text-sm py-2.5 cursor-pointer"
                                  >
                                    <FolderOpen className="me-2 h-4 w-4 text-slate-700 dark:text-slate-300" />
                                    {t('incoming.actions.archive')}
                                  </DropdownMenuItem>
                                )}

                                {canAssignResponsible && (
                                  <DropdownMenuItem
                                    onClick={() => setResponsibleDoc(doc)}
                                    className="text-sm py-2.5 cursor-pointer"
                                  >
                                    <UserPlus className="me-2 h-4 w-4 text-purple-700" />
                                    {t('incoming.actions.transfer')}
                                  </DropdownMenuItem>
                                )}

                                {doc.scannedDocument && (
                                  <DropdownMenuItem
                                    onClick={() => handleDownload(doc)}
                                    disabled={downloadingDocId === doc._id}
                                    className="text-sm py-2.5 cursor-pointer"
                                  >
                                    {downloadingDocId === doc._id ? (
                                      <Loader2 className="me-2 h-4 w-4 text-[#2c5282] animate-spin" />
                                    ) : (
                                      <Download className="me-2 h-4 w-4 text-[#2c5282]" />
                                    )}
                                    {downloadingDocId === doc._id ? t('incoming.actions.downloading') : t('incoming.actions.downloadPdf')}
                                  </DropdownMenuItem>
                                )}

                                {canEdit && (
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(doc._id)}
                                    className="text-sm py-2.5 cursor-pointer"
                                  >
                                    <Edit className="me-2 h-4 w-4 text-[#2c5282]" />
                                    {t('incoming.actions.editDoc')}
                                  </DropdownMenuItem>
                                )}

                                {canDelete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setDeleteDoc(doc)}
                                      className="text-sm py-2.5 text-red-600 focus:text-red-600 cursor-pointer"
                                    >
                                      <Trash2 className="me-2 h-4 w-4 text-red-600" />
                                      {t('incoming.actions.deleteDoc')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARD GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedDocuments.map((doc: IncomingDocument) => {
              const urgency = getActivityUrgency(doc);
              const priority = getDocumentPriority(doc, isFr);
              const serialLabel = `#${doc.serialNumber} / ${doc.year}`;

              return (
                <div
                  key={doc._id}
                  className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg p-5 space-y-4 shadow-sm transition-all duration-200 flex flex-col justify-between ${priority.cardAccentClasses}`}
                >
                  <div className="space-y-3">
                    {/* Card Top: Serial + Copy and Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/70 tabular-nums">
                          <bdi dir="ltr">{serialLabel}</bdi>
                        </span>
                        <CopyReferenceButton value={serialLabel} />
                      </div>

                      {isAnswerDeleted(doc) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/70">
                          <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          {t('incoming.status.answerInTrash')}
                        </span>
                      ) : doc.answer ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/70">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          {t('incoming.status.answeredBadge')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/70">
                          <Clock className="h-3 w-3 text-[#d69e2e] dark:text-amber-400" />
                          {t('incoming.status.pending')}
                        </span>
                      )}
                    </div>

                    {/* Subject */}
                    <h3 className="text-lg font-bold leading-relaxed">
                      <button
                        type="button"
                        onClick={() => handleView(doc._id)}
                        className="text-start font-bold text-[#1a202c] dark:text-slate-100 hover:text-[#2c5282] dark:hover:text-blue-300 cursor-pointer line-clamp-2 w-full rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]"
                        title={doc.subject}
                      >
                        {highlightMatch(doc.subject, searchQuery)}
                      </button>
                    </h3>

                    {/* Meta badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${priority.pillClasses}`}>
                        {priority.level !== 'normal' && <AlertTriangle className="h-3 w-3 shrink-0" />}
                        {priority.label}
                      </span>
                      {doc.typeDocument && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100/90 dark:bg-slate-800 text-[#2d3748] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                          {doc.typeDocument}
                        </span>
                      )}
                      {doc.activity && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/70">
                          {doc.activity}
                        </span>
                      )}
                      {(urgency || doc.dateActivity) && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
                            urgency
                              ? urgency.badgeColor
                              : 'bg-slate-100/90 text-slate-600 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <Clock className="h-3 w-3 shrink-0" />
                          {urgency ? urgency.label : null}
                          {doc.dateActivity && (
                            <bdi dir={isFr ? 'ltr' : 'rtl'}>{formatLongDate(doc.dateActivity, isFr ? 'fr' : 'ar')}</bdi>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Source, External Ref & Date Info */}
                    <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                        <span className="truncate">{doc.source || t('incoming.source.unspecifiedSource')}</span>
                      </div>
                      {doc.correspondenceNumber && (
                        <div className="flex items-center gap-1.5 font-mono tabular-nums">
                          <span>{isFr ? 'Réf :' : 'المرجع:'} <bdi dir="ltr">{doc.correspondenceNumber}</bdi></span>
                          <CopyReferenceButton
                            value={doc.correspondenceNumber}
                            label={isFr ? 'Copier la référence externe' : 'نسخ رقم المراسلة'}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 tabular-nums">
                        <Calendar className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                        <bdi dir={isFr ? 'ltr' : 'rtl'}>{formatLongDate(doc.arrivalDate, isFr ? 'fr' : 'ar')}</bdi>
                      </div>
                      {doc.responsibleUser && typeof doc.responsibleUser === 'object' && (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                          <span>{t('incoming.responsible.label', { name: doc.responsibleUser.username })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons (2 primary actions + ... menu) */}
                  <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(doc._id)}
                      className="flex-1 h-11 min-h-[44px] text-xs font-semibold text-[#2c5282] dark:text-blue-200 border-blue-200/80 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg"
                    >
                      <Eye className="h-3.5 w-3.5 me-1" />
                      {t('incoming.actions.view')}
                    </Button>

                    {canAssignOrRespond ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setResponseDoc(doc)}
                        className="flex-1 h-11 min-h-[44px] text-xs font-bold text-[#1a202c] border-[#e5b836] bg-amber-50 hover:bg-[#FFCB56] rounded-lg"
                      >
                        <MessageSquare className="h-3.5 w-3.5 me-1 text-[#1a202c]" />
                        {t('incoming.actions.process')}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewDoc(doc)}
                        className="flex-1 h-11 min-h-[44px] text-xs font-semibold text-amber-800 dark:text-amber-200 border-amber-300/80 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg"
                      >
                        <FileText className="h-3.5 w-3.5 me-1" />
                        {t('incoming.actions.preview')}
                      </Button>
                    )}

                    {(canAssignOrRespond || canViewCategorization || doc.scannedDocument || canEdit || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={t('incoming.actions.more')}
                            title={t('incoming.actions.more')}
                            className="h-11 w-11 min-w-[44px] min-h-[44px] p-0 text-slate-700 dark:text-slate-300 hover:text-[#1a202c] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm">
                          {canAssignOrRespond && (
                            <DropdownMenuItem
                              onClick={() => setPreviewDoc(doc)}
                              className="text-sm py-2.5 cursor-pointer"
                            >
                              <FileText className="me-2 h-4 w-4 text-amber-700" />
                              {t('incoming.actions.previewModal')}
                            </DropdownMenuItem>
                          )}
                          {canViewCategorization && (
                            <DropdownMenuItem
                              onClick={() => setFolderDoc(doc)}
                              className="text-sm py-2.5 cursor-pointer"
                            >
                              <FolderOpen className="me-2 h-4 w-4 text-slate-700 dark:text-slate-300" />
                              {t('incoming.actions.archive')}
                            </DropdownMenuItem>
                          )}
                          {canAssignResponsible && (
                            <DropdownMenuItem
                              onClick={() => setResponsibleDoc(doc)}
                              className="text-sm py-2.5 cursor-pointer"
                            >
                              <UserPlus className="me-2 h-4 w-4 text-purple-700" />
                              {t('incoming.actions.transfer')}
                            </DropdownMenuItem>
                          )}
                          {doc.scannedDocument && (
                            <DropdownMenuItem
                              onClick={() => handleDownload(doc)}
                              disabled={downloadingDocId === doc._id}
                              className="text-sm py-2.5 cursor-pointer"
                            >
                              <Download className="me-2 h-4 w-4 text-[#2c5282]" />
                              {t('incoming.actions.downloadPdf')}
                            </DropdownMenuItem>
                          )}
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => handleEdit(doc._id)}
                              className="text-sm py-2.5 cursor-pointer"
                            >
                              <Edit className="me-2 h-4 w-4 text-[#2c5282]" />
                              {t('incoming.actions.editDoc')}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteDoc(doc)}
                                className="text-sm py-2.5 text-red-600 focus:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="me-2 h-4 w-4 text-red-600" />
                                {t('incoming.actions.deleteDoc')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Pagination Section (En-tête → filtres/tri → tableau → pagination) */}
        {totalFiltered > 0 && (
          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-base text-slate-700 dark:text-slate-300 tabular-nums">
              {t('incoming.pagination.info', {
                from: totalCount === 0 ? 0 : startIndex + 1,
                to: endIndex,
                total: totalFiltered
              })}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span>{t('incoming.pagination.perPage')}</span>
                <Select 
                  value={pageSize.toString()} 
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-20 text-sm text-start border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 tabular-nums">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10" className="text-sm">10</SelectItem>
                    <SelectItem value="20" className="text-sm">20</SelectItem>
                    <SelectItem value="50" className="text-sm">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Page Navigation */}
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={clampedPage <= 1 || isFetching}
                  className="h-11 px-3 text-sm font-medium border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4 me-1 rtl:rotate-0 ltr:rotate-180" />
                  {t('common.previous')}
                </Button>

                <span className="text-sm font-semibold text-[#1a202c] dark:text-slate-100 px-2 tabular-nums">
                  <bdi dir="ltr">{clampedPage} / {totalPages}</bdi>
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={clampedPage >= totalPages || isFetching}
                  className="h-11 px-3 text-sm font-medium border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  {t('common.next')}
                  <ChevronLeft className="h-4 w-4 ms-1 rtl:rotate-0 ltr:rotate-180" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Folder Categorization Dialog (Archiver) */}
      {folderDoc && (
        <DocumentFolderDialog
          open={Boolean(folderDoc)}
          onOpenChange={(open) => {
            if (!open) setFolderDoc(null);
          }}
          document={folderDoc}
          documentType="incoming"
          readOnly={!canOrganizeDocuments}
        />
      )}

      {/* 6. Assign Response Dialog (Traiter) */}
      {responseDoc && (
        <AssignResponseDialog
          open={Boolean(responseDoc)}
          onOpenChange={(open) => {
            if (!open) setResponseDoc(null);
          }}
          document={responseDoc}
        />
      )}

      {/* 7. Assign Responsible Dialog (Transférer) */}
      {responsibleDoc && canAssignResponsible && (
        <AssignResponsibleDialog
          open={Boolean(responsibleDoc)}
          onOpenChange={(open) => {
            if (!open) setResponsibleDoc(null);
          }}
          document={responsibleDoc}
        />
      )}

      {/* 8. Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(deleteDoc)} onOpenChange={(open) => { if (!open) setDeleteDoc(null); }}>
        <AlertDialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-lg">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200/80 dark:border-red-800/70 text-red-600 dark:text-red-400 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              {t('incoming.delete.dialogTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
              {t('incoming.delete.confirmMessage', {
                serialNumber: deleteDoc?.serialNumber,
                year: deleteDoc?.year
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <AlertDialogAction
              onClick={() => {
                if (deleteDoc) {
                  deleteMutation.mutate(deleteDoc._id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-base h-11 px-7 rounded-lg shadow-none inline-flex items-center gap-2"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('incoming.delete.deleting')}</span>
                </>
              ) : (
                t('incoming.delete.confirmButton')
              )}
            </AlertDialogAction>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-base h-11 px-6 rounded-lg"
            >
              {t('common.cancel')}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
        direction="incoming"
      />

      <ScrollToTop />
    </div>
  );
};

export default IncomingDocumentsPage;
