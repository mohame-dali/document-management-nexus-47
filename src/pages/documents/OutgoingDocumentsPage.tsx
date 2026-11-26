import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  PlusCircle, 
  LayoutGrid, 
  LayoutList, 
  Search, 
  Calendar, 
  Send, 
  FileOutput,
  Clock, 
  Users, 
  Loader2,
  Eye,
  FileText,
  FolderOpen, 
  MoreHorizontal, 
  Download, 
  Edit, 
  Trash2, 
  RotateCcw, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  ChevronRight, 
  ChevronLeft, 
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Share2,
  Tag,
  Building,
  Check,
  Copy
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { getDepartments } from '@/services/departmentService';
import { getDocumentOptions } from '@/services/documentOptionsService';
import { deleteOutgoingDocument, downloadDocument, getOutgoingDocuments } from '@/services/documentService';
import { useAuth } from '@/contexts/AuthContext';
import { OutgoingDocument, Department } from '@/types';
import { useYearPersistence } from '@/hooks/useYearPersistence';
import { formatLongDate } from '@/utils/formatDate';
import { getDocumentPriority } from '@/utils/activityUtils';
import DocumentFolderDialog from '@/components/documents/DocumentFolderDialog';
import DocumentPreviewModal from '@/components/documents/DocumentPreviewModal';
import CopyReferenceButton from '@/components/documents/CopyReferenceButton';
import ScrollToTop from '@/components/common/ScrollToTop';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { usePdfExport } from '@/hooks/usePdfExport';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { exportToCsv } from '@/utils/exportCsv';

