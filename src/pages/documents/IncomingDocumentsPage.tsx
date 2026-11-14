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
import { useAuth } from '@/contexts/AuthContext';
import { IncomingDocument, Department } from '@/types';
import { useYearPersistence } from '@/hooks/useYearPersistence';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import { getActivityUrgency } from '@/utils/activityUtils';
import DocumentFolderDialog from '@/components/documents/DocumentFolderDialog';
import AssignResponseDialog from '@/components/documents/AssignResponseDialog';
import AssignResponsibleDialog from '@/components/documents/AssignResponsibleDialog';
import DocumentPreviewModal from '@/components/documents/DocumentPreviewModal';
import ScrollToTop from '@/components/common/ScrollToTop';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { usePdfExport } from '@/hooks/usePdfExport';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { exportToCsv } from '@/utils/exportCsv';

const IncomingDocumentsPage: React.FC = () => {
  const { t } = useTranslation();
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
  const [sortBy, setSortBy] = useLocalStorageState<string>('incomingDocs_sortBy', 'newest-arrival');
  const [sortField, setSortField] = useLocalStorageState<string>('incomingDocs_sortField', 'arrivalDate');
  const [sortDirection, setSortDirection] = useLocalStorageState<'asc' | 'desc'>('incomingDocs_sortDirection', 'desc');

  const handleTableSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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

  const canAddDocuments = isAdmin || isAdminTuningDesk;
  const canEdit = isAdmin || isAdminTuningDesk;
  const canDelete = isAdmin || isAdminTuningDesk;
  const canOrganizeDocuments = isAdminDepartment;
  const canViewCategorization = isAdmin || isDirector || isAdminTuningDesk || isAdminDepartment || currentUser?.role === 'User';
  const canAssignOrRespond = isAdminDepartment || isAdmin || isAdminTuningDesk;

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

  // Server-paginated documents query
  const {
    data: docsResponse,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['incomingDocuments', selectedYear, selectedDepartment, selectedSource, currentPage, pageSize, debouncedSearch],
    queryFn: () => getIncomingDocuments({
      year: selectedYear,
      department: selectedDepartment === 'all' ? undefined : selectedDepartment,
      source: selectedSource === 'all_sources' ? undefined : selectedSource,
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

  // Filter documents on current page (status filter)
  const filteredDocuments = useMemo(() => {
    return (documents as IncomingDocument[]).filter((doc: IncomingDocument) => {
      // Status filter
      if (statusFilter === 'pending' && doc.answer) return false;
      if (statusFilter === 'answered' && !doc.answer) return false;
      if (statusFilter === 'urgent') {
        const urgency = getActivityUrgency(doc);
        if (!urgency || (urgency.type !== 'overdue' && urgency.type !== 'today' && urgency.type !== 'tomorrow')) {
          return false;
        }
      }

      return true;
    });
  }, [documents, statusFilter]);

  // Sort documents on current page
  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'serialNumber') {
        valA = Number(a.serialNumber) || 0;
        valB = Number(b.serialNumber) || 0;
      } else if (sortField === 'arrivalDate') {
        valA = a.arrivalDate ? new Date(a.arrivalDate).getTime() : 0;
        valB = b.arrivalDate ? new Date(b.arrivalDate).getTime() : 0;
      } else if (sortField === 'subject') {
        valA = (a.subject || '').toLowerCase();
        valB = (b.subject || '').toLowerCase();
      } else if (sortField === 'status') {
        valA = a.answer ? 1 : 0;
        valB = b.answer ? 1 : 0;
      } else {
        if (sortBy === 'newest-arrival') {
          return new Date(b.arrivalDate || 0).getTime() - new Date(a.arrivalDate || 0).getTime();
        }
        if (sortBy === 'oldest-arrival') {
          return new Date(a.arrivalDate || 0).getTime() - new Date(b.arrivalDate || 0).getTime();
        }
        if (sortBy === 'serial-desc') {
          return (Number(b.serialNumber) || 0) - (Number(a.serialNumber) || 0);
        }
        if (sortBy === 'serial-asc') {
          return (Number(a.serialNumber) || 0) - (Number(b.serialNumber) || 0);
        }
        return 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredDocuments, sortField, sortDirection, sortBy]);

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
      arrivalDate: formatArabicDate(doc.arrivalDate),
      subject: doc.subject || '',
      source: doc.source || t('incoming.source.unspecified'),
      typeDocument: doc.typeDocument || t('incoming.type.general'),
      status: doc.answer ? t('incoming.status.answered') : t('incoming.status.pending'),
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

  // Status stats
  const answeredCount = documents.filter((d: IncomingDocument) => Boolean(d.answer)).length;
  const pendingCount = documents.length - answeredCount;

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
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-6 sm:p-8">
        <div className="max-w-xl mx-auto bg-white border border-[#e2e8f0] rounded p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded bg-[#ebf4ff] border border-[#bee3f8] text-[#2c5282] flex items-center justify-center mx-auto">
            <Calendar className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#1a202c]">{t('incoming.yearModal.title')}</h2>
          <p className="text-base text-[#4a5568] leading-relaxed">
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
              <Calendar className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-[#718096] h-4 w-4 pointer-events-none" />
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={yearInput}
                onChange={handleYearInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyYear();
                  }
                }}
                placeholder={new Date().getFullYear().toString()}
                maxLength={4}
                autoFocus
                className="w-40 h-12 pr-10 text-center text-lg font-bold border-[#cbd5e1] rounded focus:border-[#2c5282] bg-white"
              />
            </div>
            {yearInput.length > 0 && yearInput.length < 4 && (
              <p className="text-sm text-[#5f6b7d]">
                {t('incoming.yearModal.incomplete')}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={yearInput.length !== 4 || !/^\d{4}$/.test(yearInput)}
                className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200"
              >
                {t('incoming.yearModal.confirmButton')}
              </Button>
            </div>
            {/* Quick Year Shortcuts */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm font-medium text-[#5f6b7d]">{t('incoming.yearModal.quickYears')}</span>
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
                  className="px-2.5 py-1 text-xs font-semibold rounded border border-[#cbd5e1] bg-slate-50 hover:bg-[#ebf4ff] hover:text-[#2c5282] text-[#4a5568] transition-colors"
                >
                  {yr}
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
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="bg-white border border-[#e2e8f0] rounded shadow-sm overflow-hidden">
          <TableSkeleton columns={6} rows={8} />
        </div>
      </div>
    );
  }

  // Error view
  if (isError && isValidYear) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-6 sm:p-8">
        <div className="max-w-xl mx-auto bg-white border border-red-200 rounded p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#1a202c]">{t('incoming.error.title')}</h2>
          <p className="text-base text-[#4a5568] leading-relaxed">
            {t('incoming.error.description')}
          </p>
          <Button
            onClick={() => refetch()}
            className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200"
          >
            {t('incoming.error.retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Fil d'Ariane (Breadcrumbs) */}
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/dashboard" className="hover:text-[#2c5282] transition-colors">{t('common.home')}</Link>
        <ChevronLeft className="w-4 h-4 text-gray-400" />
        <span className="text-[#1a202c] font-medium">{t('incoming.page.breadcrumb')}</span>
      </nav>

      {/* 1. Page Header (En-tête) */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded bg-[#2c5282] text-white flex items-center justify-center flex-shrink-0">
            <FileInput className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2c5282] leading-normal flex items-center gap-2.5">
              {t('incoming.page.title')}
            </h1>
            <p className="text-base text-[#4a5568] leading-relaxed mt-1">
              {t('incoming.page.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Institutional Stats Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-base font-bold bg-[#FFCB56] text-[#1a202c] border border-[#FFD758]"
              title={t('incoming.stats.totalDocsTooltip')}
            >
              <Inbox className="h-4 w-4" />
              {t('incoming.stats.totalDocs', { count: totalCount })}
            </span>

            {isDirector && (
              <span 
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-base font-bold bg-[#FFD758] text-[#1a202c] border border-[#FFCB56] shadow-xs"
                title={t('incoming.stats.allDepartmentsTooltip')}
              >
                <Building2 className="h-4 w-4 text-[#1a202c]" />
                {t('incoming.stats.allDepartments')}
              </span>
            )}

            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-base font-semibold bg-slate-100 text-[#1a202c] border border-slate-300"
              title={t('incoming.stats.activeYearTooltip')}
            >
              <Calendar className="h-4 w-4 text-[#2c5282]" />
              {t('incoming.stats.activeYear', { year: selectedYear })}
            </span>
          </div>

          {/* Export PDF Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleExportPdf}
            disabled={isExporting || sortedDocuments.length === 0}
            className="h-11 px-4 text-base font-semibold border-[#cbd5e1] text-[#2c5282] hover:bg-[#f7fafc] rounded transition-colors duration-200 flex items-center gap-2"
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
            onClick={() => exportToCsv('courriers-entrants.csv', documents)}
            disabled={documents.length === 0}
            className="h-11 px-4 text-base font-semibold border-[#cbd5e1] text-[#2c5282] hover:bg-[#f7fafc] rounded transition-colors duration-200 flex items-center gap-2"
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
            className="h-11 px-4 text-base font-semibold border-[#cbd5e1] text-[#2c5282] hover:bg-[#f7fafc] rounded transition-colors duration-200 flex items-center gap-2"
            title={t('common.refresh')}
          >
            <RotateCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{t('common.refresh')}</span>
          </Button>

          {/* Add Document Action Button */}
          {canAddDocuments && (
            <Button
              onClick={() => navigate('/dashboard/incoming-documents/create')}
              className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200 flex items-center gap-2"
            >
              <PlusCircle className="h-5 w-5" />
              <span>{t('incoming.actions.add')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Filters and Sorting Section (Filtres / Tri) */}
      <div className="bg-white border border-[#e2e8f0] rounded p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#718096] h-4 w-4 pointer-events-none" />
            <Input
              placeholder={t('incoming.filters.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 pr-10 text-base text-right border-[#cbd5e1] rounded bg-white focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200"
            />
          </div>

          {/* Year Filter */}
          <div>
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#718096] h-4 w-4 pointer-events-none" />
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
                className="h-11 pr-10 text-base text-center font-bold border-[#cbd5e1] rounded bg-white focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200"
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
              <SelectTrigger className="h-11 text-base text-right border-[#cbd5e1] rounded bg-white">
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
              <SelectTrigger className="h-11 text-base text-right border-[#cbd5e1] rounded bg-white">
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-3 border-t border-[#e2e8f0]">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Department Filter - AdminTuningDesk */}
            {currentUser?.role === 'AdminTuningDesk' && departments && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#4a5568] whitespace-nowrap">{t('incoming.filters.departmentLabel')}</span>
                <Select 
                  value={selectedDepartment} 
                  onValueChange={(val) => {
                    setSelectedDepartment(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 min-w-[180px] text-sm text-right border-[#cbd5e1] rounded bg-white">
                    <SelectValue placeholder={t('incoming.filters.departmentPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-sm">{t('incoming.filters.allDepartments')}</SelectItem>
                    {departments.map((dept) => (
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
              <span className="text-sm font-semibold text-[#4a5568] flex items-center gap-1.5 whitespace-nowrap">
                <ArrowUpDown className="h-4 w-4 text-[#2c5282]" />
                {t('incoming.sort.label')}
              </span>
              <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
                <SelectTrigger className="h-9 min-w-[170px] text-sm text-right border-[#cbd5e1] rounded bg-white">
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
                className="h-11 px-4 text-sm font-semibold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] border border-[#FFD758] rounded flex items-center gap-1.5 transition-colors duration-200"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#1a202c]" />
                <span>{t('incoming.filters.reset')}</span>
              </Button>
            )}
          </div>

          {/* Right controls: View Toggle and Live Fetch indicator */}
          <div className="flex items-center gap-3">
            {isFetching && (
              <span className="text-xs text-[#2c5282] font-semibold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('incoming.filters.refreshingData')}
              </span>
            )}

            {/* View Mode Toggle */}
            <div className="inline-flex items-center border border-[#cbd5e1] rounded overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-label={t('incoming.view.tableLabel')}
                className={`h-11 px-3.5 text-base flex items-center gap-1.5 transition-colors duration-200 ${
                  viewMode === 'table'
                    ? 'bg-[#2c5282] text-white'
                    : 'text-[#4a5568] hover:bg-gray-50'
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
                className={`h-11 px-3.5 text-base flex items-center gap-1.5 border-r border-[#cbd5e1] transition-colors duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-[#2c5282] text-white'
                    : 'text-[#4a5568] hover:bg-gray-50'
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
      <div className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6">
        {totalFiltered === 0 ? (
          /* Empty State */
          <div className="border border-[#e2e8f0] rounded p-8 sm:p-12 text-center bg-[#f7fafc] space-y-4">
            <div className="w-14 h-14 rounded bg-white border border-[#e2e8f0] flex items-center justify-center mx-auto text-[#5f6b7d]">
              <FileText className="h-7 w-7 text-[#2c5282]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1a202c]">{t('incoming.empty.title')}</h3>
              <p className="text-base text-[#4a5568] max-w-md mx-auto mt-1 leading-relaxed">
                {hasActiveFilters
                  ? t('incoming.empty.filtered')
                  : t('incoming.empty.noDocsYear', { year: selectedYear })}
              </p>
            </div>
            {hasActiveFilters && (
              <Button
                type="button"
                onClick={handleFilterReset}
                className="h-11 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200"
              >
                {t('incoming.empty.showAllYear', { year: selectedYear })}
              </Button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* TABULAR VIEW (AdminLTE style, 8h/day professional ergonomics) */
          <div className="overflow-x-auto border border-[#e2e8f0] rounded">
            <table className="w-full text-start border-collapse text-sm">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#2d3748]">
                  <th
                    className="p-0 font-bold text-sm whitespace-nowrap"
                    aria-sort={sortField === 'serialNumber' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      type="button"
                      onClick={() => handleTableSort('serialNumber')}
                      className="w-full min-h-[44px] py-3 px-4 flex items-center gap-1.5 font-bold text-sm text-start hover:bg-[#edf2f7] select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282] focus-visible:ring-inset"
                    >
                      <span>{t('incoming.table.serialNumber')}</span>
                      {sortField === 'serialNumber' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282]" />}
                      {sortField === 'serialNumber' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282]" />}
                      {sortField !== 'serialNumber' && <ChevronsUpDown className="w-4 h-4 text-gray-300" />}
                    </button>
                  </th>
                  <th
                    className="p-0 font-bold text-sm"
                    aria-sort={sortField === 'subject' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      type="button"
                      onClick={() => handleTableSort('subject')}
                      className="w-full min-h-[44px] py-3 px-4 flex items-center gap-1.5 font-bold text-sm text-start hover:bg-[#edf2f7] select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282] focus-visible:ring-inset"
                    >
                      <span>{t('incoming.table.subjectAndType')}</span>
                      {sortField === 'subject' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282]" />}
                      {sortField === 'subject' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282]" />}
                      {sortField !== 'subject' && <ChevronsUpDown className="w-4 h-4 text-gray-300" />}
                    </button>
                  </th>
                  <th
                    className="p-0 font-bold text-sm whitespace-nowrap"
                    aria-sort={sortField === 'arrivalDate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      type="button"
                      onClick={() => handleTableSort('arrivalDate')}
                      className="w-full min-h-[44px] py-3 px-4 flex items-center gap-1.5 font-bold text-sm text-start hover:bg-[#edf2f7] select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282] focus-visible:ring-inset"
                    >
                      <span>{t('incoming.table.arrivalDate')}</span>
                      {sortField === 'arrivalDate' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282]" />}
                      {sortField === 'arrivalDate' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282]" />}
                      {sortField !== 'arrivalDate' && <ChevronsUpDown className="w-4 h-4 text-gray-300" />}
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
                      className="w-full min-h-[44px] py-3 px-4 flex items-center gap-1.5 font-bold text-sm text-start hover:bg-[#edf2f7] select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282] focus-visible:ring-inset"
                    >
                      <span>{t('incoming.table.status')}</span>
                      {sortField === 'status' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282]" />}
                      {sortField === 'status' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282]" />}
                      {sortField !== 'status' && <ChevronsUpDown className="w-4 h-4 text-gray-300" />}
                    </button>
                  </th>
                  <th className="py-3 px-4 font-bold text-sm text-center">{t('incoming.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] bg-white">
                {paginatedDocuments.map((doc: IncomingDocument) => {
                  const urgency = getActivityUrgency(doc);

                  return (
                    <tr 
                      key={doc._id}
                      className="hover:bg-slate-50/80 transition-colors duration-200 min-h-[64px]"
                    >
                      {/* Serial Number & Year */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#2c5282] flex-shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-bold text-base text-[#1a202c]">
                              #{highlightMatch(String(doc.serialNumber), searchQuery)}
                            </span>
                            <span className="text-xs text-[#5f6b7d]">
                              {doc.year}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Subject, Document Type, Activity */}
                      <td className="py-3 px-4">
                        <div className="max-w-[340px] space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleView(doc._id)}
                            className="text-start font-bold text-base text-[#1a202c] hover:text-[#2c5282] cursor-pointer leading-relaxed transition-colors duration-200 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]"
                            title={doc.subject}
                          >
                            {highlightMatch(doc.subject, searchQuery)}
                          </button>

                          <div className="flex items-center gap-2 flex-wrap">
                            {doc.typeDocument && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-[#2d3748] border border-slate-300">
                                {doc.typeDocument}
                              </span>
                            )}

                            {doc.activity && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-[#2c5282] border border-blue-200">
                                <Bookmark className="h-3 w-3" />
                                {doc.activity}
                              </span>
                            )}

                            {urgency && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${urgency.badgeColor}`}>
                                <AlertTriangle className="h-3 w-3" />
                                {urgency.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Arrival Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-sm text-[#4a5568]">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="h-4 w-4 text-[#718096]" />
                          <span>{formatArabicDate(doc.arrivalDate)}</span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-sm font-normal text-[#2d3748]">
                          <Building2 className="h-4 w-4 text-[#718096] flex-shrink-0" />
                          <span className="line-clamp-1" title={doc.source || t('incoming.source.unspecified')}>
                            {highlightMatch(doc.source || t('incoming.source.unspecified'), searchQuery)}
                          </span>
                        </div>
                      </td>

                      {/* Follow-up / Answer Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {doc.answer ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 w-fit">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              {t('incoming.status.answered')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-amber-50 text-[#1a202c] border border-[#FFD758] w-fit">
                              <Clock className="h-3.5 w-3.5 text-[#d69e2e]" />
                              {t('incoming.status.pending')}
                            </span>
                          )}

                          {doc.responsibleUser && typeof doc.responsibleUser === 'object' && (
                            <span className="text-xs text-[#5f6b7d] flex items-center gap-1">
                              <Users className="h-3 w-3 text-[#718096]" />
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
                            className="h-11 min-h-[44px] px-3 text-xs font-semibold rounded text-[#2c5282] border-blue-200 bg-blue-50/60 hover:bg-blue-100 transition-colors duration-200"
                          >
                            <Eye className="h-3.5 w-3.5 me-1" />
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
                              className="h-11 min-h-[44px] px-3 text-xs font-bold rounded text-[#1a202c] border-[#FFD758] bg-amber-50 hover:bg-[#FFCB56] transition-colors duration-200"
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
                              title={t('incoming.actions.previewTooltip')}
                              className="h-11 min-h-[44px] px-3 text-xs font-semibold rounded text-amber-800 border-amber-300 bg-amber-50/60 hover:bg-amber-100 transition-colors duration-200"
                            >
                              <FileText className="h-3.5 w-3.5 me-1" />
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
                                  className="h-11 w-11 min-w-[44px] min-h-[44px] p-0 text-[#5f6b7d] hover:text-[#1a202c] hover:bg-gray-100 rounded"
                                  title={t('incoming.actions.more')}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 bg-white border border-[#e2e8f0] rounded shadow-sm">
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
                                    <FolderOpen className="me-2 h-4 w-4 text-[#4a5568]" />
                                    {t('incoming.actions.archive')}
                                  </DropdownMenuItem>
                                )}

                                {canAssignOrRespond && (
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

              return (
                <div
                  key={doc._id}
                  className="bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] rounded p-5 space-y-4 transition-colors duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Card Top: Serial and Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-bold bg-[#ebf4ff] text-[#2c5282] border border-[#bee3f8]">
                        #{doc.serialNumber} / {doc.year}
                      </span>

                      {doc.answer ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          {t('incoming.status.answeredBadge')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-[#1a202c] border border-[#FFD758]">
                          <Clock className="h-3 w-3 text-[#d69e2e]" />
                          {t('incoming.status.pending')}
                        </span>
                      )}
                    </div>

                    {/* Subject */}
                    <h3 className="text-lg font-bold leading-relaxed">
                      <button
                        type="button"
                        onClick={() => handleView(doc._id)}
                        className="text-start font-bold text-[#1a202c] hover:text-[#2c5282] cursor-pointer line-clamp-2 w-full rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]"
                        title={doc.subject}
                      >
                        {highlightMatch(doc.subject, searchQuery)}
                      </button>
                    </h3>

                    {/* Meta badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {doc.typeDocument && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-[#2d3748] border border-slate-300">
                          {doc.typeDocument}
                        </span>
                      )}
                      {doc.activity && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-[#2c5282] border border-blue-200">
                          {doc.activity}
                        </span>
                      )}
                      {urgency && (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${urgency.badgeColor}`}>
                          {urgency.label}
                        </span>
                      )}
                    </div>

                    {/* Source & Date Info */}
                    <div className="space-y-1.5 text-xs text-[#4a5568] pt-2 border-t border-[#f1f5f9]">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-[#718096]" />
                        <span className="truncate">{doc.source || t('incoming.source.unspecifiedSource')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#718096]" />
                        <span>{formatArabicDate(doc.arrivalDate)}</span>
                      </div>
                      {doc.responsibleUser && typeof doc.responsibleUser === 'object' && (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-[#718096]" />
                          <span>{t('incoming.responsible.label', { name: doc.responsibleUser.username })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons (2 primary actions + ... menu) */}
                  <div className="flex items-center gap-1.5 pt-3 border-t border-[#f1f5f9]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(doc._id)}
                      className="flex-1 h-11 min-h-[44px] text-xs font-semibold text-[#2c5282] border-blue-200 bg-blue-50/60 hover:bg-blue-100 rounded"
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
                        className="flex-1 h-11 min-h-[44px] text-xs font-bold text-[#1a202c] border-[#FFD758] bg-amber-50 hover:bg-[#FFCB56] rounded"
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
                        className="flex-1 h-11 min-h-[44px] text-xs font-semibold text-amber-800 border-amber-300 bg-amber-50/60 hover:bg-amber-100 rounded"
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
                            className="h-11 w-11 min-w-[44px] min-h-[44px] p-0 text-[#5f6b7d] hover:text-[#1a202c] hover:bg-gray-100 rounded shrink-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 bg-white border border-[#e2e8f0] rounded shadow-sm">
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
                              <FolderOpen className="me-2 h-4 w-4 text-[#4a5568]" />
                              {t('incoming.actions.archive')}
                            </DropdownMenuItem>
                          )}
                          {canAssignOrRespond && (
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
          <div className="pt-4 border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-base text-[#4a5568]">
              {t('incoming.pagination.info', {
                from: totalCount === 0 ? 0 : startIndex + 1,
                to: endIndex,
                total: totalFiltered
              })}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2 text-sm text-[#4a5568]">
                <span>{t('incoming.pagination.perPage')}</span>
                <Select 
                  value={pageSize.toString()} 
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-20 text-sm text-right border-[#cbd5e1] rounded bg-white">
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
                  className="h-11 px-3 text-sm font-medium border-[#cbd5e1] rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4 ml-1" />
                  {t('common.previous')}
                </Button>

                <span className="text-sm font-semibold text-[#1a202c] px-2">
                  {clampedPage} / {totalPages}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={clampedPage >= totalPages || isFetching}
                  className="h-11 px-3 text-sm font-medium border-[#cbd5e1] rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('common.next')}
                  <ChevronLeft className="h-4 w-4 mr-1" />
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
      {responsibleDoc && (
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
        <AlertDialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 shadow-sm">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl sm:text-2xl font-bold text-[#1a202c]">
              {t('incoming.delete.dialogTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-[#4a5568] leading-relaxed mt-2">
              {t('incoming.delete.confirmMessage', {
                serialNumber: deleteDoc?.serialNumber,
                year: deleteDoc?.year
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-6 pt-4 border-t border-[#e2e8f0]">
            <AlertDialogAction
              onClick={() => {
                if (deleteDoc) {
                  deleteMutation.mutate(deleteDoc._id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-base h-11 px-7 rounded shadow-none inline-flex items-center gap-2"
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
              className="border-[#cbd5e1] text-[#2d3748] hover:bg-gray-100 font-medium text-base h-11 px-6 rounded"
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
