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
  Bookmark
} from 'lucide-react';
import { DocumentOption } from '@/services/documentOptionsService';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

interface DocumentOptionsListProps {
  options: DocumentOption[];
  onEdit: (option: DocumentOption) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  isLoading?: boolean;
  selectedCategoryFilter?: string;
  onSelectCategoryFilter?: (category: string) => void;
}

export const DocumentOptionsList: React.FC<DocumentOptionsListProps> = ({
  options,
  onEdit,
  onDelete,
  onToggleActive,
  isLoading = false,
  selectedCategoryFilter = 'all',
  onSelectCategoryFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalCategoryFilter, setInternalCategoryFilter] = useState<string>(selectedCategoryFilter);
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Sync category filter if parent changes it
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
        return <Bookmark className="h-4 w-4" />;
      case 'source':
        return <Building2 className="h-4 w-4" />;
      case 'typeDocument':
        return <FileText className="h-4 w-4" />;
      case 'assignedTo':
        return <Inbox className="h-4 w-4" />;
      case 'pourInfo':
        return <Send className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
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

  // Filter & Sort Options
  const filteredAndSortedOptions = useMemo(() => {
    return options
      .filter((option) => {
        // Search term
        if (searchTerm.trim() && !option.value.toLowerCase().includes(searchTerm.toLowerCase().trim())) {
          return false;
        }
        // Category
        if (internalCategoryFilter !== 'all' && option.category !== internalCategoryFilter) {
          return false;
        }
        // Document Type
        if (documentTypeFilter !== 'all') {
          if (documentTypeFilter === 'incoming' && option.documentType !== 'incoming' && option.documentType !== 'both') {
            return false;
          }
          if (documentTypeFilter === 'outgoing' && option.documentType !== 'outgoing' && option.documentType !== 'both') {
            return false;
          }
          if (documentTypeFilter === 'both' && option.documentType !== 'both') {
            return false;
          }
        }
        // Status
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

  // Pagination calculation
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
    <div className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6" dir="rtl">
      {/* 1. List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a202c] leading-normal flex items-center gap-2.5">
            <Layers className="h-5 w-5 text-[#2c5282]" />
            قائمة خيارات وحقول الوثائق
          </h2>
          <p className="text-base text-[#4a5568] leading-relaxed mt-0.5">
            استعراض، فرز وتعديل الخيارات المفعلة في نماذج المراسلات الإدارية
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center px-3 py-1 rounded text-base font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
            {totalFiltered} خيار متاح
          </span>

          {/* View Toggle */}
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
              <TableIcon className="h-4 w-4" />
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
              <GridIcon className="h-4 w-4" />
              <span className="hidden sm:inline">بطاقات</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Filters & Sort Controls Section */}
      <div className="bg-[#f7fafc] border border-[#e2e8f0] rounded p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#718096] h-4 w-4 pointer-events-none" />
            <Input
              placeholder="ابحث بقيمة الخيار..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 pr-10 text-base text-right border-[#cbd5e1] rounded bg-white focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200"
            />
          </div>

          {/* Category Filter */}
          <div>
            <Select value={internalCategoryFilter} onValueChange={handleCategoryChange}>
              <SelectTrigger className="h-11 text-base text-right border-[#cbd5e1] rounded bg-white">
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all" className="text-base">جميع الفئات</SelectItem>
                <SelectItem value="activity" className="text-base">النشاط</SelectItem>
                <SelectItem value="source" className="text-base">المصدر</SelectItem>
                <SelectItem value="typeDocument" className="text-base">نوع الوثيقة</SelectItem>
                <SelectItem value="assignedTo" className="text-base">مخصص إلى</SelectItem>
                <SelectItem value="pourInfo" className="text-base">للإعلام</SelectItem>
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
              <SelectTrigger className="h-11 text-base text-right border-[#cbd5e1] rounded bg-white">
                <SelectValue placeholder="نوع الوثيقة" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all" className="text-base">جميع أنواع المراسلات</SelectItem>
                <SelectItem value="incoming" className="text-base">واردة فقط</SelectItem>
                <SelectItem value="outgoing" className="text-base">صادرة فقط</SelectItem>
                <SelectItem value="both" className="text-base">كلا النوعين</SelectItem>
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
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all" className="text-base">جميع الحالات</SelectItem>
                <SelectItem value="active" className="text-base">نشط فقط</SelectItem>
                <SelectItem value="inactive" className="text-base">غير نشط فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sort and Reset Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#e2e8f0]">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <span className="text-sm font-medium text-[#4a5568] flex items-center gap-1.5 whitespace-nowrap">
              <ArrowUpDown className="h-4 w-4 text-[#2c5282]" />
              الترتيب:
            </span>
            <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
              <SelectTrigger className="h-9 min-w-[170px] text-sm text-right border-[#cbd5e1] rounded bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="newest" className="text-sm">الأحدث تاريخاً</SelectItem>
                <SelectItem value="oldest" className="text-sm">الأقدم تاريخاً</SelectItem>
                <SelectItem value="alpha-asc" className="text-sm">أبجدياً (أ إلى ي)</SelectItem>
                <SelectItem value="alpha-desc" className="text-sm">أبجدياً (ي إلى أ)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-3.5 text-sm font-semibold bg-[#FFCB56] hover:bg-[#f6be3c] text-[#78350f] border border-[#FFD758] rounded flex items-center gap-1.5 transition-colors duration-200 w-full sm:w-auto justify-center"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </Button>
          )}
        </div>
      </div>

      {/* 3. Main Content: Table or Cards */}
      {totalFiltered === 0 ? (
        /* Empty State */
        <div className="border border-[#e2e8f0] rounded p-8 sm:p-12 text-center bg-[#f7fafc] space-y-4">
          <div className="w-14 h-14 rounded bg-white border border-[#e2e8f0] flex items-center justify-center mx-auto text-[#718096]">
            <FileText className="h-7 w-7 text-[#2c5282]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#1a202c]">لا توجد خيارات مطابقة</h3>
            <p className="text-base text-[#4a5568] max-w-md mx-auto mt-1 leading-relaxed">
              {hasActiveFilters
                ? 'لم يتم العثور على خيارات تطابق معايير الفرز أو البحث الحالية. يمكنك إعادة ضبط الفلاتر للاطلاع على باقي الخيارات.'
                : 'لم يتم تسجيل أي خيارات في النظام حتى الآن. استخدم زر إضافة خيار جديد للبدء.'}
            </p>
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              onClick={handleResetFilters}
              className="h-10 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200"
            >
              عرض كافة الخيارات
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABULAR DATA VIEW (AdminLTE style) */
        <div className="overflow-x-auto border border-[#e2e8f0] rounded">
          <table className="w-full text-right border-collapse text-base">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#1a202c]">
                <th className="py-3.5 px-4 font-semibold text-sm">قيمة الخيار</th>
                <th className="py-3.5 px-4 font-semibold text-sm">الفئة الإدارية</th>
                <th className="py-3.5 px-4 font-semibold text-sm">نوع المراسلة</th>
                <th className="py-3.5 px-4 font-semibold text-sm">الحالة</th>
                <th className="py-3.5 px-4 font-semibold text-sm">تاريخ الإنشاء والمنشئ</th>
                <th className="py-3.5 px-4 font-semibold text-sm text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0] bg-white">
              {paginatedOptions.map((option) => (
                <tr 
                  key={option._id}
                  className="hover:bg-slate-50 transition-colors duration-200"
                >
                  {/* Option Value */}
                  <td className="py-4 px-4 font-bold text-[#1a202c] text-base leading-relaxed">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2c5282] flex-shrink-0" />
                      <span>{highlightMatch(option.value, searchTerm)}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-semibold bg-blue-50 text-[#2c5282] border border-blue-200">
                      {getCategoryIcon(option.category)}
                      {getCategoryLabel(option.category)}
                    </span>
                  </td>

                  {/* Document Type */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border ${
                      option.documentType === 'incoming'
                        ? 'bg-blue-50 text-[#2c5282] border-blue-200'
                        : option.documentType === 'outgoing'
                        ? 'bg-amber-50 text-[#78350f] border-[#FFD758]'
                        : 'bg-slate-100 text-[#1a202c] border-slate-300'
                    }`}>
                      {getDocumentTypeLabel(option.documentType)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {option.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                        <XCircle className="h-3.5 w-3.5 text-gray-500" />
                        معطّل
                      </span>
                    )}
                  </td>

                  {/* Created Date & Creator */}
                  <td className="py-4 px-4 whitespace-nowrap text-sm text-[#4a5568]">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-[#718096]" />
                        {formatArabicDate(option.createdAt)}
                      </span>
                      {option.createdBy?.username && (
                        <span className="flex items-center gap-1 text-xs text-[#718096]">
                          <User className="h-3 w-3" />
                          {option.createdBy.username}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* Toggle Active Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleActive(option._id, option.isActive)}
                        disabled={isLoading}
                        title={option.isActive ? 'تعطيل الخيار' : 'تفعيل الخيار'}
                        className={`h-8 px-2.5 text-xs font-semibold rounded border transition-colors duration-200 ${
                          option.isActive
                            ? 'border-gray-300 text-[#4a5568] hover:bg-gray-100'
                            : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {option.isActive ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5 ml-1" />
                            تعطيل
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5 ml-1" />
                            تفعيل
                          </>
                        )}
                      </Button>

                      {/* Edit Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(option)}
                        disabled={isLoading}
                        title="تعديل هذا الخيار"
                        className="h-8 px-2.5 text-xs font-semibold border-[#FFCB56] bg-amber-50 text-[#78350f] hover:bg-[#FFCB56] rounded transition-colors duration-200"
                      >
                        <Edit3 className="h-3.5 w-3.5 ml-1" />
                        تعديل
                      </Button>

                      {/* Delete Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(option._id)}
                        disabled={isLoading}
                        title="حذف هذا الخيار"
                        className="h-8 px-2.5 text-xs font-semibold border-red-200 text-red-700 hover:bg-red-50 rounded transition-colors duration-200"
                      >
                        <Trash2 className="h-3.5 w-3.5 ml-1" />
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
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedOptions.map((option) => (
            <div
              key={option._id}
              className={`bg-white border rounded p-5 space-y-4 transition-colors duration-200 ${
                option.isActive
                  ? 'border-[#e2e8f0] hover:border-[#cbd5e1]'
                  : 'border-gray-200 bg-gray-50/50'
              }`}
            >
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 text-[#2c5282] border border-blue-200">
                  {getCategoryIcon(option.category)}
                  {getCategoryLabel(option.category)}
                </span>

                {option.isActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    نشط
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                    <XCircle className="h-3 w-3 text-gray-500" />
                    معطّل
                  </span>
                )}
              </div>

              {/* Title & Type */}
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-[#1a202c] leading-relaxed">
                  {highlightMatch(option.value, searchTerm)}
                </h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                  option.documentType === 'incoming'
                    ? 'bg-blue-50 text-[#2c5282] border-blue-200'
                    : option.documentType === 'outgoing'
                    ? 'bg-amber-50 text-[#78350f] border-[#FFD758]'
                    : 'bg-slate-100 text-[#1a202c] border-slate-300'
                }`}>
                  {getDocumentTypeLabel(option.documentType)}
                </span>
              </div>

              {/* Metadata */}
              <div className="text-xs text-[#4a5568] pt-3 border-t border-[#f1f5f9] flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[#718096]" />
                  {formatArabicDate(option.createdAt)}
                </span>
                {option.createdBy?.username && (
                  <span className="flex items-center gap-1 text-[#718096]">
                    <User className="h-3 w-3" />
                    {option.createdBy.username}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#f1f5f9]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleActive(option._id, option.isActive)}
                  disabled={isLoading}
                  className={`flex-1 h-9 text-xs font-semibold rounded ${
                    option.isActive
                      ? 'border-gray-300 text-[#4a5568] hover:bg-gray-100'
                      : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {option.isActive ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5 ml-1" />
                      تعطيل
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 ml-1" />
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
                  className="flex-1 h-9 text-xs font-semibold border-[#FFCB56] bg-amber-50 text-[#78350f] hover:bg-[#FFCB56] rounded transition-colors duration-200"
                >
                  <Edit3 className="h-3.5 w-3.5 ml-1" />
                  تعديل
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(option._id)}
                  disabled={isLoading}
                  className="h-9 px-3 text-xs font-semibold border-red-200 text-red-700 hover:bg-red-50 rounded transition-colors duration-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Pagination Bar */}
      {totalFiltered > 0 && (
        <div className="pt-4 border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-base text-[#4a5568]">
            عرض{' '}
            <span className="font-semibold text-[#1a202c]">{startIndex + 1}</span> إلى{' '}
            <span className="font-semibold text-[#1a202c]">{endIndex}</span> من أصل{' '}
            <span className="font-semibold text-[#1a202c]">{totalFiltered}</span> خيار
          </div>

          <div className="flex items-center gap-3">
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
                  <SelectItem value="25" className="text-sm">25</SelectItem>
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

              <span className="text-sm font-medium text-[#1a202c] px-2">
                {clampedPage} / {totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={clampedPage >= totalPages}
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
  );
};

export default DocumentOptionsList;