const OutgoingDocumentsPage: React.FC = () => {
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

  const [viewMode, setViewMode] = useLocalStorageState<'table' | 'grid'>('outgoingDocs_viewMode', 'table');
  const [selectedDepartment, setSelectedDepartment] = useLocalStorageState<string>('outgoingDocs_selectedDepartment', 'all');
  const [selectedType, setSelectedType] = useLocalStorageState<string>('outgoingDocs_selectedType', 'all_types');
  const [folderFilter, setFolderFilter] = useLocalStorageState<string>('outgoingDocs_folderFilter', 'all');
  const [sortBy, setSortBy] = useLocalStorageState<string>('outgoingDocs_sortBy', 'newest-issue');
  const [sortField, setSortField] = useLocalStorageState<string>('outgoingDocs_sortField', 'issueDate');
  const [sortDirection, setSortDirection] = useLocalStorageState<'asc' | 'desc'>('outgoingDocs_sortDirection', 'desc');

  const handleTableSort = (field: string) => {
    const nextDirection: 'asc' | 'desc' =
      sortField === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortField(field);
    setSortDirection(nextDirection);
    if (field === 'serialNumber') {
      setSortBy(nextDirection === 'asc' ? 'serial-asc' : 'serial-desc');
    } else if (field === 'issueDate') {
      setSortBy(nextDirection === 'asc' ? 'oldest-issue' : 'newest-issue');
    }
    setCurrentPage(1);
  };
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Dialogs State
  const [folderDoc, setFolderDoc] = useState<OutgoingDocument | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<OutgoingDocument | null>(null);
  const [transferDoc, setTransferDoc] = useState<OutgoingDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<OutgoingDocument | null>(null);

  // Transfer Form State
  const [transferTargetDept, setTransferTargetDept] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>(t('outgoing.transfer.defaultNotes'));
  const [isTransferSubmitting, setIsTransferSubmitting] = useState<boolean>(false);

  // Year persistence hook
  const { selectedYear, handleYearChange, isValidYear } = useYearPersistence('outgoingDocumentsSelectedYear');

  // Role permissions
  const isDirector = currentUser?.role === 'Director';
  const isAdmin = currentUser?.role === 'Admin';
  const isAdminTuningDesk = currentUser?.role === 'AdminTuningDesk';
  const isAdminDepartment = currentUser?.role === 'AdminDepartment';

  const canAddDocuments = isAdmin || isAdminTuningDesk;
  const canEdit = isAdmin || isAdminTuningDesk;
  const canDelete = isAdmin || isAdminTuningDesk;
  const canOrganizeDocuments = isAdminDepartment || isAdmin;
  const canViewCategorization = isAdmin || isDirector || isAdminTuningDesk || isAdminDepartment || currentUser?.role === 'User';

  // Fetch departments
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: getDepartments,
    enabled: true,
  });

  // Fetch document types
  const { data: typeOptions = [] } = useQuery({
    queryKey: ['documentOptions', 'typeDocument', 'outgoing'],
    queryFn: () => getDocumentOptions({ category: 'typeDocument', documentType: 'outgoing' }),
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
      'outgoingDocuments',
      selectedYear,
      selectedDepartment,
      selectedType,
      folderFilter,
      sortBy,
      sortField,
      sortDirection,
      currentPage,
      pageSize,
      debouncedSearch,
    ],
    queryFn: () => getOutgoingDocuments({
      year: selectedYear,
      department: selectedDepartment === 'all' ? undefined : selectedDepartment,
      typeDocument: selectedType === 'all_types' ? undefined : selectedType,
      folderFilter: folderFilter === 'all' ? undefined : folderFilter,
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

  // Auto-refresh when user returns to tab
  useEffect(() => {
    const handleFocus = () => {
      if (isValidYear) {
        refetch();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch, isValidYear]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (docId: string) => deleteOutgoingDocument(docId),
    onSuccess: () => {
      toast.success(t('outgoing.toasts.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['outgoingDocuments'] });
      setDeleteDoc(null);
    },
    onError: (err: unknown) => {
      console.error('Error deleting outgoing document:', err);
      toast.error(t('outgoing.toasts.deleteError'));
    },
  });

  // Documents are already filtered, sorted and paginated server-side across all pages
  const filteredDocuments = documents as OutgoingDocument[];
  const sortedDocuments = filteredDocuments;

  // Pagination calculation
  const totalFiltered = totalCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const clampedPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (clampedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + sortedDocuments.length, totalCount);
  const paginatedDocuments = sortedDocuments;

  // Reset filters
  const handleFilterReset = () => {
    setSearchQuery('');
    setSelectedDepartment('all');
    setSelectedType('all_types');
    setFolderFilter('all');
    setSortBy('newest-issue');
    setSortField('issueDate');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedDepartment !== 'all' ||
    selectedType !== 'all_types' ||
    folderFilter !== 'all' ||
    sortBy !== 'newest-issue'
  );

  // Document action handlers
  const handleView = (id: string) => {
    navigate(`/dashboard/outgoing-documents/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/dashboard/outgoing-documents/${id}/edit`);
  };

  const handleExportPdf = async () => {
    if (sortedDocuments.length === 0) {
      toast.info(t('outgoing.toasts.noDocsToExport'));
      return;
    }

    const rows = sortedDocuments.map((doc: OutgoingDocument) => {
      const recipientText = Array.isArray(doc.recipients) && doc.recipients.length > 0
        ? doc.recipients.join(', ')
        : (doc.recipient || t('outgoing.source.unspecified'));

      return {
        serialNumber: doc.serialNumber || '',
        issueDate: formatLongDate(doc.issueDate, isFr ? 'fr' : 'ar'),
        subject: doc.subject || '',
        recipient: recipientText,
        typeDocument: doc.typeDocument || t('outgoing.type.general'),
      };
    });

    await exportPdf({
      title: t('outgoing.exportPdf.title'),
      subtitle: t('outgoing.exportPdf.subtitle', { year: selectedYear, count: rows.length }),
      columns: [
        { header: t('outgoing.exportPdf.colSerial'), dataKey: 'serialNumber', align: 'center', width: 28 },
        { header: t('outgoing.exportPdf.colIssueDate'), dataKey: 'issueDate', align: 'center', width: 32 },
        { header: t('outgoing.exportPdf.colSubject'), dataKey: 'subject', align: 'right' },
        { header: t('outgoing.exportPdf.colRecipient'), dataKey: 'recipient', align: 'right', width: 44 },
        { header: t('outgoing.exportPdf.colType'), dataKey: 'typeDocument', align: 'center', width: 28 },
      ],
      rows,
      fileName: t('outgoing.exportPdf.fileName', { year: selectedYear }),
      orientation: 'landscape',
      footerText: t('outgoing.exportPdf.footer'),
    });
  };

  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const handleDownload = async (doc: OutgoingDocument) => {
    if (doc.scannedDocument) {
      try {
        setDownloadingDocId(doc._id);
        toast.info(t('outgoing.toasts.downloadStarting'));
        await downloadDocument(
          doc.scannedDocument, 
          `outgoing-doc-${doc.serialNumber}-${doc.year}.pdf`
        );
        toast.success(t('outgoing.toasts.downloadSuccess'));
      } catch (err) {
        console.error('Download error:', err);
        toast.error(t('outgoing.toasts.downloadError'));
      } finally {
        setDownloadingDocId(null);
      }
    } else {
      toast.error(t('outgoing.toasts.noScannedDoc'));
    }
  };

  // Handle transfer submission
  const handleTransferSubmit = () => {
    if (!transferDoc) return;
    setIsTransferSubmitting(true);
    setTimeout(() => {
      setIsTransferSubmitting(false);
      toast.success(t('outgoing.toasts.transferSuccess', { serialNumber: transferDoc.serialNumber }));
      setTransferDoc(null);
      setTransferNotes(t('outgoing.transfer.defaultNotes'));
      setTransferTargetDept('');
    }, 400);
  };

  // Helper for highlighting search matches
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-[#FFD758]/40 text-[#1a202c] font-semibold px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  // Loading view — Afficher un skeleton pendant le chargement initial
  if (isLoading && isValidYear) {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-[#1a202c] dark:text-slate-100 py-3 sm:py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-4 max-w-7xl">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 sm:p-6 space-y-4 shadow-sm">
            <TableSkeleton columns={7} rows={8} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-[#1a202c] dark:text-slate-100 py-3 sm:py-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-4 max-w-7xl">
        
        {/* Fil d'Ariane (Breadcrumbs) */}
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 print:hidden">
          <Link to="/dashboard" className="hover:text-[#2c5282] dark:hover:text-blue-300 transition-colors">{t('common.home')}</Link>
          <ChevronLeft className="w-4 h-4 text-slate-400 dark:text-slate-500 rtl:rotate-0 ltr:rotate-180" />
          <span className="text-[#1a202c] dark:text-slate-100 font-medium">{t('outgoing.page.title')}</span>
        </nav>

        {/* 1. Header Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/70 flex items-center justify-center text-[#276749] dark:text-emerald-300 flex-shrink-0 mt-0.5">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c] dark:text-slate-100 leading-tight">
                  {t('outgoing.page.headerTitle')}
                </h1>
                <p className="text-base text-[#4a5568] dark:text-slate-300 mt-1.5 leading-relaxed">
                  {t('outgoing.page.headerSubtitle')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap justify-end print:hidden">
              <Button
                type="button"
                variant="outline"
                onClick={handleExportPdf}
                disabled={isExporting || sortedDocuments.length === 0}
                title={t('outgoing.actions.exportPdfTooltip')}
                className="h-11 px-4 text-base font-semibold border-slate-300 dark:border-slate-700 text-[#2c5282] dark:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200 shadow-xs flex items-center gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin me-1" />
                ) : (
                  <Download className="h-4 w-4 me-1" />
                )}
                <span>{t('outgoing.actions.exportPdf')}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => exportToCsv('courriers-sortants.csv', documents as unknown as Record<string, unknown>[])}
                disabled={documents.length === 0}
                className="h-11 px-4 text-base font-semibold border-slate-300 dark:border-slate-700 text-[#2c5282] dark:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200 shadow-xs flex items-center gap-2"
                title="تصدير Excel"
              >
                <Download className="h-4 w-4 me-1" />
                <span>تصدير Excel</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                title={t('outgoing.actions.refreshTooltip')}
                className="h-11 px-4 text-base font-semibold border-slate-300 dark:border-slate-700 text-[#2c5282] dark:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
              >
                <RotateCcw className={`h-4 w-4 me-2 ${isFetching ? 'animate-spin' : ''}`} />
                {t('common.refresh')}
              </Button>

              {canAddDocuments && (
                <Button
                  type="button"
                  onClick={() => navigate('/dashboard/outgoing-documents/create')}
                  className="h-11 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-200 shadow-sm"
                >
                  <PlusCircle className="h-5 w-5 me-2" />
                  {t('outgoing.actions.create')}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 1b. Compact 4-Card KPI Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-[#2c5282] dark:border-t-blue-500 rounded-lg px-4 py-3 shadow-sm flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                {isFr ? 'Total sortants' : 'إجمالي الصادر'}
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
                {totalCount}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-emerald-500 rounded-lg px-4 py-3 shadow-sm flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                {isFr ? 'Avec pièce jointe' : 'مرفقة بملف'}
              </p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums mt-0.5">
                {documents.filter((d) => Boolean(d.scannedDocument)).length}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-amber-500 rounded-lg px-4 py-3 shadow-sm flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                {isFr ? 'Classés en dossier' : 'مصنفة في مجلد'}
              </p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300 tabular-nums mt-0.5">
                {documents.filter((d) => Boolean(d.folder)).length}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200/70 dark:border-amber-800/60 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
              <FolderOpen className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-indigo-500 rounded-lg px-4 py-3 shadow-sm flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                {isFr ? 'En réponse à un entrant' : 'رد على وارد'}
              </p>
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 tabular-nums mt-0.5">
                {documents.filter((d) => Boolean(d.reference)).length}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <FileOutput className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* 2. Filters & Controls Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-5 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
            
            {/* Search Input */}
            <div className="lg:col-span-4 relative">
              <label className="block text-sm font-semibold text-[#2d3748] dark:text-slate-200 mb-1.5">
                {t('outgoing.filters.searchLabel')}
              </label>
              <div className="relative">
                <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input
                  type="text"
                  placeholder={t('outgoing.filters.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 ps-10 text-base border-slate-300 dark:border-slate-700 focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#5f6b7d] dark:text-slate-300 hover:text-[#1a202c] dark:hover:text-white px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800"
                  >
                    {t('outgoing.filters.clear')}
                  </button>
                )}
              </div>
            </div>

            {/* Year Selector */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-[#2d3748] dark:text-slate-200 mb-1.5">
                {t('outgoing.filters.yearLabel')}
              </label>
              <div className="relative">
                <Calendar className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input
                  type="text"
                  maxLength={4}
                  value={selectedYear}
                  onChange={(e) => {
                    handleYearChange(e);
                    setCurrentPage(1);
                  }}
                  placeholder="2026"
                  className="h-11 ps-10 text-base font-bold tabular-nums text-[#1a202c] dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] rounded-lg bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Department Filter (if AdminTuningDesk or for general source filter) */}
            {currentUser?.role === 'AdminTuningDesk' && (
              <div className="lg:col-span-3">
                <label className="block text-sm font-semibold text-[#2d3748] dark:text-slate-200 mb-1.5">
                  {t('outgoing.filters.departmentLabel')}
                </label>
                <Select
                  value={selectedDepartment}
                  onValueChange={(val) => {
                    setSelectedDepartment(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-11 text-base border-slate-300 dark:border-slate-700 focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    <SelectValue placeholder={t('outgoing.filters.allDepartments')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-slate-200/80 dark:border-slate-800 text-base">
                    <SelectItem value="all">{t('outgoing.filters.allDepartments')}</SelectItem>
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
                        <SelectItem key={dept._id} value={dept._id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Document Type Filter */}
            <div className={currentUser?.role === 'AdminTuningDesk' ? "lg:col-span-3" : "lg:col-span-3"}>
              <label className="block text-sm font-semibold text-[#2d3748] dark:text-slate-200 mb-1.5">
                {t('outgoing.filters.typeLabel')}
              </label>
              <Select
                value={selectedType}
                onValueChange={(val) => {
                  setSelectedType(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 text-base border-slate-300 dark:border-slate-700 focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder={t('outgoing.filters.allTypesPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-slate-200/80 dark:border-slate-800 text-base">
                  <SelectItem value="all_types">{t('outgoing.filters.allTypes')}</SelectItem>
                  {typeOptions.map((opt) => {
                    const legacyOpt = opt as typeof opt & { name?: string; label?: string };
                    const val = legacyOpt.value || legacyOpt.name || '';
                    const lbl = legacyOpt.label || legacyOpt.value || legacyOpt.name || '';
                    return (
                      <SelectItem key={legacyOpt._id || val} value={val}>
                        {lbl}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Classification/Folder Filter */}
            <div className={currentUser?.role === 'AdminTuningDesk' ? "lg:col-span-4" : "lg:col-span-3"}>
              <label className="block text-sm font-semibold text-[#2d3748] dark:text-slate-200 mb-1.5">
                {t('outgoing.filters.folderFilterLabel')}
              </label>
              <Select
                value={folderFilter}
                onValueChange={(val) => {
                  setFolderFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 text-base border-slate-300 dark:border-slate-700 focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder={t('outgoing.filters.folderPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-slate-200/80 dark:border-slate-800 text-base">
                  <SelectItem value="all">{t('outgoing.filters.folderAll')}</SelectItem>
                  <SelectItem value="categorized">{t('outgoing.filters.folderCategorized')}</SelectItem>
                  <SelectItem value="uncategorized">{t('outgoing.filters.folderUncategorized')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className={currentUser?.role === 'AdminTuningDesk' ? "lg:col-span-4" : "lg:col-span-3"}>
              <label className="block text-sm font-semibold text-[#2d3748] dark:text-slate-200 mb-1.5">
                {t('outgoing.filters.sortLabel')}
              </label>
              <Select
                value={sortBy}
                onValueChange={(val) => {
                  setSortBy(val);
                  if (val === 'newest-issue') {
                    setSortField('issueDate');
                    setSortDirection('desc');
                  } else if (val === 'oldest-issue') {
                    setSortField('issueDate');
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
                <SelectTrigger className="h-11 text-base border-slate-300 dark:border-slate-700 focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-slate-200/80 dark:border-slate-800 text-base">
                  <SelectItem value="newest-issue">{t('outgoing.sort.newestIssue')}</SelectItem>
                  <SelectItem value="oldest-issue">{t('outgoing.sort.oldestIssue')}</SelectItem>
                  <SelectItem value="serial-desc">{t('outgoing.sort.serialDesc')}</SelectItem>
                  <SelectItem value="serial-asc">{t('outgoing.sort.serialAsc')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Reset (if any) */}
            {hasActiveFilters && (
              <div className="lg:col-span-4 flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleFilterReset}
                  className="h-11 px-4 text-base font-semibold text-[#c53030] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-[#9b2c2c] rounded-lg transition-colors duration-200 w-full sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4 me-1.5" />
                  {t('outgoing.filters.reset')}
                </Button>
              </div>
            )}
          </div>

          {/* Sub-bar: Badges & View Switcher */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-base">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Year badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/70 tabular-nums">
                <Calendar className="h-4 w-4" />
                {t('outgoing.stats.yearBadge', { year: selectedYear })}
              </span>

              {/* Total count badge with institutional amber accent */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-[#FFD758]/25 dark:bg-[#FFD758]/90 text-[#1a202c] border border-[#e5b836] tabular-nums">
                <FileOutput className="h-4 w-4 text-[#1a202c]" />
                {t('outgoing.stats.resultsCount', { filtered: totalFiltered, total: totalCount })}
              </span>

              {isFetching && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100/90 dark:bg-slate-800 text-[#4a5568] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2c5282] dark:text-blue-300" />
                  {t('outgoing.stats.syncing')}
                </span>
              )}
            </div>

            {/* View Mode Toggle: Table or Grid */}
            <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-label={t('outgoing.view.tableLabel')}
                className={`h-11 px-3.5 text-base flex items-center gap-1.5 transition-colors duration-200 ${
                  viewMode === 'table'
                    ? 'bg-[#2c5282] text-white'
                    : 'text-[#4a5568] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title={t('outgoing.view.tableLabel')}
              >
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">{t('outgoing.view.table')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label={t('outgoing.view.gridLabel')}
                className={`h-11 px-3.5 text-base flex items-center gap-1.5 border-s border-slate-300 dark:border-slate-700 transition-colors duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-[#2c5282] text-white'
                    : 'text-[#4a5568] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title={t('outgoing.view.gridLabel')}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">{t('outgoing.view.grid')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Main Documents Content: Table or Grid */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 sm:p-8 space-y-6 shadow-sm">
          
          {/* Validation on year */}
          {!isValidYear ? (
            <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg p-12 text-center bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-[#e5b836] flex items-center justify-center mx-auto text-[#1a202c] dark:text-amber-200">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1a202c] dark:text-slate-100">{t('outgoing.yearValidation.title')}</h3>
              <p className="text-base text-[#4a5568] dark:text-slate-300 max-w-md mx-auto">
                {t('outgoing.yearValidation.description')}
              </p>
            </div>
          ) : isError ? (
            <EmptyState
              icon={<AlertCircle className="h-6 w-6 text-[#b91c1c]" />}
              title={t('outgoing.error.title')}
              description={t('outgoing.error.description')}
              className="border-red-200 bg-red-50/40"
              action={
                <Button
                  type="button"
                  onClick={() => refetch()}
                  className="h-11 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#1e3a5f] text-white rounded-lg inline-flex items-center gap-2 transition-colors duration-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{t('common.retry')}</span>
                </Button>
              }
            />
          ) : totalFiltered === 0 ? (
            /* Empty State */
            <EmptyState
              icon={<FileOutput className="h-6 w-6 text-[#2c5282]" />}
              title={t('outgoing.empty.title')}
              description={
                hasActiveFilters
                  ? t('outgoing.empty.filtered')
                  : t('outgoing.empty.noDocsYear', { year: selectedYear })
              }
              action={
                hasActiveFilters ? (
                  <Button
                    type="button"
                    onClick={handleFilterReset}
                    className="h-11 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-200"
                  >
                    {t('outgoing.empty.showAll', { year: selectedYear })}
                  </Button>
                ) : undefined
              }
            />
          ) : viewMode === 'table' ? (
            /* TABULAR VIEW (AdminLTE style, 8h/day professional ergonomics, line height >= 64px) */
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
                        <span>{t('outgoing.table.serialNumber')}</span>
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
                        <span>{t('outgoing.table.subjectAndType')}</span>
                        {sortField === 'subject' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />}
                        {sortField === 'subject' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />}
                        {sortField !== 'subject' && <ChevronsUpDown className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                      </button>
                    </th>
                    <th
                      className="p-0 font-bold text-sm whitespace-nowrap"
                      aria-sort={sortField === 'issueDate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <button
                        type="button"
                        onClick={() => handleTableSort('issueDate')}
                        className="w-full min-h-[44px] py-3 px-4 flex items-center gap-1.5 font-bold text-sm text-start hover:bg-slate-100/80 dark:hover:bg-slate-700/60 select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282] focus-visible:ring-inset"
                      >
                        <span>{t('outgoing.table.issueDate')}</span>
                        {sortField === 'issueDate' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />}
                        {sortField === 'issueDate' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />}
                        {sortField !== 'issueDate' && <ChevronsUpDown className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                      </button>
                    </th>
                    <th className="py-3 px-4 font-bold text-sm text-start">{t('outgoing.table.source')}</th>
                    <th className="py-3 px-4 font-bold text-sm text-start">{t('outgoing.table.recipients')}</th>
                    <th
                      className="p-0 font-bold text-sm whitespace-nowrap"
                      aria-sort={sortField === 'status' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <button
                        type="button"
                        onClick={() => handleTableSort('status')}
                        className="w-full min-h-[44px] py-3 px-4 flex items-center gap-1.5 font-bold text-sm text-start hover:bg-slate-100/80 dark:hover:bg-slate-700/60 select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282] focus-visible:ring-inset"
                      >
                        <span>{t('outgoing.table.classification')}</span>
                        {sortField === 'status' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />}
                        {sortField === 'status' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />}
                        {sortField !== 'status' && <ChevronsUpDown className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                      </button>
                    </th>
                    <th className="py-3 px-4 font-bold text-sm text-center whitespace-nowrap">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {paginatedDocuments.map((doc: OutgoingDocument) => {
                    const refDoc = typeof doc.reference === 'object' && doc.reference ? doc.reference : null;
                    const priority = getDocumentPriority(refDoc, isFr);
                    const serialLabel = `#${doc.serialNumber} / ${doc.year}`;
                    const refLabel = refDoc?.serialNumber
                      ? `#${refDoc.serialNumber} / ${refDoc.year}`
                      : null;

                    return (
                      <tr 
                        key={doc._id}
                        className={`hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors duration-150 min-h-[64px] ${priority.rowAccentClasses}`}
                      >
                        {/* Serial Number & Year + Linked Reference */}
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
                            {refLabel && (
                              <div className="flex items-center gap-1 ps-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                                <span><bdi dir="ltr">{refLabel}</bdi></span>
                                <CopyReferenceButton
                                  value={refLabel}
                                  label={isFr ? 'Copier la référence entrante' : 'نسخ رقم الوارد المرجعي'}
                                />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Subject, Priority & Type */}
                        <td className="py-3 px-4">
                          <div className="max-w-[340px] space-y-1.5">
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
                                {priority.label}
                              </span>

                              {doc.typeDocument && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100/90 dark:bg-slate-800 text-[#2d3748] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                                  {doc.typeDocument}
                                </span>
                              )}

                              {doc.scannedDocument && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/70">
                                  <FileOutput className="h-3 w-3" />
                                  {t('outgoing.table.attachedFile')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Issue Date */}
                        <td className="py-3 px-4 whitespace-nowrap text-sm text-[#4a5568] dark:text-slate-300 tabular-nums">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                            <bdi dir={isFr ? 'ltr' : 'rtl'}>{formatLongDate(doc.issueDate, isFr ? 'fr' : 'ar')}</bdi>
                          </div>
                        </td>

                        {/* Source */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-sm font-normal text-[#2d3748] dark:text-slate-200">
                            <Building2 className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                            <span className="line-clamp-1" title={doc.source?.name || t('outgoing.source.unspecified')}>
                              {highlightMatch(doc.source?.name || t('outgoing.source.unspecified'), searchQuery)}
                            </span>
                          </div>
                        </td>

                        {/* Assigned To / Recipients */}
                        <td className="py-3 px-4">
                          {Array.isArray(doc.assignedTo) && doc.assignedTo.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {doc.assignedTo.slice(0, 2).map((dest, idx) => (
                                <span 
                                  key={idx}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/70"
                                >
                                  {dest}
                                </span>
                              ))}
                              {doc.assignedTo.length > 2 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100/90 dark:bg-slate-800 text-[#4a5568] dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 tabular-nums">
                                  {t('outgoing.table.otherRecipients', { count: doc.assignedTo.length - 2 })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[#5f6b7d] dark:text-slate-400">{t('outgoing.source.unspecified')}</span>
                          )}
                        </td>

                        {/* Folder / Classification */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {doc.folder ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/70">
                              <FolderOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              {typeof doc.folder === 'object' ? doc.folder.name : t('outgoing.status.categorizedInFolder')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-[#5f6b7d] dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                              {t('outgoing.status.uncategorized')}
                            </span>
                          )}
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
                              title={t('outgoing.actions.viewTooltip')}
                              className="h-8 px-2.5 text-xs font-semibold rounded-md text-[#2c5282] dark:text-blue-200 border-blue-200/80 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors duration-200 whitespace-nowrap shrink-0"
                            >
                              <Eye className="h-3.5 w-3.5 me-1 shrink-0" />
                              {t('common.view')}
                            </Button>

                            {/* Primary 2: Aperçu */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewDoc(doc)}
                              title={t('outgoing.actions.previewTooltip')}
                              className="h-8 px-2.5 text-xs font-semibold rounded-md text-amber-800 dark:text-amber-200 border-amber-300/80 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors duration-200 whitespace-nowrap shrink-0"
                            >
                              <FileText className="h-3.5 w-3.5 me-1 shrink-0" />
                              {t('outgoing.actions.preview')}
                            </Button>

                            {/* Secondary Actions Dropdown (...) */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  aria-label={t('outgoing.actions.moreActions')}
                                  title={t('outgoing.actions.moreActions')}
                                  className="h-8 w-8 p-0 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-[#5f6b7d] dark:text-slate-400 shrink-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-slate-900 text-base rounded-lg border-slate-200/80 dark:border-slate-800 shadow-sm">
                                {canEdit && (
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(doc._id)}
                                    className="text-sm py-2.5 cursor-pointer"
                                  >
                                    <Edit className="h-4 w-4 me-2 text-[#4a5568]" />
                                    {t('common.edit')}
                                  </DropdownMenuItem>
                                )}

                                {canViewCategorization && (
                                  <DropdownMenuItem
                                    onClick={() => setFolderDoc(doc)}
                                    className="text-sm py-2.5 cursor-pointer"
                                  >
                                    <FolderOpen className="h-4 w-4 me-2 text-amber-700" />
                                    {t('outgoing.actions.archive')}
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() => setTransferDoc(doc)}
                                  className="text-sm py-2.5 cursor-pointer"
                                >
                                  <Share2 className="h-4 w-4 me-2 text-purple-700" />
                                  {t('outgoing.actions.transfer')}
                                </DropdownMenuItem>

                                {doc.scannedDocument && (
                                  <DropdownMenuItem
                                    onClick={() => handleDownload(doc)}
                                    disabled={downloadingDocId === doc._id}
                                    className="text-sm py-2.5 cursor-pointer"
                                  >
                                    {downloadingDocId === doc._id ? (
                                      <Loader2 className="h-4 w-4 me-2 animate-spin text-[#2c5282]" />
                                    ) : (
                                      <Download className="h-4 w-4 me-2 text-[#2c5282]" />
                                    )}
                                    {t('outgoing.actions.downloadPdfTooltip')}
                                  </DropdownMenuItem>
                                )}

                                {canDelete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setDeleteDoc(doc)}
                                      className="text-[#e53e3e] focus:text-[#c53030] focus:bg-red-50 text-sm py-2.5 font-semibold cursor-pointer"
                                    >
                                      <Trash2 className="h-4 w-4 me-2" />
                                      {t('outgoing.actions.deleteDocument')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* GRID VIEW (Cards Layout) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedDocuments.map((doc: OutgoingDocument) => {
                const refDoc = typeof doc.reference === 'object' && doc.reference ? doc.reference : null;
                const priority = getDocumentPriority(refDoc, isFr);
                const serialLabel = `#${doc.serialNumber} / ${doc.year}`;

                return (
                  <div
                    key={doc._id}
                    className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all duration-200 flex flex-col justify-between ${priority.cardAccentClasses}`}
                  >
                    <div>
                      {/* Card Top: Serial + Copy & Folder */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/70 tabular-nums">
                            <bdi dir="ltr">{serialLabel}</bdi>
                          </span>
                          <CopyReferenceButton value={serialLabel} />
                        </div>

                        {doc.folder ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/70">
                            <FolderOpen className="h-3 w-3" />
                            {typeof doc.folder === 'object' ? doc.folder.name : t('outgoing.status.categorized')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100/90 dark:bg-slate-800 text-[#5f6b7d] dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                            {t('outgoing.status.uncategorized')}
                          </span>
                        )}
                      </div>

                      {/* Subject */}
                      <h3 className="font-bold text-base mb-2 leading-relaxed">
                        <button
                          type="button"
                          onClick={() => handleView(doc._id)}
                          className="text-start font-bold text-[#1a202c] dark:text-slate-100 hover:text-[#2c5282] dark:hover:text-blue-300 cursor-pointer line-clamp-2 w-full rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]"
                          title={doc.subject}
                        >
                          {highlightMatch(doc.subject, searchQuery)}
                        </button>
                      </h3>

                      {/* Priority & Type Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${priority.pillClasses}`}>
                          {priority.label}
                        </span>
                        {doc.typeDocument && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100/90 dark:bg-slate-800 text-[#2d3748] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                            {doc.typeDocument}
                          </span>
                        )}
                      </div>

                      {/* Meta Information */}
                      <div className="space-y-2 text-sm text-[#4a5568] dark:text-slate-300 mb-4">
                        <div className="flex items-center gap-2 tabular-nums">
                          <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          <span>{t('outgoing.cards.issueDate', { date: formatLongDate(doc.issueDate, isFr ? 'fr' : 'ar') })}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          <span className="truncate">{t('outgoing.cards.source', { source: doc.source?.name || t('outgoing.source.unspecified') })}</span>
                        </div>

                        {Array.isArray(doc.assignedTo) && doc.assignedTo.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Users className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
                            <div className="flex flex-wrap gap-1">
                              {doc.assignedTo.slice(0, 2).map((d, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-100/90 dark:bg-slate-800 text-[#2d3748] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                                  {d}
                                </span>
                              ))}
                              {doc.assignedTo.length > 2 && (
                                <span className="text-xs text-[#5f6b7d] dark:text-slate-400 tabular-nums">
                                  +{doc.assignedTo.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Bottom */}
                    {/* Card Actions Bottom: 2 primary actions + ... menu */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(doc._id)}
                        className="flex-1 h-11 min-h-[44px] px-2.5 text-xs font-semibold rounded-lg text-[#2c5282] dark:text-blue-200 border-blue-200/80 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60"
                      >
                        <Eye className="h-3.5 w-3.5 me-1" />
                        {t('common.view')}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewDoc(doc)}
                        className="flex-1 h-11 min-h-[44px] px-2.5 text-xs font-semibold rounded-lg text-amber-800 dark:text-amber-200 border-amber-300/80 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60"
                        title={t('outgoing.actions.previewTooltip')}
                      >
                        <FileText className="h-3.5 w-3.5 me-1" />
                        {t('outgoing.actions.preview')}
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={t('outgoing.actions.moreActions')}
                            title={t('outgoing.actions.moreActions')}
                            className="h-11 w-11 min-w-[44px] min-h-[44px] p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[#5f6b7d] dark:text-slate-400 shrink-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-slate-900 text-base rounded-lg border-slate-200/80 dark:border-slate-800 shadow-sm">
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => handleEdit(doc._id)}
                              className="text-sm py-2.5 cursor-pointer"
                            >
                              <Edit className="h-4 w-4 me-2 text-[#4a5568]" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                          )}
                          {canViewCategorization && (
                            <DropdownMenuItem
                              onClick={() => setFolderDoc(doc)}
                              className="text-sm py-2.5 cursor-pointer"
                            >
                              <FolderOpen className="h-4 w-4 me-2 text-amber-700" />
                              {t('outgoing.actions.archive')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setTransferDoc(doc)}
                            className="text-sm py-2.5 cursor-pointer"
                          >
                            <Share2 className="h-4 w-4 me-2 text-purple-700" />
                            {t('outgoing.actions.transfer')}
                          </DropdownMenuItem>
                          {doc.scannedDocument && (
                            <DropdownMenuItem
                              onClick={() => handleDownload(doc)}
                              disabled={downloadingDocId === doc._id}
                              className="text-sm py-2.5 cursor-pointer"
                            >
                              <Download className="h-4 w-4 me-2 text-[#2c5282]" />
                              {t('outgoing.actions.downloadPdfTooltip')}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteDoc(doc)}
                                className="text-[#e53e3e] focus:text-[#c53030] focus:bg-red-50 text-sm py-2.5 font-semibold cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4 me-2" />
                                {t('outgoing.actions.deleteDocument')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. Pagination Section (En-tête → filtres/tri → tableau → pagination) */}
          {totalFiltered > 0 && (
            <div className="pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-base">
              
              {/* Counter Display */}
              <div className="text-sm font-medium text-[#4a5568] dark:text-slate-300 tabular-nums">
                {t('outgoing.pagination.info', {
                  from: startIndex + 1,
                  to: endIndex,
                  total: totalFiltered
                })}
              </div>

              {/* Page Controls */}
              <div className="flex items-center gap-2">
                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5 me-3">
                  <span className="text-xs font-semibold text-[#5f6b7d] dark:text-slate-400">{t('outgoing.pagination.itemsLabel')}</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-11 px-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-[#1a202c] dark:text-slate-100 tabular-nums focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Prev Page Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={clampedPage <= 1 || isFetching}
                  className="h-11 px-2.5 text-xs font-semibold rounded-lg border-slate-300 dark:border-slate-700 text-[#1a202c] dark:text-slate-100 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4 me-1 rtl:rotate-0 ltr:rotate-180" />
                  {t('common.previous')}
                </Button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && clampedPage > 3) {
                      pageNum = clampedPage - 2 + i;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }

                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={isFetching}
                        className={`h-11 w-11 text-xs font-bold tabular-nums rounded-lg transition-colors duration-200 ${
                          clampedPage === pageNum
                            ? 'bg-[#2c5282] text-white'
                            : 'border border-slate-300 dark:border-slate-700 text-[#2d3748] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <bdi dir="ltr">{pageNum}</bdi>
                      </button>
                    );
                  })}
                </div>

                {/* Next Page Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={clampedPage >= totalPages || isFetching}
                  className="h-11 px-2.5 text-xs font-semibold rounded-lg border-slate-300 dark:border-slate-700 text-[#1a202c] dark:text-slate-100 disabled:opacity-40"
                >
                  {t('common.next')}
                  <ChevronLeft className="h-4 w-4 ms-1 rtl:rotate-0 ltr:rotate-180" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog 1: Folder Classification Dialog (Archiver) */}
      {folderDoc && (
        <DocumentFolderDialog
          open={Boolean(folderDoc)}
          onOpenChange={(open) => {
            if (!open) setFolderDoc(null);
          }}
          document={folderDoc}
          documentType="outgoing"
          readOnly={!canOrganizeDocuments}
        />
      )}

      {/* Dialog 2: Delete Confirmation Dialog */}
      <AlertDialog 
        open={Boolean(deleteDoc)} 
        onOpenChange={(open) => {
          if (!open) setDeleteDoc(null);
        }}
      >
        <AlertDialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-start shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              {t('outgoing.delete.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              {t('outgoing.delete.description', {
                serialNumber: deleteDoc?.serialNumber,
                subject: deleteDoc?.subject
              })}
              <br />
              <span className="text-sm text-[#c53030] dark:text-red-400 block mt-2 font-medium">
                {t('outgoing.delete.warning')}
              </span>
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
              className="bg-[#e53e3e] hover:bg-[#c53030] text-white rounded-lg font-semibold text-base h-11 px-7 transition-colors duration-200 shadow-none inline-flex items-center gap-2"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('outgoing.delete.deleting')}</span>
                </>
              ) : (
                t('outgoing.delete.confirmButton')
              )}
            </AlertDialogAction>
            <AlertDialogCancel 
              className="rounded-lg font-medium text-base h-11 px-6 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              disabled={deleteMutation.isPending}
            >
              {t('common.cancel')}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog 3: Transfer / Dispatch Dialog (Transférer / توجيه) */}
      <Dialog 
        open={Boolean(transferDoc)} 
        onOpenChange={(open) => {
          if (!open) setTransferDoc(null);
        }}
      >
        <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-start shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-[#2c5282] dark:text-blue-300 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 flex items-center justify-center text-[#2c5282] dark:text-blue-300 shrink-0">
                <Share2 className="h-5 w-5" />
              </div>
              <span>{t('outgoing.transfer.title')}</span>
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              {t('outgoing.transfer.description', { serialNumber: transferDoc?.serialNumber })}
            </DialogDescription>
          </DialogHeader>

          {transferDoc && (
            <div className="space-y-5 py-3">
              {/* Document mini-summary */}
              <div className="p-4 bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-lg space-y-1.5 text-base">
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {t('outgoing.transfer.subjectLabel', { subject: transferDoc.subject })}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-4 tabular-nums">
                  <span>{t('outgoing.transfer.issueDateLabel', { date: formatLongDate(transferDoc.issueDate, isFr ? 'fr' : 'ar') })}</span>
                  <span>{t('outgoing.transfer.sourceLabel', { source: transferDoc.source?.name || t('outgoing.source.unspecified') })}</span>
                </div>
              </div>

              {/* Destination department */}
              <div className="space-y-2">
                <Label className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t('outgoing.transfer.targetDeptLabel')} <span className="text-red-600 dark:text-red-400">*</span>
                </Label>
                <Select value={transferTargetDept} onValueChange={setTransferTargetDept}>
                  <SelectTrigger className="h-11 text-base border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    <SelectValue placeholder={t('outgoing.transfer.targetDeptPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-slate-200/80 dark:border-slate-800 text-base">
                    {departments.map((dept) => (
                      <SelectItem key={dept._id} value={dept._id} className="text-base py-2">
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Instructions / Orientation note */}
              <div className="space-y-2">
                <Label className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t('outgoing.transfer.notesLabel')}
                </Label>
                <Textarea
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder={t('outgoing.transfer.notesPlaceholder')}
                  className="text-base border-slate-300 dark:border-slate-700 rounded-lg min-h-[100px] p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#2c5282]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800 mt-2">
            <Button
              type="button"
              onClick={handleTransferSubmit}
              disabled={isTransferSubmitting}
              className="h-11 px-7 bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg font-semibold text-base transition-colors duration-200 shadow-none"
            >
              {isTransferSubmitting ? t('outgoing.transfer.submitting') : t('outgoing.transfer.confirmButton')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTransferDoc(null)}
              className="h-11 px-6 rounded-lg font-medium text-base border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              disabled={isTransferSubmitting}
            >
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
        direction="outgoing"
      />

      <ScrollToTop />
    </div>
  );
};

export default OutgoingDocumentsPage;
