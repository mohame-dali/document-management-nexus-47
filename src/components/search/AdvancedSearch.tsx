import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Calendar, 
  FileText, 
  Hash, 
  Building2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface SearchFilters {
  keyword: string;
  documentType: 'all' | 'incoming' | 'outgoing';
  year: string;
  dateFrom: string;
  dateTo: string;
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
    year: new Date().getFullYear().toString(),
    dateFrom: '',
    dateTo: '',
    serialNumber: '',
    subject: '',
    source: '',
  });

  const [isExpanded, setIsExpanded] = useState(true);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d{1,4}$/.test(value)) {
      handleFilterChange('year', value);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearch(filters);
  };

  const handleClear = () => {
    const defaultFilters: SearchFilters = {
      keyword: '',
      documentType: 'all',
      year: new Date().getFullYear().toString(),
      dateFrom: '',
      dateTo: '',
      serialNumber: '',
      subject: '',
      source: '',
    };
    setFilters(defaultFilters);
    onClear();
  };

  const activeFiltersCount = [
    Boolean(filters.keyword),
    filters.documentType !== 'all',
    Boolean(filters.source),
    Boolean(filters.serialNumber),
    Boolean(filters.subject),
    Boolean(filters.dateFrom),
    Boolean(filters.dateTo),
  ].filter(Boolean).length;

  return (
    <div className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6" dir="rtl">
      {/* Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a202c] leading-normal flex items-center gap-2">
            <Filter className="h-5 w-5 text-[#2c5282]" />
            معايير وفلاتر البحث
          </h2>
          <p className="text-base text-[#4a5568] leading-relaxed mt-1">
            حدد المعايير المطلوبة للبحث المتقدم في نصوص وفهارس المراسلات
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-sm font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
              {activeFiltersCount} فلاتر نشطة
            </span>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-base text-[#2c5282] hover:bg-gray-100 flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors duration-200"
          >
            <span>{isExpanded ? 'طي الفلاتر الإضافية' : 'توسيع الفلاتر الإضافية'}</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Primary Keyword / OCR Search Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="keyword" className="text-base font-semibold text-[#1a202c] flex items-center gap-2">
              <Search className="h-4 w-4 text-[#2c5282]" />
              البحث في النص والمحتوى المفهرس (OCR)
            </Label>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-[#78350f] border border-[#FFD758]">
              <Sparkles className="h-3 w-3 text-[#78350f]" />
              يشمل النصوص المقروءة آلياً
            </span>
          </div>

          <div className="relative">
            <Input
              id="keyword"
              placeholder="اكتب كلمات مفتاحية للبحث في الموضوع، المحتوى أو النصوص المستخرجة عبر OCR..."
              value={filters.keyword}
              onChange={(e) => handleFilterChange('keyword', e.target.value)}
              className="h-12 text-base text-right border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200 pr-4"
            />
          </div>
          <p className="text-sm text-[#4a5568] leading-relaxed">
            يمكنك إدخال اسم ملف، عبارة من نص الخطاب، أو اسم مسؤول للبحث الفوري.
          </p>
        </div>

        {/* Collapsible Advanced Criteria Grid */}
        {isExpanded && (
          <div className="space-y-6 pt-4 border-t border-[#f1f5f9]">
            {/* Row 1: Document Type & Source */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="documentType" className="text-base font-medium text-[#2d3748] flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#2c5282]" />
                  نوع المراسلة
                </Label>
                <Select 
                  value={filters.documentType} 
                  onValueChange={(value) => handleFilterChange('documentType', value as 'all' | 'incoming' | 'outgoing')}
                >
                  <SelectTrigger id="documentType" className="h-11 text-base text-right border-[#cbd5e1] rounded bg-white">
                    <SelectValue placeholder="اختر نوع المراسلة" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all" className="text-base">جميع الوثائق (الواردة والصادرة)</SelectItem>
                    <SelectItem value="incoming" className="text-base">الوثائق الواردة فقط</SelectItem>
                    <SelectItem value="outgoing" className="text-base">الوثائق الصادرة فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source" className="text-base font-medium text-[#2d3748] flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#2c5282]" />
                  المصدر / الجهة / المصلحة
                </Label>
                <Input
                  id="source"
                  placeholder="ابحث بالجهة المرسلة أو المصلحة المعنية..."
                  value={filters.source}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                  className="h-11 text-base text-right border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200"
                />
              </div>
            </div>

            {/* Row 2: Serial Number, Year, Subject */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="serialNumber" className="text-base font-medium text-[#2d3748] flex items-center gap-2">
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

              <div className="space-y-2">
                <Label htmlFor="year" className="text-base font-medium text-[#2d3748] flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#2c5282]" />
                  السنة الإدارية
                </Label>
                <Input
                  id="year"
                  placeholder="مثال: 2026"
                  value={filters.year}
                  onChange={handleYearChange}
                  maxLength={4}
                  className="h-11 text-base text-right border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-base font-medium text-[#2d3748] flex items-center gap-2">
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

            {/* Row 3: Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-base font-medium text-[#2d3748] flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#2c5282]" />
                  من تاريخ
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="h-11 text-base text-right border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200 bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-base font-medium text-[#2d3748] flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#2c5282]" />
                  إلى تاريخ
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="h-11 text-base text-right border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Controls & Department Scope */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#e2e8f0]">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="submit"
              className="h-11 px-7 text-base font-semibold text-white bg-[#2c5282] hover:bg-[#234269] rounded flex items-center justify-center gap-2 transition-colors duration-200 w-full sm:w-auto"
            >
              <Search className="h-4 w-4" />
              <span>بحث متقدم</span>
            </Button>

            <Button
              type="button"
              onClick={handleClear}
              className="h-11 px-5 text-base font-semibold bg-[#FFCB56] hover:bg-[#f6be3c] text-[#78350f] border border-[#FFD758] rounded flex items-center justify-center gap-2 transition-colors duration-200 w-full sm:w-auto"
            >
              <RotateCcw className="h-4 w-4" />
              <span>مسح الفلاتر</span>
            </Button>
          </div>

          {currentUser?.activeDepartment && (
            <div className="text-sm text-[#4a5568] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FFCB56]" />
              <span>نطاق البحث:</span>
              <span className="font-semibold text-[#1a202c]">
                {currentUser.activeDepartment.name}
              </span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default AdvancedSearch;
