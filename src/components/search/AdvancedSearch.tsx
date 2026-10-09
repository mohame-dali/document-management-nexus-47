import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Calendar, 
  FileText, 
  Hash, 
  Building2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Inbox,
  Send,
  Files,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import DocumentOptionCombobox from '@/components/ui/document-option-combobox';
import { getAvailableYears } from '@/services/documentService';

export interface SearchFilters {
  keyword: string;
  documentType: 'all' | 'incoming' | 'outgoing';
  year: string;
  years: number[];
  includeOcr: boolean;
  serialNumber: string;
  subject: string;
  source: string;
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ onSearch, onClear }) => {
  const { currentUser } = useAuth();
  
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    documentType: 'all',
    year: '',
    years: [],
    includeOcr: true,
    serialNumber: '',
    subject: '',
    source: '',
  });

  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loadingYears, setLoadingYears] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load available years when documentType changes or on mount
  useEffect(() => {
    let isMounted = true;
    const fetchYears = async () => {
      setLoadingYears(true);
      try {
        const years = await getAvailableYears(filters.documentType);
        if (isMounted) {
          if (years.length > 0) {
            setAvailableYears(years);
          } else {
            // Fallback default years if database is empty or returns nothing
            const currentYear = new Date().getFullYear();
            setAvailableYears([currentYear, currentYear - 1, currentYear - 2]);
          }
        }
      } catch (err) {
        console.error('Failed to load available years:', err);
        if (isMounted) {
          const currentYear = new Date().getFullYear();
          setAvailableYears([currentYear, currentYear - 1, currentYear - 2]);
        }
      } finally {
        if (isMounted) setLoadingYears(false);
      }
    };

    fetchYears();
    return () => {
      isMounted = false;
    };
  }, [filters.documentType]);

  const handleFilterChange = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleTypeChange = (type: 'all' | 'incoming' | 'outgoing') => {
    setFilters(prev => ({
      ...prev,
      documentType: type,
    }));
  };

  const toggleYear = (year: number) => {
    setFilters(prev => {
      const exists = prev.years.includes(year);
      const nextYears = exists 
        ? prev.years.filter(y => y !== year)
        : [...prev.years, year].sort((a, b) => b - a);
      return {
        ...prev,
        years: nextYears,
        year: nextYears.length === 1 ? nextYears[0].toString() : '',
      };
    });
  };

  const selectAllYears = () => {
    setFilters(prev => ({
      ...prev,
      years: [],
      year: '',
    }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearch(filters);
  };

  const handleClear = () => {
    const defaultFilters: SearchFilters = {
      keyword: '',
      documentType: 'all',
      year: '',
      years: [],
      includeOcr: true,
      serialNumber: '',
      subject: '',
      source: '',
    };
    setFilters(defaultFilters);
    onClear();
  };

  // Active filters count calculation
  const activeFiltersCount = [
    Boolean(filters.keyword),
    filters.documentType !== 'all',
    filters.years.length > 0,
    Boolean(filters.source),
    Boolean(filters.serialNumber),
    Boolean(filters.subject),
    !filters.includeOcr, // Count if non-default
  ].filter(Boolean).length;

  return (
    <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-6" dir="rtl">
      {/* Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-[#1a202c] leading-normal flex items-center gap-2">
              <Filter className="h-5 w-5 text-[#2c5282]" />
              معايير وفلاتر البحث
            </h2>
            {currentUser?.activeDepartment && (
              <span className="inline-flex items-center gap-1.5 bg-[#f7fafc] border border-[#e2e8f0] px-3 py-1 rounded text-xs font-medium text-[#4a5568]">
                <span>نطاق البحث: {currentUser.activeDepartment.name}</span>
              </span>
            )}
          </div>
          <p className="text-sm text-[#4a5568] leading-normal mt-1">
            حدد المعايير المطلوبة للبحث المتقدم في نصوص وفهارس المراسلات
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 text-[#2c5282] border border-blue-200">
              {activeFiltersCount} فلاتر نشطة
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-[#2c5282] hover:bg-[#f7fafc] flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors duration-200"
          >
            <span>{isExpanded ? 'طي الفلاتر الإضافية' : 'توسيع الفلاتر الإضافية'}</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: نوع المراسلة (Segmented Control) */}
        <div>
          <Label className="text-sm font-semibold text-[#1a202c] mb-2.5 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#2c5282]" />
            نوع المراسلة
          </Label>
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg max-w-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('incoming')}
              className={`h-11 px-4 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all duration-150 ${
                filters.documentType === 'incoming'
                  ? 'bg-[#2c5282] text-white shadow-sm font-semibold'
                  : 'bg-transparent text-[#4a5568] hover:bg-white/80'
              }`}
            >
              <Inbox className="h-4 w-4" />
              <span>واردة</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('outgoing')}
              className={`h-11 px-4 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all duration-150 ${
                filters.documentType === 'outgoing'
                  ? 'bg-[#2c5282] text-white shadow-sm font-semibold'
                  : 'bg-transparent text-[#4a5568] hover:bg-white/80'
              }`}
            >
              <Send className="h-4 w-4" />
              <span>صادرة</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('all')}
              className={`h-11 px-4 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all duration-150 ${
                filters.documentType === 'all'
                  ? 'bg-[#2c5282] text-white shadow-sm font-semibold'
                  : 'bg-transparent text-[#4a5568] hover:bg-white/80'
              }`}
            >
              <Files className="h-4 w-4" />
              <span>الكل</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: البحث النصي + خيار OCR */}
        <div>
          <Label htmlFor="keyword" className="text-sm font-semibold text-[#1a202c] mb-2 flex items-center gap-2">
            <Search className="h-4 w-4 text-[#2c5282]" />
            البحث في النص والمحتوى
          </Label>
          <div className="relative">
            <Input
              id="keyword"
              placeholder="اكتب كلمات مفتاحية للبحث في الموضوع، المحتوى أو النصوص المستخرجة..."
              value={filters.keyword}
              onChange={(e) => handleFilterChange('keyword', e.target.value)}
              className="h-12 text-base text-right border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200 pr-4 pl-10"
            />
          </div>

          {/* OCR Checkbox Toggle */}
          <div className="mt-3 flex items-center gap-2.5">
            <label className="flex items-center gap-2 text-sm text-[#2d3748] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.includeOcr}
                onChange={(e) => handleFilterChange('includeOcr', e.target.checked)}
                className="w-4 h-4 rounded border-[#cbd5e1] text-[#2c5282] focus:ring-[#2c5282] cursor-pointer"
              />
              <span className="font-medium">البحث أيضاً داخل النص المستخرج عبر قارئ النصوص (OCR)</span>
            </label>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#2c5282] border border-blue-200">
              <Sparkles className="h-3 w-3" />
              مفهرس آلياً
            </span>
          </div>
        </div>

        {/* SECTION 3: السنوات المتاحة (Multi-Select Chips) */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <Label className="text-sm font-semibold text-[#1a202c] flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#2c5282]" />
              السنوات الإدارية المتاحة
            </Label>
            {loadingYears && (
              <span className="text-xs text-[#718096] flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                جاري التحميل...
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Chip "كل السنوات" */}
            <button
              type="button"
              onClick={selectAllYears}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                filters.years.length === 0
                  ? 'bg-[#2c5282] text-white border-[#2c5282] shadow-xs'
                  : 'bg-white text-[#4a5568] border-[#cbd5e1] hover:border-[#2c5282]'
              }`}
            >
              كل السنوات
            </button>

            {/* Chips pour chaque année réelle */}
            {availableYears.map((yr) => {
              const isSelected = filters.years.includes(yr);
              return (
                <button
                  type="button"
                  key={yr}
                  onClick={() => toggleYear(yr)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                    isSelected
                      ? 'bg-[#2c5282] text-white border-[#2c5282] shadow-xs'
                      : 'bg-white text-[#4a5568] border-[#cbd5e1] hover:border-[#2c5282]'
                  }`}
                >
                  {yr}
                </button>
              );
            })}
          </div>
        </div>

        {/* Collapsible Advanced Criteria */}
        {isExpanded && (
          <div className="pt-4 border-t border-[#edf2f7] space-y-4">
            <div className="flex items-center gap-2 mb-2 border-r-2 border-[#2c5282] pr-2.5">
              <h3 className="text-sm font-bold text-[#1a202c]">
                معايير تفصيلية إضافية
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* المصدر / الجهة */}
              <div className="space-y-1.5">
                <Label htmlFor="source" className="text-sm font-medium text-[#4a5568] mb-1 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#2c5282]" />
                  المصدر / الجهة / المصلحة
                </Label>
                <DocumentOptionCombobox
                  category="source"
                  documentType="both"
                  value={filters.source || ''}
                  onValueChange={(value) => handleFilterChange('source', value)}
                  placeholder="اختر الجهة المرسلة أو المصلحة"
                  emptyMessage="لا توجد جهات مطابقة"
                  className="h-11"
                />
              </div>

              {/* الرقم التسلسلي */}
              <div className="space-y-1.5">
                <Label htmlFor="serialNumber" className="text-sm font-medium text-[#4a5568] mb-1 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-[#2c5282]" />
                  الرقم التسلسلي
                </Label>
                <Input
                  id="serialNumber"
                  type="text"
                  placeholder="مثال: 1045"
                  value={filters.serialNumber}
                  onChange={(e) => handleFilterChange('serialNumber', e.target.value)}
                  className="h-11 text-base text-right border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200"
                />
              </div>

              {/* موضوع المراسلة */}
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="subject" className="text-sm font-medium text-[#4a5568] mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#2c5282]" />
                  موضوع المراسلة
                </Label>
                <Input
                  id="subject"
                  placeholder="ابحث في نص الموضوع مباشرة..."
                  value={filters.subject}
                  onChange={(e) => handleFilterChange('subject', e.target.value)}
                  className="h-11 text-base text-right border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-start gap-3 pt-4 border-t border-[#e2e8f0]">
          <Button
            type="submit"
            className="h-11 px-6 bg-[#2c5282] text-white hover:bg-[#2a4365] rounded font-medium flex items-center justify-center gap-2 transition-colors duration-200 w-full sm:w-auto"
          >
            <Search className="h-4 w-4" />
            <span>بحث متقدم</span>
          </Button>
          <Button
            type="button"
            onClick={handleClear}
            className="h-11 px-5 border border-[#e2e8f0] bg-white text-[#4a5568] hover:bg-[#f7fafc] rounded font-medium flex items-center justify-center gap-2 transition-colors duration-200 w-full sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" />
            <span>مسح الفلاتر</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdvancedSearch;
