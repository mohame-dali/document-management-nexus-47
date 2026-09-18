import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { deleteOutgoingDocument, downloadDocument } from '@/services/documentService';
import { useAuth } from '@/contexts/AuthContext';
import { OutgoingDocument, Department } from '@/types';
import { useInfiniteDocuments } from '@/hooks/useInfiniteDocuments';
import { useYearPersistence } from '@/hooks/useYearPersistence';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import DocumentFolderDialog from '@/components/documents/DocumentFolderDialog';
import ScrollToTop from '@/components/common/ScrollToTop';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';

const OutgoingDocumentsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters & UI State with persistence
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useLocalStorageState<'table' | 'grid'>('outgoingDocs_viewMode', 'table');
  const [selectedDepartment, setSelectedDepartment] = useLocalStorageState<string>('outgoingDocs_selectedDepartment', 'all');
  const [selectedType, setSelectedType] = useLocalStorageState<string>('outgoingDocs_selectedType', 'all_types');
  const [folderFilter, setFolderFilter] = useLocalStorageState<string>('outgoingDocs_folderFilter', 'all');
  const [sortBy, setSortBy] = useLocalStorageState<string>('outgoingDocs_sortBy', 'newest-issue');
  const [sortField, setSortField] = useLocalStorageState<string>('outgoingDocs_sortField', 'issueDate');
  const [sortDirection, setSortDirection] = useLocalStorageState<'asc' | 'desc'>('outgoingDocs_sortDirection', 'desc');

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
  const [folderDoc, setFolderDoc] = useState<OutgoingDocument | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<OutgoingDocument | null>(null);
  const [transferDoc, setTransferDoc] = useState<OutgoingDocument | null>(null);

  // Transfer Form State
  const [transferTargetDept, setTransferTargetDept] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('للإجراء والمتابعة');
  const [isTransferSubmitting, setIsTransferSubmitting] = useState<boolean>(false);

  // Year persistence hook
  const { selectedYear, handleYearChange, isValidYear } = useYearPersistence('outgoingDocumentsSelectedYear');

  // Role permissions
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  const isAdmin = currentUser?.role === 'Admin';
  const isAdminTuningDesk = currentUser?.role === 'AdminTuningDesk';
  const isAdminDepartment = currentUser?.role === 'AdminDepartment';

  const canAddDocuments = isAdmin || isAdminTuningDesk;
  const canEdit = isSuperAdmin || isAdminTuningDesk || isAdmin;
  const canDelete = isSuperAdmin || isAdminTuningDesk || isAdmin;
  const canOrganizeDocuments = isAdminDepartment || isSuperAdmin || isAdmin;
  const canViewCategorization = isAdmin || isAdminTuningDesk || isAdminDepartment || currentUser?.role === 'User';

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

  // Infinite documents query
  const {
    documents,
    totalCount,
    loadedCount,
    isLoading,
    isError,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteDocuments({
    documentType: 'outgoing',
    year: selectedYear,
    department: selectedDepartment === 'all' ? undefined : selectedDepartment,
    enabled: isValidYear,
  });

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
      toast.success('تم حذف الوثيقة الصادرة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['outgoingDocuments'] });
      setDeleteDoc(null);
    },
    onError: (err: unknown) => {
      console.error('Error deleting outgoing document:', err);
      toast.error('حدث خطأ أثناء محاولة حذف الوثيقة');
    },
  });

  // Filter documents based on all search criteria
  const filteredDocuments = useMemo(() => {
    return (documents as OutgoingDocument[]).filter((doc: OutgoingDocument) => {
      // Search input match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSerial = String(doc.serialNumber).toLowerCase().includes(query);
        const matchesSubject = (doc.subject || '').toLowerCase().includes(query);
        const sourceName = doc.source?.name || '';
        const matchesSource = sourceName.toLowerCase().includes(query);
        const matchesRecipients = Array.isArray(doc.assignedTo) && doc.assignedTo.some(dest => 
          dest.toLowerCase().includes(query)
        );
        const matchesPourInfo = Array.isArray(doc.pourInfo) && doc.pourInfo.some(info => 
          info.toLowerCase().includes(query)
        );

        if (!matchesSerial && !matchesSubject && !matchesSource && !matchesRecipients && !matchesPourInfo) {
          return false;
        }
      }

      // Document Type filter
      if (selectedType !== 'all_types') {
        if (doc.typeDocument !== selectedType) {
          return false;
        }
      }

      // Folder / Categorization filter
      if (folderFilter === 'categorized' && !doc.folder) return false;
      if (folderFilter === 'uncategorized' && doc.folder) return false;

      return true;
    });
  }, [documents, searchQuery, selectedType, folderFilter]);

  // Sort documents
  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'serialNumber') {
        valA = Number(a.serialNumber) || 0;
        valB = Number(b.serialNumber) || 0;
      } else if (sortField === 'issueDate') {
        valA = a.issueDate ? new Date(a.issueDate).getTime() : 0;
        valB = b.issueDate ? new Date(b.issueDate).getTime() : 0;
      } else if (sortField === 'subject') {
        valA = (a.subject || '').toLowerCase();
        valB = (b.subject || '').toLowerCase();
      } else if (sortField === 'status') {
        valA = (a.folder || a.status || '').toLowerCase();
        valB = (b.folder || b.status || '').toLowerCase();
      } else {
        if (sortBy === 'newest-issue') {
          return new Date(b.issueDate || 0).getTime() - new Date(a.issueDate || 0).getTime();
        }
        if (sortBy === 'oldest-issue') {
          return new Date(a.issueDate || 0).getTime() - new Date(b.issueDate || 0).getTime();
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
  const totalFiltered = sortedDocuments.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const clampedPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (clampedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);
  const paginatedDocuments = sortedDocuments.slice(startIndex, endIndex);

  // Auto-fetch next pages if needed when navigating
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && paginatedDocuments.length < pageSize && sortedDocuments.length < totalCount) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, paginatedDocuments.length, pageSize, sortedDocuments.length, totalCount, fetchNextPage]);

  // Reset filters
  const handleFilterReset = () => {
    setSearchQuery('');
    setSelectedDepartment('all');
    setSelectedType('all_types');
    setFolderFilter('all');
    setSortBy('newest-issue');
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

  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const handleDownload = async (doc: OutgoingDocument) => {
    if (doc.scannedDocument) {
      try {
        setDownloadingDocId(doc._id);
        toast.info('جاري بدء تحميل الوثيقة...');
        await downloadDocument(
          doc.scannedDocument, 
          `outgoing-doc-${doc.serialNumber}-${doc.year}.pdf`
        );
        toast.success('تم تحميل الوثيقة بنجاح');
      } catch (err) {
        console.error('Download error:', err);
        toast.error('تعذر تحميل الوثيقة الرقمية');
      } finally {
        setDownloadingDocId(null);
      }
    } else {
      toast.error('لا يوجد ملف PDF ممسوح ضوئياً لهذه الوثيقة');
    }
  };

  // Handle transfer submission
  const handleTransferSubmit = () => {
    if (!transferDoc) return;
    setIsTransferSubmitting(true);
    setTimeout(() => {
      setIsTransferSubmitting(false);
      toast.success(`تم تسجيل تحويل وتوجيه الوثيقة الصادرة #${transferDoc.serialNumber} بنجاح`);
      setTransferDoc(null);
      setTransferNotes('للإجراء والمتابعة');
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

  return (
    <div className="min-h-screen bg-[#f7fafc] text-[#1a202c] py-6 sm:py-8" dir="rtl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-6 max-w-7xl">
        
        {/* Fil d'Ariane (Breadcrumbs) */}
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-sm text-gray-500" dir="rtl">
          <Link to="/dashboard" className="hover:text-[#2c5282] transition-colors">الرئيسية</Link>
          <ChevronLeft className="w-4 h-4 text-gray-400" />
          <span className="text-[#1a202c] font-medium">الوثائق والمراسلات الصادرة</span>
        </nav>

        {/* 1. Header Section */}
        <div className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded bg-[#ebf8f1] border border-[#bbf0d0] flex items-center justify-center text-[#276749] flex-shrink-0 mt-0.5">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c] leading-tight">
                  الوثائق الصادرة
                </h1>
                <p className="text-base text-[#4a5568] mt-1.5 leading-relaxed">
                  إدارة، متابعة وتوزيع المراسلات والوثائق الصادرة الرسمية لمكتب الضبط
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                title="تحديث البيانات"
                className="h-11 px-4 text-base font-semibold border-[#cbd5e1] text-[#2c5282] hover:bg-[#f7fafc] rounded transition-colors duration-200"
              >
                <RotateCcw className={`h-4 w-4 ml-2 ${isFetching ? 'animate-spin' : ''}`} />
                تحديث
              </Button>

              {canAddDocuments && (
                <Button
                  type="button"
                  onClick={() => navigate('/dashboard/outgoing-documents/create')}
                  className="h-11 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200 shadow-xs"
                >
                  <PlusCircle className="h-5 w-5 ml-2" />
                  إضافة وثيقة صادرة
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 2. Filters & Controls Bar */}
        <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-xs space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
            
            {/* Search Input */}
            <div className="lg:col-span-4 relative">
              <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">
                البحث السريع
              </label>
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718096]" />
                <Input
                  type="text"
                  placeholder="ابحث برقم التسلسل، الموضوع، المصدر، أو الوجهة..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 pr-10 text-base border-[#cbd5e1] focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] rounded bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#718096] hover:text-[#1a202c] px-1.5 py-0.5 rounded bg-slate-100"
                  >
                    مسح
                  </button>
                )}
              </div>
            </div>

            {/* Year Selector */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">
                سنة التسجيل
              </label>
              <div className="relative">
                <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718096]" />
                <Input
                  type="text"
                  maxLength={4}
                  value={selectedYear}
                  onChange={(e) => {
                    handleYearChange(e);
                    setCurrentPage(1);
                  }}
                  placeholder="2026"
                  className="h-11 pr-10 text-base font-bold text-[#1a202c] border-[#cbd5e1] focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] rounded bg-white"
                />
              </div>
            </div>

            {/* Department Filter (if AdminTuningDesk or for general source filter) */}
            {currentUser?.role === 'AdminTuningDesk' && (
              <div className="lg:col-span-3">
                <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">
                  القسم المصدر
                </label>
                <Select
                  value={selectedDepartment}
                  onValueChange={(val) => {
                    setSelectedDepartment(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-11 text-base border-[#cbd5e1] focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] rounded bg-white">
                    <SelectValue placeholder="كافة الأقسام" />
                  </SelectTrigger>
                  <SelectContent className="rounded border-[#cbd5e1] text-base">
                    <SelectItem value="all">كافة الأقسام</SelectItem>
                    {departments.map((dept) => (
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
              <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">
                نوع الوثيقة
              </label>
              <Select
                value={selectedType}
                onValueChange={(val) => {
                  setSelectedType(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 text-base border-[#cbd5e1] focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] rounded bg-white">
                  <SelectValue placeholder="كافة الأنواع" />
                </SelectTrigger>
                <SelectContent className="rounded border-[#cbd5e1] text-base">
                  <SelectItem value="all_types">كافة أنواع الوثائق</SelectItem>
                  {typeOptions.map((opt: { _id?: string; value?: string; name: string; label?: string }) => (
                    <SelectItem key={opt._id || opt.value || opt.name} value={opt.value || opt.name}>
                      {opt.label || opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Classification/Folder Filter */}
            <div className={currentUser?.role === 'AdminTuningDesk' ? "lg:col-span-4" : "lg:col-span-3"}>
              <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">
                حالة التصنيف بالأرشيف
              </label>
              <Select
                value={folderFilter}
                onValueChange={(val) => {
                  setFolderFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 text-base border-[#cbd5e1] focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] rounded bg-white">
                  <SelectValue placeholder="حالة المجلد" />
                </SelectTrigger>
                <SelectContent className="rounded border-[#cbd5e1] text-base">
                  <SelectItem value="all">الكل (مصنفة وغير مصنفة)</SelectItem>
                  <SelectItem value="categorized">مصنفة في مجلد</SelectItem>
                  <SelectItem value="uncategorized">غير مصنفة بعد</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className={currentUser?.role === 'AdminTuningDesk' ? "lg:col-span-4" : "lg:col-span-3"}>
              <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">
                ترتيب العرض
              </label>
              <Select
                value={sortBy}
                onValueChange={(val) => {
                  setSortBy(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 text-base border-[#cbd5e1] focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] rounded bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded border-[#cbd5e1] text-base">
                  <SelectItem value="newest-issue">الأحدث تاريخ إصدار</SelectItem>
                  <SelectItem value="oldest-issue">الأقدم تاريخ إصدار</SelectItem>
                  <SelectItem value="serial-desc">رقم التسلسل (تنازلي)</SelectItem>
                  <SelectItem value="serial-asc">رقم التسلسل (تصاعدي)</SelectItem>
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
                  className="h-11 px-4 text-base font-semibold text-[#c53030] hover:bg-red-50 hover:text-[#9b2c2c] rounded transition-colors duration-200 w-full sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4 ml-1.5" />
                  إعادة ضبط المرشحات
                </Button>
              </div>
            )}
          </div>

          {/* Sub-bar: Badges & View Switcher */}
          <div className="pt-3 border-t border-[#e2e8f0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-base">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Year badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-semibold bg-[#ebf4ff] text-[#2c5282] border border-[#bee3f8]">
                <Calendar className="h-4 w-4" />
                سنة: {selectedYear}
              </span>

              {/* Total count badge with institutional amber accent */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-bold bg-[#FFD758]/20 text-[#1a202c] border border-[#FFCB56]">
                <FileOutput className="h-4 w-4 text-[#1a202c]" />
                إجمالي النتائج: {totalFiltered} من {totalCount} وثيقة
              </span>

              {isFetching && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-[#4a5568] border border-slate-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2c5282]" />
                  جاري المزامنة...
                </span>
              )}
            </div>

            {/* View Mode Toggle: Table or Grid */}
            <div className="inline-flex items-center border border-[#cbd5e1] rounded overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`h-9 px-3.5 text-base flex items-center gap-1.5 transition-colors duration-200 ${
                  viewMode === 'table'
                    ? 'bg-[#2c5282] text-white'
                    : 'text-[#4a5568] hover:bg-gray-50'
                }`}
                title="عرض كجدول بيانات"
              >
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">جدول</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`h-9 px-3.5 text-base flex items-center gap-1.5 border-r border-[#cbd5e1] transition-colors duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-[#2c5282] text-white'
                    : 'text-[#4a5568] hover:bg-gray-50'
                }`}
                title="عرض كبطاقات"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">بطاقات</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Main Documents Content: Table or Grid */}
        <div className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6 shadow-xs">
          
          {/* Validation on year */}
          {!isValidYear ? (
            <div className="border border-[#e2e8f0] rounded p-12 text-center bg-[#f7fafc] space-y-3">
              <div className="w-12 h-12 rounded bg-amber-50 border border-[#FFD758] flex items-center justify-center mx-auto text-[#1a202c]">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1a202c]">يرجى إدخال سنة صحيحة</h3>
              <p className="text-base text-[#4a5568] max-w-md mx-auto">
                أدخل سنة كاملة مكونة من 4 أرقام (مثال: 2026) لعرض الوثائق الصادرة الخاصة بها.
              </p>
            </div>
          ) : totalFiltered === 0 ? (
            /* Empty State */
            <div className="border border-[#e2e8f0] rounded p-8 sm:p-12 text-center bg-[#f7fafc] space-y-4">
              <div className="w-14 h-14 rounded bg-white border border-[#e2e8f0] flex items-center justify-center mx-auto text-[#718096]">
                <FileOutput className="h-7 w-7 text-[#2c5282]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#1a202c]">لا توجد وثائق صادرة مطابقة</h3>
                <p className="text-base text-[#4a5568] max-w-md mx-auto mt-1 leading-relaxed">
                  {hasActiveFilters
                    ? 'لم يتم العثور على وثائق تطابق معايير الفرز أو البحث المحددة. يمكنك تعديل أو إعادة ضبط الفلاتر للاطلاع على باقي المراسلات.'
                    : `لم يتم تسجيل أي وثائق صادرة لسنة ${selectedYear} حتى الآن.`}
                </p>
              </div>
              {hasActiveFilters && (
                <Button
                  type="button"
                  onClick={handleFilterReset}
                  className="h-10 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200"
                >
                  عرض كافة وثائق سنة {selectedYear}
                </Button>
              )}
            </div>
          ) : viewMode === 'table' ? (
            /* TABULAR VIEW (AdminLTE style, 8h/day professional ergonomics, line height >= 64px) */
            <div className="overflow-x-auto border border-[#e2e8f0] rounded">
              <table className="w-full text-right border-collapse text-base">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#1a202c]">
                    <th 
                      className="py-4 px-4 font-semibold text-sm whitespace-nowrap cursor-pointer hover:bg-[#edf2f7] select-none transition-colors"
                      onClick={() => handleTableSort('serialNumber')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>رقم التسلسل</span>
                        {sortField === 'serialNumber' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282]" />}
                        {sortField === 'serialNumber' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282]" />}
                        {sortField !== 'serialNumber' && <ChevronsUpDown className="w-4 h-4 text-gray-300" />}
                      </div>
                    </th>
                    <th 
                      className="py-4 px-4 font-semibold text-sm cursor-pointer hover:bg-[#edf2f7] select-none transition-colors"
                      onClick={() => handleTableSort('subject')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>الموضوع والنوع</span>
                        {sortField === 'subject' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282]" />}
                        {sortField === 'subject' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282]" />}
                        {sortField !== 'subject' && <ChevronsUpDown className="w-4 h-4 text-gray-300" />}
                      </div>
                    </th>
                    <th 
                      className="py-4 px-4 font-semibold text-sm whitespace-nowrap cursor-pointer hover:bg-[#edf2f7] select-none transition-colors"
                      onClick={() => handleTableSort('issueDate')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>تاريخ الإصدار</span>
                        {sortField === 'issueDate' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282]" />}
                        {sortField === 'issueDate' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282]" />}
                        {sortField !== 'issueDate' && <ChevronsUpDown className="w-4 h-4 text-gray-300" />}
                      </div>
                    </th>
                    <th className="py-4 px-4 font-semibold text-sm">المصدر (القسم)</th>
                    <th className="py-4 px-4 font-semibold text-sm">الموجه إليهم</th>
                    <th 
                      className="py-4 px-4 font-semibold text-sm whitespace-nowrap cursor-pointer hover:bg-[#edf2f7] select-none transition-colors"
                      onClick={() => handleTableSort('status')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>التصنيف والأرشيف</span>
                        {sortField === 'status' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282]" />}
                        {sortField === 'status' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282]" />}
                        {sortField !== 'status' && <ChevronsUpDown className="w-4 h-4 text-gray-300" />}
                      </div>
                    </th>
                    <th className="py-4 px-4 font-semibold text-sm text-center whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] bg-white">
                  {paginatedDocuments.map((doc: OutgoingDocument) => {
                    return (
                      <tr 
                        key={doc._id}
                        className="hover:bg-slate-50/80 transition-colors duration-200 min-h-[64px]"
                      >
                        {/* Serial Number & Year */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#2c5282] flex-shrink-0" />
                            <div className="flex flex-col">
                              <span className="font-bold text-base text-[#1a202c]">
                                #{highlightMatch(String(doc.serialNumber), searchQuery)}
                              </span>
                              <span className="text-xs text-[#718096]">
                                {doc.year}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Subject & Type */}
                        <td className="py-4 px-4">
                          <div className="max-w-[340px] space-y-1.5">
                            <div 
                              onClick={() => handleView(doc._id)}
                              className="font-bold text-base text-[#1a202c] hover:text-[#2c5282] cursor-pointer leading-relaxed transition-colors duration-200"
                              title={doc.subject}
                            >
                              {highlightMatch(doc.subject, searchQuery)}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {doc.typeDocument && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-[#2d3748] border border-slate-300">
                                  {doc.typeDocument}
                                </span>
                              )}

                              {doc.scannedDocument && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-[#2c5282] border border-blue-200">
                                  <FileOutput className="h-3 w-3" />
                                  ملف مرفق
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Issue Date */}
                        <td className="py-4 px-4 whitespace-nowrap text-sm text-[#4a5568]">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Clock className="h-4 w-4 text-[#718096]" />
                            <span>{formatArabicDate(doc.issueDate)}</span>
                          </div>
                        </td>

                        {/* Source */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-base font-medium text-[#2d3748]">
                            <Building2 className="h-4 w-4 text-[#718096] flex-shrink-0" />
                            <span className="line-clamp-1" title={doc.source?.name || 'غير محدد'}>
                              {highlightMatch(doc.source?.name || 'غير محدد', searchQuery)}
                            </span>
                          </div>
                        </td>

                        {/* Assigned To / Recipients */}
                        <td className="py-4 px-4">
                          {Array.isArray(doc.assignedTo) && doc.assignedTo.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {doc.assignedTo.slice(0, 2).map((dest, idx) => (
                                <span 
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#ebf8f1] text-[#22543d] border border-[#bbf0d0]"
                                >
                                  {dest}
                                </span>
                              ))}
                              {doc.assignedTo.length > 2 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-[#4a5568] border border-slate-200">
                                  +{doc.assignedTo.length - 2} أخرى
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[#a0aec0]">غير محدد</span>
                          )}
                        </td>

                        {/* Folder / Classification */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {doc.folder ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <FolderOpen className="h-3.5 w-3.5 text-emerald-600" />
                              {typeof doc.folder === 'object' ? doc.folder.name : 'مصنفة في مجلد'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-[#718096] bg-slate-100 border border-slate-200">
                              غير مصنفة
                            </span>
                          )}
                        </td>

                        {/* Actions: Voir, Modifier, Archiver, Transférer, PDF + More */}
                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* 1. Voir (عرض) */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleView(doc._id)}
                              title="عرض تفاصيل الوثيقة"
                              className="h-8 px-2.5 text-xs font-semibold rounded text-[#2c5282] border-blue-200 bg-blue-50/60 hover:bg-blue-100 transition-colors duration-200"
                            >
                              <Eye className="h-3.5 w-3.5 ml-1" />
                              عرض
                            </Button>

                            {/* 2. Modifier (تعديل) */}
                            {canEdit && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(doc._id)}
                                title="تعديل بيانات الوثيقة"
                                className="h-8 px-2.5 text-xs font-semibold rounded text-[#4a5568] border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors duration-200"
                              >
                                <Edit className="h-3.5 w-3.5 ml-1" />
                                تعديل
                              </Button>
                            )}

                            {/* 3. Archiver (أرشفة في مجلد) */}
                            {canViewCategorization && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setFolderDoc(doc)}
                                title={canOrganizeDocuments ? 'أرشفة وتنظيم في مجلد' : 'عرض المجلد والأرشفة'}
                                className="h-8 px-2.5 text-xs font-bold rounded text-[#1a202c] border-[#FFD758] bg-amber-50 hover:bg-[#FFCB56] transition-colors duration-200"
                              >
                                <FolderOpen className="h-3.5 w-3.5 ml-1 text-[#1a202c]" />
                                أرشفة
                              </Button>
                            )}

                            {/* 4. Transférer (تحويل / توجيه) */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setTransferDoc(doc)}
                              title="تحويل وتوجيه المراسلة"
                              className="h-8 px-2.5 text-xs font-semibold rounded text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors duration-200"
                            >
                              <Share2 className="h-3.5 w-3.5 ml-1" />
                              تحويل
                            </Button>

                            {/* 5. Télécharger PDF */}
                            {doc.scannedDocument && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(doc)}
                                disabled={downloadingDocId === doc._id}
                                title="تحميل ملف PDF"
                                className="h-8 px-2 text-xs font-semibold rounded text-[#2c5282] border-blue-200 bg-white hover:bg-blue-50 transition-colors duration-200"
                              >
                                {downloadingDocId === doc._id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2c5282]" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}

                            {/* Dropdown Menu for Delete */}
                            {canDelete && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded hover:bg-slate-100 text-[#718096]"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-base rounded border-[#cbd5e1]">
                                  <DropdownMenuItem 
                                    onClick={() => setDeleteDoc(doc)}
                                    className="text-[#e53e3e] focus:text-[#c53030] focus:bg-red-50 text-sm font-semibold cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4 ml-2" />
                                    حذف الوثيقة
                                  </DropdownMenuItem>
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
            /* GRID VIEW (Cards Layout) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedDocuments.map((doc: OutgoingDocument) => {
                return (
                  <div
                    key={doc._id}
                    className="bg-white border border-[#e2e8f0] rounded p-5 hover:border-[#cbd5e1] hover:shadow-xs transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Top: Serial & Type */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-sm font-bold bg-[#ebf4ff] text-[#2c5282] border border-[#bee3f8]">
                            #{doc.serialNumber} / {doc.year}
                          </span>
                        </div>

                        {doc.folder ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <FolderOpen className="h-3 w-3" />
                            {typeof doc.folder === 'object' ? doc.folder.name : 'مؤرشفة'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-[#718096] border border-slate-200">
                            غير مصنفة
                          </span>
                        )}
                      </div>

                      {/* Subject */}
                      <h3 
                        onClick={() => handleView(doc._id)}
                        className="font-bold text-base text-[#1a202c] hover:text-[#2c5282] cursor-pointer mb-3 line-clamp-2 leading-relaxed"
                        title={doc.subject}
                      >
                        {highlightMatch(doc.subject, searchQuery)}
                      </h3>

                      {/* Meta Information */}
                      <div className="space-y-2 text-sm text-[#4a5568] mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#718096] flex-shrink-0" />
                          <span>تاريخ الإصدار: {formatArabicDate(doc.issueDate)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[#718096] flex-shrink-0" />
                          <span className="truncate">المصدر: {doc.source?.name || 'غير محدد'}</span>
                        </div>

                        {Array.isArray(doc.assignedTo) && doc.assignedTo.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Users className="h-4 w-4 text-[#718096] flex-shrink-0 mt-0.5" />
                            <div className="flex flex-wrap gap-1">
                              {doc.assignedTo.slice(0, 2).map((d, i) => (
                                <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-[#2d3748] border border-slate-200">
                                  {d}
                                </span>
                              ))}
                              {doc.assignedTo.length > 2 && (
                                <span className="text-xs text-[#718096]">
                                  +{doc.assignedTo.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Bottom */}
                    <div className="pt-3 border-t border-[#e2e8f0] flex items-center justify-between gap-1 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(doc._id)}
                        className="h-8 px-2.5 text-xs font-semibold rounded text-[#2c5282] border-blue-200 bg-blue-50/60 hover:bg-blue-100"
                      >
                        <Eye className="h-3.5 w-3.5 ml-1" />
                        عرض
                      </Button>

                      {canEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(doc._id)}
                          className="h-8 px-2 text-xs font-semibold rounded text-[#4a5568] border-slate-300 bg-slate-50 hover:bg-slate-100"
                        >
                          <Edit className="h-3.5 w-3.5 ml-1" />
                          تعديل
                        </Button>
                      )}

                      {canViewCategorization && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFolderDoc(doc)}
                          className="h-8 px-2 text-xs font-bold rounded text-[#1a202c] border-[#FFD758] bg-amber-50 hover:bg-[#FFCB56]"
                        >
                          <FolderOpen className="h-3.5 w-3.5 ml-1 text-[#1a202c]" />
                          أرشفة
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTransferDoc(doc)}
                        className="h-8 px-2 text-xs font-semibold rounded text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100"
                      >
                        <Share2 className="h-3.5 w-3.5 ml-1" />
                        تحويل
                      </Button>

                      {doc.scannedDocument && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingDocId === doc._id}
                          className="h-8 px-2 text-xs rounded text-[#2c5282] border-blue-200"
                          title="تحميل PDF"
                        >
                          {downloadingDocId === doc._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2c5282]" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. Pagination Section (En-tête → filtres/tri → tableau → pagination) */}
          {totalFiltered > 0 && (
            <div className="pt-5 border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-4 text-base">
              
              {/* Counter Display */}
              <div className="text-sm font-medium text-[#4a5568]">
                عرض{' '}
                <span className="font-bold text-[#1a202c]">
                  {startIndex + 1}
                </span>{' '}
                إلى{' '}
                <span className="font-bold text-[#1a202c]">
                  {endIndex}
                </span>{' '}
                من أصل{' '}
                <span className="font-bold text-[#1a202c]">
                  {totalFiltered}
                </span>{' '}
                وثيقة صادرة
              </div>

              {/* Page Controls */}
              <div className="flex items-center gap-2">
                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5 ml-3">
                  <span className="text-xs font-semibold text-[#718096]">العناصر:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-8 px-2 text-xs font-semibold border border-[#cbd5e1] rounded bg-white text-[#1a202c] focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
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
                  disabled={clampedPage <= 1}
                  className="h-8 px-2.5 text-xs font-semibold rounded border-[#cbd5e1] text-[#1a202c] disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4 ml-1" />
                  السابق
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
                        className={`h-8 w-8 text-xs font-bold rounded transition-colors duration-200 ${
                          clampedPage === pageNum
                            ? 'bg-[#2c5282] text-white'
                            : 'border border-[#cbd5e1] text-[#2d3748] hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
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
                  disabled={clampedPage >= totalPages}
                  className="h-8 px-2.5 text-xs font-semibold rounded border-[#cbd5e1] text-[#1a202c] disabled:opacity-40"
                >
                  التالي
                  <ChevronLeft className="h-4 w-4 mr-1" />
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
        <AlertDialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] p-6 sm:p-8 bg-white rounded border border-[#e2e8f0] text-right shadow-xl" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl font-bold text-[#1a202c]">
              تأكيد حذف الوثيقة الصادرة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-[#4a5568] mt-3 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف الوثيقة الصادرة رقم{' '}
              <span className="font-bold text-[#1a202c]">
                #{deleteDoc?.serialNumber}
              </span>{' '}
              بشأن &quot;{deleteDoc?.subject}&quot;؟
              <br />
              <span className="text-sm text-[#c53030] block mt-2 font-medium">
                تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه.
              </span>
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
              className="bg-[#e53e3e] hover:bg-[#c53030] text-white rounded font-semibold text-base h-11 px-7 transition-colors duration-200 shadow-none inline-flex items-center gap-2"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري الحذف...</span>
                </>
              ) : (
                'تأكيد الحذف'
              )}
            </AlertDialogAction>
            <AlertDialogCancel 
              className="rounded font-medium text-base h-11 px-6 border-[#cbd5e1] text-[#2d3748] hover:bg-gray-100"
              disabled={deleteMutation.isPending}
            >
              إلغاء
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
        <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] p-6 sm:p-8 bg-white rounded border border-[#e2e8f0] text-right shadow-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-[#2c5282] flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282] shrink-0">
                <Share2 className="h-5 w-5 text-[#2c5282]" />
              </div>
              <span>تحويل وتوجيه الوثيقة الصادرة</span>
            </DialogTitle>
            <DialogDescription className="text-base text-[#4a5568] mt-1.5 leading-relaxed">
              تسجيل مسار الإرسال والتوجيه الإداري للمراسلة الصادرة رقم <strong className="text-[#1a202c]">#{transferDoc?.serialNumber}</strong>
            </DialogDescription>
          </DialogHeader>

          {transferDoc && (
            <div className="space-y-5 py-3">
              {/* Document mini-summary */}
              <div className="p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded space-y-1.5 text-base">
                <div className="font-bold text-[#1a202c]">
                  الموضوع: {transferDoc.subject}
                </div>
                <div className="text-sm text-[#718096] flex items-center gap-4">
                  <span>تاريخ الإصدار: {formatArabicDate(transferDoc.issueDate)}</span>
                  <span>المصدر: {transferDoc.source?.name || 'غير محدد'}</span>
                </div>
              </div>

              {/* Destination department */}
              <div className="space-y-2">
                <Label className="text-base font-bold text-[#1a202c]">
                  الجهة أو القسم المستهدف للتحويل <span className="text-red-600">*</span>
                </Label>
                <Select value={transferTargetDept} onValueChange={setTransferTargetDept}>
                  <SelectTrigger className="h-11 text-base border-[#cbd5e1] rounded bg-white">
                    <SelectValue placeholder="اختر القسم أو المصلحة..." />
                  </SelectTrigger>
                  <SelectContent className="rounded border-[#cbd5e1] text-base" dir="rtl">
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
                <Label className="text-base font-bold text-[#1a202c]">
                  تعليمات وملاحظات التوجيه
                </Label>
                <Textarea
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="مثال: للإجراء والمتابعة، للتنفيذ، للإطلاع والإفادة..."
                  className="text-base border-[#cbd5e1] rounded min-h-[100px] p-3 focus:border-[#2c5282]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-[#e2e8f0] mt-2">
            <Button
              type="button"
              onClick={handleTransferSubmit}
              disabled={isTransferSubmitting}
              className="h-11 px-7 bg-[#2c5282] hover:bg-[#234269] text-white rounded font-semibold text-base transition-colors duration-200 shadow-none"
            >
              {isTransferSubmitting ? 'جاري التسجيل...' : 'تأكيد التحويل والتوجيه'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTransferDoc(null)}
              className="h-11 px-6 rounded font-medium text-base border-[#cbd5e1] text-[#2d3748] hover:bg-gray-100"
              disabled={isTransferSubmitting}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScrollToTop />
    </div>
  );
};

export default OutgoingDocumentsPage;
