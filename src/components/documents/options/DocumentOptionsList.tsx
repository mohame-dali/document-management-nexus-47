import React, { useState, useMemo } from 'react';
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
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Search,
  RotateCcw,
  Table as TableIcon,
  Grid as GridIcon,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Layers,
  Inbox,
  Send,
  Building2,
  Bookmark,
} from 'lucide-react';
import { DocumentOption } from '@/services/documentOptionsService';
import { formatLongDate } from '@/utils/formatDate';
import { useDirection } from '@/i18n/useDirection';

interface DocumentOptionsListProps {
  options: DocumentOption[];
  onEdit: (option: DocumentOption) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  isLoading?: boolean;
  selectedCategoryFilter?: string;
  onSelectCategoryFilter?: (category: string) => void;
  summaryCounts?: {
    total: number;
    active: number;
    inactive: number;
  };
}

export const DocumentOptionsList: React.FC<DocumentOptionsListProps> = ({
  options,
  onEdit,
  onDelete,
  onToggleActive,
  isLoading = false,
  selectedCategoryFilter = 'all',
  onSelectCategoryFilter,
  summaryCounts,
}) => {
  const { dir } = useDirection();
  const [searchTerm, setSearchTerm] = useState('');
  const [internalCategoryFilter, setInternalCategoryFilter] =
    useState<string>(selectedCategoryFilter);
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  React.useEffect(() => {
    setInternalCategoryFilter(selectedCategoryFilter);
    setCurrentPage(1);
  }, [selectedCategoryFilter]);

  const handleCategoryChange = (val: string) => {
    setInternalCategoryFilter(val);
    setCurrentPage(1);
    if (onSelectCategoryFilter) {
      onSelectCategoryFilter(val);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      activity: 'النشاط',
      source: 'المصدر',
      typeDocument: 'نوع الوثيقة',
      assignedTo: 'مخصص إلى',
      pourInfo: 'للإعلام',
    };
    return labels[category] || category;
  };

  const getDocumentTypeLabel = (documentType: string) => {
    const labels: Record<string, string> = {
      incoming: 'وثائق واردة',
      outgoing: 'وثائق صادرة',
      both: 'كلا النوعين',
    };
    return labels[documentType] || documentType;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'activity':
        return <Bookmark className="h-3.5 w-3.5" />;
      case 'source':
        return <Building2 className="h-3.5 w-3.5" />;
      case 'typeDocument':
        return <FileText className="h-3.5 w-3.5" />;
      case 'assignedTo':
        return <Inbox className="h-3.5 w-3.5" />;
      case 'pourInfo':
        return <Send className="h-3.5 w-3.5" />;
      default:
        return <Layers className="h-3.5 w-3.5" />;
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setInternalCategoryFilter('all');
    setDocumentTypeFilter('all');
    setStatusFilter('all');
    setSortBy('newest');
    setCurrentPage(1);
    if (onSelectCategoryFilter) {
      onSelectCategoryFilter('all');
    }
  };

  const filteredAndSortedOptions = useMemo(() => {
    return options
      .filter((option) => {
        if (
          searchTerm.trim() &&
          !option.value.toLowerCase().includes(searchTerm.toLowerCase().trim())
        ) {
          return false;
        }
        if (internalCategoryFilter !== 'all' && option.category !== internalCategoryFilter) {
          return false;
        }
        if (documentTypeFilter !== 'all') {
          if (
            documentTypeFilter === 'incoming' &&
            option.documentType !== 'incoming' &&
            option.documentType !== 'both'
          ) {
            return false;
          }
          if (
            documentTypeFilter === 'outgoing' &&
            option.documentType !== 'outgoing' &&
            option.documentType !== 'both'
          ) {
            return false;
          }
          if (documentTypeFilter === 'both' && option.documentType !== 'both') {
            return false;
          }
        }
        if (statusFilter !== 'all') {
          if (statusFilter === 'active' && !option.isActive) return false;
          if (statusFilter === 'inactive' && option.isActive) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (sortBy === 'alpha-asc') {
          return a.value.localeCompare(b.value, 'ar');
        }
        if (sortBy === 'alpha-desc') {
          return b.value.localeCompare(a.value, 'ar');
        }
        return 0;
      });
  }, [options, searchTerm, internalCategoryFilter, documentTypeFilter, statusFilter, sortBy]);

  const totalFiltered = filteredAndSortedOptions.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const clampedPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (clampedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);
  const paginatedOptions = filteredAndSortedOptions.slice(startIndex, endIndex);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      internalCategoryFilter !== 'all' ||
      documentTypeFilter !== 'all' ||
      statusFilter !== 'all' ||
      sortBy !== 'newest'
  );

  const totalCount = summaryCounts?.total ?? options.length;
  const activeCount = summaryCounts?.active ?? options.filter((o) => o.isActive).length;
  const inactiveCount = summaryCounts?.inactive ?? totalCount - activeCount;

  const highlightMatch = (text: string, query: string) => {
    if (!query || !query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-[#FFCB56] text-[#78350f] px-1 py-0.5 rounded font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div dir={dir}>
      {/* Toolbar: Concise Title + Inline Status/Count Strip + View Switcher */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
            <span>قائمة الخيارات</span>
          </h2>

          {/* Compact inline status/count strip */}
          <div className="inline-flex items-center flex-wrap gap-1.5 text-xs tabular-nums">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 font-semibold">
              <span>الإجمالي:</span>
              <bdi dir="ltr">{totalCount}</bdi>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 font-semibold">
              <CheckCircle2 className="h-3 w-3" />
              <span>مفعلة:</span>
              <bdi dir="ltr">{activeCount}</bdi>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 font-semibold">
              <XCircle className="h-3 w-3" />
              <span>معطلة:</span>
              <bdi dir="ltr">{inactiveCount}</bdi>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums">
            المعروض: <strong className="text-slate-800 dark:text-slate-200"><bdi dir="ltr">{totalFiltered}</bdi></strong>
          </span>

          {/* View Toggle */}
          <div className="inline-flex items-center border border-slate-200/90 dark:border-slate-700 rounded-md overflow-hidden bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="عرض كجدول بيانات"
              className={`h-9 px-3 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#2c5282] text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="عرض كجدول بيانات"
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">جدول</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="عرض كبطاقات"
              className={`h-9 px-3 text-xs font-semibold flex items-center gap-1.5 border-s border-slate-200/90 dark:border-slate-700 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#2c5282] text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="عرض كبطاقات"
            >
              <GridIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">بطاقات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inline Filter Bar (no nested card) */}
      <div className="px-4 sm:px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-300 h-4 w-4 pointer-events-none" />
            <Input
              placeholder="ابحث بقيمة الخيار..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 ps-9 text-sm text-start border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Category Filter */}
          <div>
            <Select value={internalCategoryFilter} onValueChange={handleCategoryChange}>
              <SelectTrigger className="h-10 text-sm text-start border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900">
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent dir={dir}>
                <SelectItem value="all">جميع الفئات</SelectItem>
                <SelectItem value="activity">النشاط</SelectItem>
                <SelectItem value="source">المصدر</SelectItem>
                <SelectItem value="typeDocument">نوع الوثيقة</SelectItem>
                <SelectItem value="assignedTo">مخصص إلى</SelectItem>
                <SelectItem value="pourInfo">للإعلام</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Document Type Filter */}
          <div>
            <Select
              value={documentTypeFilter}
              onValueChange={(val) => {
                setDocumentTypeFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-10 text-sm text-start border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900">
                <SelectValue placeholder="نوع الوثيقة" />
              </SelectTrigger>
              <SelectContent dir={dir}>
                <SelectItem value="all">جميع أنواع المراسلات</SelectItem>
                <SelectItem value="incoming">واردة فقط</SelectItem>
                <SelectItem value="outgoing">صادرة فقط</SelectItem>
                <SelectItem value="both">كلا النوعين</SelectItem>
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
              <SelectTrigger className="h-10 text-sm text-start border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent dir={dir}>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط فقط</SelectItem>
                <SelectItem value="inactive">غير نشط فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sort and Reset Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
              <ArrowUpDown className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400" />
              الترتيب:
            </span>
            <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
              <SelectTrigger className="h-9 min-w-[165px] text-xs text-start border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir={dir}>
                <SelectItem value="newest">الأحدث تاريخاً</SelectItem>
                <SelectItem value="oldest">الأقدم تاريخاً</SelectItem>
                <SelectItem value="alpha-asc">أبجدياً (أ إلى ي)</SelectItem>
                <SelectItem value="alpha-desc">أبجدياً (ي إلى أ)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-3 text-xs font-semibold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content: Table or Cards */}
      {totalFiltered === 0 ? (
        <div className="p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center mx-auto text-[#2c5282] dark:text-blue-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              لا توجد خيارات مطابقة
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 max-w-md mx-auto mt-1">
              {hasActiveFilters
                ? 'لم يتم العثور على خيارات تطابق معايير البحث الحالية.'
                : 'لم يتم تسجيل أي خيارات في النظام حتى الآن.'}
            </p>
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={handleResetFilters}
              className="h-9 px-4 text-xs font-semibold"
            >
              عرض كافة الخيارات
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                <th className="py-3 px-4 font-semibold text-xs text-start">قيمة الخيار</th>
                <th className="py-3 px-4 font-semibold text-xs text-start">الفئة الإدارية</th>
                <th className="py-3 px-4 font-semibold text-xs text-start">نوع المراسلة</th>
                <th className="py-3 px-4 font-semibold text-xs text-start">الحالة</th>
                <th className="py-3 px-4 font-semibold text-xs text-start">الإنشاء</th>
                <th className="py-3 px-4 font-semibold text-xs text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {paginatedOptions.map((option) => (
                <tr
                  key={option._id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Option Value */}
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    {highlightMatch(option.value, searchTerm)}
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <span className="text-[#2c5282] dark:text-blue-400">
                        {getCategoryIcon(option.category)}
                      </span>
                      <span>{getCategoryLabel(option.category)}</span>
                    </span>
                  </td>

                  {/* Document Type */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                        option.documentType === 'incoming'
                          ? 'bg-blue-50 text-[#2c5282] border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60'
                          : option.documentType === 'outgoing'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
                          : 'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {getDocumentTypeLabel(option.documentType)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {option.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                        <XCircle className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                        معطّل
                      </span>
                    )}
                  </td>

                  {/* Created Date & Creator */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1 tabular-nums">
                        <Clock className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                        <bdi dir="rtl">{formatLongDate(option.createdAt, 'ar')}</bdi>
                      </span>
                      {option.createdBy?.username && (
                        <span className="flex items-center gap-1 text-[13px] text-slate-700 dark:text-slate-300">
                          <User className="h-3 w-3" />
                          {option.createdBy.username}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleActive(option._id, option.isActive)}
                        disabled={isLoading}
                        title={option.isActive ? 'تعطيل الخيار' : 'تفعيل الخيار'}
                        className={`h-9 px-2.5 text-xs font-semibold rounded-md transition-colors ${
                          option.isActive
                            ? 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                        }`}
                      >
                        {option.isActive ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5 me-1" />
                            تعطيل
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5 me-1" />
                            تفعيل
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(option)}
                        disabled={isLoading}
                        title="تعديل هذا الخيار"
                        className="h-9 px-2.5 text-xs font-semibold border-amber-300 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-md"
                      >
                        <Edit3 className="h-3.5 w-3.5 me-1" />
                        تعديل
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(option._id)}
                        disabled={isLoading}
                        title="حذف هذا الخيار"
                        aria-label="حذف هذا الخيار"
                        className="h-9 px-2.5 text-xs font-semibold border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md"
                      >
                        <Trash2 className="h-3.5 w-3.5 me-1" />
                        حذف
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedOptions.map((option) => (
            <div
              key={option._id}
              className={`border rounded-lg p-4 space-y-3 transition-colors ${
                option.isActive
                  ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                  : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/70 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#2c5282] dark:text-blue-400">
                  {getCategoryIcon(option.category)}
                  <span>{getCategoryLabel(option.category)}</span>
                </span>

                {option.isActive ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    نشط
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <XCircle className="h-3.5 w-3.5" />
                    معطّل
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {highlightMatch(option.value, searchTerm)}
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {getDocumentTypeLabel(option.documentType)}
                </p>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-300 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1 tabular-nums">
                  <Clock className="h-3 w-3" />
                  <bdi dir="rtl">{formatLongDate(option.createdAt, 'ar')}</bdi>
                </span>
                {option.createdBy?.username && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {option.createdBy.username}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleActive(option._id, option.isActive)}
                  disabled={isLoading}
                  className="flex-1 h-9 text-xs font-semibold rounded-md"
                >
                  {option.isActive ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5 me-1" />
                      تعطيل
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 me-1" />
                      تفعيل
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(option)}
                  disabled={isLoading}
                  className="flex-1 h-9 text-xs font-semibold rounded-md"
                >
                  <Edit3 className="h-3.5 w-3.5 me-1" />
                  تعديل
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(option._id)}
                  disabled={isLoading}
                  aria-label="حذف هذا الخيار"
                  className="h-9 px-2.5 text-xs font-semibold border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {totalFiltered > 0 && (
        <div className="px-4 sm:px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 tabular-nums">
            عرض{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              <bdi dir="ltr">{startIndex + 1}</bdi>
            </span>{' '}
            إلى{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              <bdi dir="ltr">{endIndex}</bdi>
            </span>{' '}
            من أصل{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              <bdi dir="ltr">{totalFiltered}</bdi>
            </span>{' '}
            خيار
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              <span>في كل صفحة:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16 text-xs text-start border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 tabular-nums">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir={dir}>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={clampedPage <= 1}
                className="h-9 px-3 text-xs font-medium border-slate-300 dark:border-slate-700 rounded-md"
              >
                <ChevronRight className="h-3.5 w-3.5 me-1 rtl:rotate-0 ltr:rotate-180" />
                السابق
              </Button>

              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 px-2 tabular-nums">
                <bdi dir="ltr">
                  {clampedPage} / {totalPages}
                </bdi>
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={clampedPage >= totalPages}
                className="h-9 px-3 text-xs font-medium border-slate-300 dark:border-slate-700 rounded-md"
              >
                التالي
                <ChevronLeft className="h-3.5 w-3.5 ms-1 rtl:rotate-0 ltr:rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentOptionsList;
