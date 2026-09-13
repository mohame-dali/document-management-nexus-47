import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ShieldAlert,
  Inbox
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
import { deleteIncomingDocument, downloadDocument } from '@/services/documentService';
import { useAuth } from '@/contexts/AuthContext';
import { IncomingDocument } from '@/types';
import { useInfiniteDocuments } from '@/hooks/useInfiniteDocuments';
import { useYearPersistence } from '@/hooks/useYearPersistence';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import { getActivityUrgency } from '@/utils/activityUtils';
import DocumentFolderDialog from '@/components/documents/DocumentFolderDialog';
import AssignResponseDialog from '@/components/documents/AssignResponseDialog';
import AssignResponsibleDialog from '@/components/documents/AssignResponsibleDialog';
import ScrollToTop from '@/components/common/ScrollToTop';

const IncomingDocumentsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters & UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all_sources');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest-arrival');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Dialogs State
  const [folderDoc, setFolderDoc] = useState<IncomingDocument | null>(null);
  const [responseDoc, setResponseDoc] = useState<IncomingDocument | null>(null);
  const [responsibleDoc, setResponsibleDoc] = useState<IncomingDocument | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<IncomingDocument | null>(null);

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
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  const isAdmin = currentUser?.role === 'Admin';
  const isAdminTuningDesk = currentUser?.role === 'AdminTuningDesk';
  const isAdminDepartment = currentUser?.role === 'AdminDepartment';

  const canAddDocuments = isAdmin || isAdminTuningDesk;
  const canEdit = isSuperAdmin || isAdminTuningDesk || isAdmin;
  const canDelete = isSuperAdmin || isAdminTuningDesk || isAdmin;
  const canOrganizeDocuments = isAdminDepartment;
  const canViewCategorization = isAdmin || isAdminTuningDesk || isAdminDepartment || currentUser?.role === 'User';
  const canAssignOrRespond = isAdminDepartment || isAdmin || isAdminTuningDesk;

  // Fetch departments for AdminTuningDesk filtering
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    enabled: currentUser?.role === 'AdminTuningDesk',
  });

  // Fetch source options for source filtering
  const { data: sourceOptions = [] } = useQuery({
    queryKey: ['documentOptions', 'source', 'incoming'],
    queryFn: () => getDocumentOptions({ category: 'source', documentType: 'incoming' }),
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
    documentType: 'incoming',
    year: selectedYear,
    department: selectedDepartment,
    source: selectedSource,
    enabled: isValidYear,
  });

  // Auto-refresh when window regains focus
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
    mutationFn: async (id: string) => {
      await deleteIncomingDocument(id);
    },
    onSuccess: () => {
      toast.success('تم حذف الوثيقة الواردة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
      setDeleteDoc(null);
    },
    onError: (err: unknown) => {
      console.error('Error deleting document:', err);
      toast.error('فشل في حذف الوثيقة الواردة');
    },
  });

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return (documents as IncomingDocument[]).filter((doc: IncomingDocument) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSerial = String(doc.serialNumber).toLowerCase().includes(query);
        const matchesSubject = (doc.subject || '').toLowerCase().includes(query);
        const matchesSource = doc.source ? doc.source.toLowerCase().includes(query) : false;
        const matchesActivity = doc.activity ? doc.activity.toLowerCase().includes(query) : false;
        if (!matchesSerial && !matchesSubject && !matchesSource && !matchesActivity) {
          return false;
        }
      }

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
  }, [documents, searchQuery, statusFilter]);

  // Sort documents
  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((a, b) => {
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
    });
  }, [filteredDocuments, sortBy]);

  // Pagination calculation
  const totalFiltered = sortedDocuments.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const clampedPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (clampedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);
  const paginatedDocuments = sortedDocuments.slice(startIndex, endIndex);

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

  const handleDownload = async (doc: IncomingDocument) => {
    if (doc.scannedDocument) {
      try {
        await downloadDocument(doc.scannedDocument, `incoming-doc-${doc.serialNumber}-${doc.year}.pdf`);
      } catch (error) {
        console.error('Error downloading document:', error);
        toast.error('تعذر تحميل ملف PDF');
      }
    } else {
      toast.info('لا يوجد ملف ممسوح ضوئياً لهذه الوثيقة');
    }
  };

  // Status stats
  const answeredCount = documents.filter((d: IncomingDocument) => Boolean(d.answer)).length;
  const pendingCount = documents.length - answeredCount;

  // Search match highlight
  const highlightMatch = (text: string, query: string) => {
    if (!query || !query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
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
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-6 sm:p-8" dir="rtl">
        <div className="max-w-xl mx-auto bg-white border border-[#e2e8f0] rounded p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded bg-[#ebf4ff] border border-[#bee3f8] text-[#2c5282] flex items-center justify-center mx-auto">
            <Calendar className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#1a202c]">تحديد سنة التسجيل</h2>
          <p className="text-base text-[#4a5568] leading-relaxed">
            يرجى إدخال سنة كاملة مكونة من 4 أرقام (مثال: {new Date().getFullYear()}) لعرض وثائق ومراسلات الوارد.
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
              <p className="text-xs text-[#718096]">
                يرجى إكمال إدخال السنة (4 أرقام)
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={yearInput.length !== 4 || !/^\d{4}$/.test(yearInput)}
                className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200"
              >
                تأكيد وعرض الوثائق
              </Button>
            </div>
            {/* Quick Year Shortcuts */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-[#718096]">سنوات سريعة:</span>
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
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4" dir="rtl">
        <Loader2 className="h-10 w-10 text-[#2c5282] animate-spin" />
        <h2 className="text-xl font-bold text-[#1a202c]">جاري تحميل الوثائق الواردة...</h2>
        <p className="text-base text-[#4a5568]">يتم استرجاع سجلات المراسلات الواردة لسنة {selectedYear}</p>
      </div>
    );
  }

  // Error view
  if (isError && isValidYear) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-6 sm:p-8" dir="rtl">
        <div className="max-w-xl mx-auto bg-white border border-red-200 rounded p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#1a202c]">حدث خطأ أثناء تحميل المستندات</h2>
          <p className="text-base text-[#4a5568] leading-relaxed">
            تعذر الاتصال بقاعدة البيانات لاسترجاع الوثائق الواردة. يرجى التحقق من الاتصال وإعادة المحاولة.
          </p>
          <Button
            onClick={() => refetch()}
            className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200"
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-4 sm:p-6 lg:p-8 space-y-6" dir="rtl">
      {/* 1. Page Header (En-tête) */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded bg-[#2c5282] text-white flex items-center justify-center flex-shrink-0">
            <FileInput className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2c5282] leading-normal flex items-center gap-2.5">
              الوثائق والمراسلات الواردة
            </h1>
            <p className="text-base text-[#4a5568] leading-relaxed mt-1">
              تسجيل ومتابعة المراسلات الإدارية الواردة، معالجة الردود، التعيين والأرشفة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Institutional Stats Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-base font-bold bg-[#FFCB56] text-[#1a202c] border border-[#FFD758]"
              title="إجمالي الوثائق المسجلة في هذه السنة"
            >
              <Inbox className="h-4 w-4" />
              {totalCount} وثيقة واردة
            </span>

            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-base font-semibold bg-slate-100 text-[#1a202c] border border-slate-300"
              title="السنة الحالية المفعلة"
            >
              <Calendar className="h-4 w-4 text-[#2c5282]" />
              سنة {selectedYear}
            </span>
          </div>

          {/* Add Document Action Button */}
          {canAddDocuments && (
            <Button
              onClick={() => navigate('/dashboard/incoming-documents/create')}
              className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200 flex items-center gap-2"
            >
              <PlusCircle className="h-5 w-5" />
              <span>إضافة وثيقة واردة</span>
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
              placeholder="ابحث بالرقم، الموضوع، المصدر، النشاط..."
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
                placeholder="السنة (مثال: 2026)"
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
                <SelectValue placeholder="المصدر / الجهة" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all_sources" className="text-base">جميع المصادر</SelectItem>
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
                <SelectValue placeholder="حالة المعالجة" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all" className="text-base">جميع الحالات</SelectItem>
                <SelectItem value="pending" className="text-base">بانتظار المعالجة / الرد</SelectItem>
                <SelectItem value="answered" className="text-base">تم الرد عليها (مُجاب)</SelectItem>
                <SelectItem value="urgent" className="text-base">المراسلات العاجلة</SelectItem>
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
                <span className="text-sm font-semibold text-[#4a5568] whitespace-nowrap">القسم:</span>
                <Select 
                  value={selectedDepartment} 
                  onValueChange={(val) => {
                    setSelectedDepartment(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 min-w-[180px] text-sm text-right border-[#cbd5e1] rounded bg-white">
                    <SelectValue placeholder="كافة الأقسام" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all" className="text-sm">كافة الأقسام</SelectItem>
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
                الترتيب:
              </span>
              <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
                <SelectTrigger className="h-9 min-w-[170px] text-sm text-right border-[#cbd5e1] rounded bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="newest-arrival" className="text-sm">الأحدث وصولاً</SelectItem>
                  <SelectItem value="oldest-arrival" className="text-sm">الأقدم وصولاً</SelectItem>
                  <SelectItem value="serial-desc" className="text-sm">رقم التسلسل (تنازلي)</SelectItem>
                  <SelectItem value="serial-asc" className="text-sm">رقم التسلسل (تصاعدي)</SelectItem>
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
                className="h-9 px-4 text-sm font-semibold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] border border-[#FFD758] rounded flex items-center gap-1.5 transition-colors duration-200"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#1a202c]" />
                <span>إعادة ضبط الفلاتر</span>
              </Button>
            )}
          </div>

          {/* Right controls: View Toggle and Live Fetch indicator */}
          <div className="flex items-center gap-3">
            {isFetching && !isFetchingNextPage && (
              <span className="text-xs text-[#2c5282] font-semibold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                <Loader2 className="h-3 w-3 animate-spin" />
                تحديث البيانات...
              </span>
            )}

            {/* View Mode Toggle */}
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
      </div>

      {/* 3. Main Documents Content: Table or Grid */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6">
        {totalFiltered === 0 ? (
          /* Empty State */
          <div className="border border-[#e2e8f0] rounded p-8 sm:p-12 text-center bg-[#f7fafc] space-y-4">
            <div className="w-14 h-14 rounded bg-white border border-[#e2e8f0] flex items-center justify-center mx-auto text-[#718096]">
              <FileText className="h-7 w-7 text-[#2c5282]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1a202c]">لا توجد وثائق واردة مطابقة</h3>
              <p className="text-base text-[#4a5568] max-w-md mx-auto mt-1 leading-relaxed">
                {hasActiveFilters
                  ? 'لم يتم العثور على وثائق تطابق معايير الفرز أو البحث المحددة. يمكنك تعديل أو إعادة ضبط الفلاتر للاطلاع على باقي المراسلات.'
                  : `لم يتم تسجيل أي وثائق واردة لسنة ${selectedYear} حتى الآن.`}
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
          /* TABULAR VIEW (AdminLTE style, 8h/day professional ergonomics) */
          <div className="overflow-x-auto border border-[#e2e8f0] rounded">
            <table className="w-full text-right border-collapse text-base">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#1a202c]">
                  <th className="py-4 px-4 font-semibold text-sm whitespace-nowrap">رقم التسلسل</th>
                  <th className="py-4 px-4 font-semibold text-sm">الموضوع والنوع</th>
                  <th className="py-4 px-4 font-semibold text-sm whitespace-nowrap">تاريخ الوصول</th>
                  <th className="py-4 px-4 font-semibold text-sm">المصدر / الجهة</th>
                  <th className="py-4 px-4 font-semibold text-sm">حالة المتابعة والرد</th>
                  <th className="py-4 px-4 font-semibold text-sm text-center">الإجراءات</th>
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

                      {/* Subject, Document Type, Activity */}
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
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-[#4a5568]">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="h-4 w-4 text-[#718096]" />
                          <span>{formatArabicDate(doc.arrivalDate)}</span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-base font-medium text-[#2d3748]">
                          <Building2 className="h-4 w-4 text-[#718096] flex-shrink-0" />
                          <span className="line-clamp-1" title={doc.source || 'غير محدد'}>
                            {highlightMatch(doc.source || 'غير محدد', searchQuery)}
                          </span>
                        </div>
                      </td>

                      {/* Follow-up / Answer Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {doc.answer ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 w-fit">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              تم الرد
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-amber-50 text-[#1a202c] border border-[#FFD758] w-fit">
                              <Clock className="h-3.5 w-3.5 text-[#d69e2e]" />
                              بانتظار المعالجة
                            </span>
                          )}

                          {doc.responsibleUser && typeof doc.responsibleUser === 'object' && (
                            <span className="text-xs text-[#718096] flex items-center gap-1">
                              <Users className="h-3 w-3 text-[#718096]" />
                              المسؤول: {doc.responsibleUser.username}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions: Voir, Traiter, Archiver, Transférer + Dropdown */}
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

                          {/* 2. Traiter (معالجة / إضافة رد) */}
                          {canAssignOrRespond && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setResponseDoc(doc)}
                              title="معالجة وإضافة رد"
                              className="h-8 px-2.5 text-xs font-bold rounded text-[#1a202c] border-[#FFD758] bg-amber-50 hover:bg-[#FFCB56] transition-colors duration-200"
                            >
                              <MessageSquare className="h-3.5 w-3.5 ml-1 text-[#1a202c]" />
                              معالجة
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
                              className="h-8 px-2.5 text-xs font-semibold rounded text-[#4a5568] border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors duration-200"
                            >
                              <FolderOpen className="h-3.5 w-3.5 ml-1" />
                              أرشفة
                            </Button>
                          )}

                          {/* 4. Transférer (تحويل / تعيين مسؤول) */}
                          {canAssignOrRespond && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setResponsibleDoc(doc)}
                              title="تعيين مسؤول ومتابعة التحويل"
                              className="h-8 px-2.5 text-xs font-semibold rounded text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors duration-200"
                            >
                              <UserPlus className="h-3.5 w-3.5 ml-1" />
                              تحويل
                            </Button>
                          )}

                          {/* More Actions Dropdown (PDF, Edit, Delete) */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-[#718096] hover:text-[#1a202c] hover:bg-gray-100 rounded"
                                title="المزيد من الإجراءات"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" dir="rtl" className="w-48 bg-white border border-[#e2e8f0] rounded shadow-md">
                              {doc.scannedDocument && (
                                <DropdownMenuItem 
                                  onClick={() => handleDownload(doc)}
                                  className="text-sm py-2 cursor-pointer"
                                >
                                  <Download className="ml-2 h-4 w-4 text-[#2c5282]" />
                                  تحميل ملف PDF
                                </DropdownMenuItem>
                              )}

                              {canEdit && (
                                <DropdownMenuItem 
                                  onClick={() => handleEdit(doc._id)}
                                  className="text-sm py-2 cursor-pointer"
                                >
                                  <Edit className="ml-2 h-4 w-4 text-[#2c5282]" />
                                  تعديل الوثيقة
                                </DropdownMenuItem>
                              )}

                              {canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => setDeleteDoc(doc)}
                                    className="text-sm py-2 text-red-600 focus:text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="ml-2 h-4 w-4 text-red-600" />
                                    حذف الوثيقة
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
                          مُجاب
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-[#1a202c] border border-[#FFD758]">
                          <Clock className="h-3 w-3 text-[#d69e2e]" />
                          بانتظار المعالجة
                        </span>
                      )}
                    </div>

                    {/* Subject */}
                    <h3 
                      onClick={() => handleView(doc._id)}
                      className="text-lg font-bold text-[#1a202c] hover:text-[#2c5282] cursor-pointer leading-relaxed line-clamp-2"
                      title={doc.subject}
                    >
                      {highlightMatch(doc.subject, searchQuery)}
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
                        <span className="truncate">{doc.source || 'مصدر غير محدد'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#718096]" />
                        <span>{formatArabicDate(doc.arrivalDate)}</span>
                      </div>
                      {doc.responsibleUser && typeof doc.responsibleUser === 'object' && (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-[#718096]" />
                          <span>المسؤول: {doc.responsibleUser.username}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons (Voir, Traiter, Archiver, Transférer) */}
                  <div className="flex items-center gap-1.5 pt-3 border-t border-[#f1f5f9] flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(doc._id)}
                      className="flex-1 h-8 text-xs font-semibold text-[#2c5282] border-blue-200 bg-blue-50/60 hover:bg-blue-100 rounded"
                    >
                      <Eye className="h-3.5 w-3.5 ml-1" />
                      عرض
                    </Button>

                    {canAssignOrRespond && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setResponseDoc(doc)}
                        className="flex-1 h-8 text-xs font-bold text-[#1a202c] border-[#FFD758] bg-amber-50 hover:bg-[#FFCB56] rounded"
                      >
                        <MessageSquare className="h-3.5 w-3.5 ml-1 text-[#1a202c]" />
                        معالجة
                      </Button>
                    )}

                    {canViewCategorization && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFolderDoc(doc)}
                        className="flex-1 h-8 text-xs font-semibold text-[#4a5568] border-slate-300 bg-slate-50 hover:bg-slate-100 rounded"
                      >
                        <FolderOpen className="h-3.5 w-3.5 ml-1" />
                        أرشفة
                      </Button>
                    )}

                    {canAssignOrRespond && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setResponsibleDoc(doc)}
                        className="flex-1 h-8 text-xs font-semibold text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 rounded"
                      >
                        <UserPlus className="h-3.5 w-3.5 ml-1" />
                        تحويل
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
          <div className="pt-4 border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-base text-[#4a5568]">
              عرض{' '}
              <span className="font-semibold text-[#1a202c]">{startIndex + 1}</span> إلى{' '}
              <span className="font-semibold text-[#1a202c]">{endIndex}</span> من أصل{' '}
              <span className="font-semibold text-[#1a202c]">{totalFiltered}</span> وثيقة
              {totalCount > loadedCount && (
                <span className="text-xs text-[#718096] mr-2">
                  (محمّل {loadedCount} من إجمالي {totalCount})
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Load more from server button if needed */}
              {hasNextPage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="h-9 px-3 text-sm font-semibold border-[#FFCB56] bg-amber-50 hover:bg-[#FFCB56] text-[#1a202c] rounded transition-colors duration-200"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin ml-1 text-[#1a202c]" />
                      جاري التحميل...
                    </>
                  ) : (
                    'تحميل دفعة إضافية من الخادم'
                  )}
                </Button>
              )}

              {/* Page Size Selector */}
              <div className="flex items-center gap-2 text-sm text-[#4a5568]">
                <span>في كل صفحة:</span>
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
                  <SelectContent dir="rtl">
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
                  disabled={clampedPage <= 1}
                  className="h-9 px-3 text-sm font-medium border-[#cbd5e1] rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4 ml-1" />
                  السابق
                </Button>

                <span className="text-sm font-semibold text-[#1a202c] px-2">
                  {clampedPage} / {totalPages}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (clampedPage < totalPages) {
                      setCurrentPage(clampedPage + 1);
                    } else if (hasNextPage && !isFetchingNextPage) {
                      fetchNextPage().then(() => {
                        setCurrentPage(clampedPage + 1);
                      });
                    }
                  }}
                  disabled={clampedPage >= totalPages && !hasNextPage}
                  className="h-9 px-3 text-sm font-medium border-[#cbd5e1] rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  التالي
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
        <AlertDialogContent dir="rtl" className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 shadow-xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl sm:text-2xl font-bold text-[#1a202c]">
              تأكيد حذف الوثيقة الواردة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-[#4a5568] leading-relaxed mt-2">
              هل أنت متأكد من رغبتك في حذف الوثيقة رقم{' '}
              <span className="font-bold text-[#1a202c]">#{deleteDoc?.serialNumber}</span> لسنة{' '}
              <span className="font-bold text-[#1a202c]">{deleteDoc?.year}</span>؟
              <br />
              هذا الإجراء نهائي ولا يمكن التراجع عنه.
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
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-base h-11 px-7 rounded shadow-none"
            >
              {deleteMutation.isPending ? 'جاري الحذف...' : 'تأكيد الحذف'}
            </AlertDialogAction>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="border-[#cbd5e1] text-[#2d3748] hover:bg-gray-100 font-medium text-base h-11 px-6 rounded"
            >
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScrollToTop />
    </div>
  );
};

export default IncomingDocumentsPage;
