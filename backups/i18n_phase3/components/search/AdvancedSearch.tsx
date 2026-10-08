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
import DocumentOptionCombobox from '@/components/ui/document-option-combobox';

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
        {/* SECTION 1: البحث النصي (Recherche textuelle) */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 border-r-2 border-[#2c5282] pr-2.5">
            <h3 className="text-sm font-bold text-[#1a202c]">
              البحث النصي
            </h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyword" className="text-sm font-medium text-[#4a5568] mb-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-[#2c5282]" />
              البحث في النص والمحتوى المفهرس (OCR)
            </Label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Input
                  id="keyword"
                  placeholder="اكتب كلمات مفتاحية للبحث في الموضوع، المحتوى أو النصوص المستخرجة عبر OCR..."
                  value={filters.keyword}
                  onChange={(e) => handleFilterChange('keyword', e.target.value)}
                  className="h-12 text-base text-right border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200 pr-4"
                />
              </div>
              <span className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded bg-slate-100 text-[#4a5568] border border-[#cbd5e1] whitespace-nowrap self-start sm:self-center">
                <Sparkles className="h-3.5 w-3.5 text-[#2c5282]" />
                يشمل النصوص المقروءة آلياً
              </span>
            </div>
            <p className="text-xs text-[#718096] leading-relaxed">
              يمكنك إدخال اسم ملف، عبارة من نص الخطاب، أو اسم مسؤول للبحث الفوري.
            </p>
          </div>
        </div>

        {/* Collapsible Advanced Criteria */}
        {isExpanded && (
          <div className="pt-2">
            {/* SECTION 2: معايير التصنيف (Critères de classification) */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 border-r-2 border-[#2c5282] pr-2.5">
                <h3 className="text-sm font-bold text-[#1a202c]">
                  معايير التصنيف
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* نوع المراسلة */}
                <div className="space-y-1.5">
                  <Label htmlFor="documentType" className="text-sm font-medium text-[#4a5568] mb-2 flex items-center gap-2">
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

                {/* المصدر / الجهة */}
                <div className="space-y-1.5">
                  <Label htmlFor="source" className="text-sm font-medium text-[#4a5568] mb-2 flex items-center gap-2">
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

                {/* السنة الإدارية */}
                <div className="space-y-1.5">
                  <Label htmlFor="year" className="text-sm font-medium text-[#4a5568] mb-2 flex items-center gap-2">
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

                {/* الرقم التسلسلي */}
                <div className="space-y-1.5">
                  <Label htmlFor="serialNumber" className="text-sm font-medium text-[#4a5568] mb-2 flex items-center gap-2">
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

                {/* موضوع المراسلة (pleine largeur ou 2e colonne) */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="subject" className="text-sm font-medium text-[#4a5568] mb-2 flex items-center gap-2">
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

            {/* SECTION 3: الفترة الزمنية (Période) */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 border-r-2 border-[#2c5282] pr-2.5">
                <h3 className="text-sm font-bold text-[#1a202c]">
                  الفترة الزمنية
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dateFrom" className="text-sm font-medium text-[#4a5568] mb-2 flex items-center gap-2">
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

                <div className="space-y-1.5">
                  <Label htmlFor="dateTo" className="text-sm font-medium text-[#4a5568] mb-2 flex items-center gap-2">
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
