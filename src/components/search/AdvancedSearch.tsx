
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Filter, 
  X, 
  Calendar, 
  FileText, 
  Hash, 
  MessageSquare,
  Sparkles,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

interface SearchFilters {
  keyword: string;
  documentType: 'all' | 'incoming' | 'outgoing';
  year: string;
  dateFrom: string;
  dateTo: string;
  serialNumber: string;
  subject: string;
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
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d{1,4}$/.test(value)) {
      handleFilterChange('year', value);
    }
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleClear = () => {
    setFilters({
      keyword: '',
      documentType: 'all',
      year: new Date().getFullYear().toString(),
      dateFrom: '',
      dateTo: '',
      serialNumber: '',
      subject: '',
    });
    onClear();
  };

  const hasActiveFilters = filters.keyword || filters.documentType !== 'all' || 
    filters.dateFrom || filters.dateTo || filters.serialNumber || filters.subject;

  return (
    <div className="space-y-6">
      {/* Main Search Section */}
      <Card className="shadow-lg border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-1">
          <CardHeader className="bg-white m-1 rounded-lg">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Sparkles className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">البحث الذكي</h3>
                <p className="text-sm text-gray-600 font-normal">ابحث في محتوى الوثائق والنصوص المستخرجة</p>
              </div>
            </CardTitle>
          </CardHeader>
        </div>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyword" className="text-base font-medium flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                البحث في النص (OCR)
              </Label>
              <Input
                id="keyword"
                placeholder="ابحث في محتوى الوثائق، الموضوع، المصدر..."
                value={filters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                className="h-12 text-right border-gray-200 focus:border-cyan-500 focus:ring-cyan-500"
              />
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                <p className="text-xs text-cyan-700 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  البحث في النصوص المستخرجة بواسطة OCR ومحتوى الوثائق
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      <Card className="shadow-lg border-0">
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Filter className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-lg font-semibold text-gray-800">الفلاتر المتقدمة</span>
              {hasActiveFilters && (
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <Button variant="ghost" size="sm" className="text-gray-500">
              {isExpanded ? 'إخفاء' : 'إظهار'}
            </Button>
          </CardTitle>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="p-6 space-y-6">
            {/* Document Type */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                نوع الوثيقة
              </Label>
              <Select 
                value={filters.documentType} 
                onValueChange={(value) => handleFilterChange('documentType', value)}
              >
                <SelectTrigger className="h-12 text-right border-gray-200 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الوثائق</SelectItem>
                  <SelectItem value="incoming">الوثائق الواردة</SelectItem>
                  <SelectItem value="outgoing">الوثائق الصادرة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Date Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Year */}
              <div className="space-y-3">
                <Label htmlFor="year" className="text-base font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  السنة
                </Label>
                <div className="relative">
                  <Input
                    id="year"
                    placeholder="2024"
                    value={filters.year}
                    onChange={handleYearChange}
                    className="h-12 text-right border-gray-200 focus:border-blue-500"
                    maxLength={4}
                    type="text"
                  />
                </div>
              </div>

              {/* Date From */}
              <div className="space-y-3">
                <Label htmlFor="dateFrom" className="text-base font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  من تاريخ
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="h-12 text-right border-gray-200 focus:border-blue-500"
                />
              </div>

              {/* Date To */}
              <div className="space-y-3">
                <Label htmlFor="dateTo" className="text-base font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  إلى تاريخ
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="h-12 text-right border-gray-200 focus:border-blue-500"
                />
              </div>
            </div>

            <Separator />

            {/* Serial Number and Subject */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="serialNumber" className="text-base font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-500" />
                  الرقم التسلسلي
                </Label>
                <Input
                  id="serialNumber"
                  placeholder="ابحث بالرقم التسلسلي..."
                  value={filters.serialNumber}
                  onChange={(e) => handleFilterChange('serialNumber', e.target.value)}
                  className="h-12 text-right border-gray-200 focus:border-blue-500"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="subject" className="text-base font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  الموضوع
                </Label>
                <Input
                  id="subject"
                  placeholder="ابحث بالموضوع..."
                  value={filters.subject}
                  onChange={(e) => handleFilterChange('subject', e.target.value)}
                  className="h-12 text-right border-gray-200 focus:border-blue-500"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Action Buttons */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleSearch} 
              className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
            >
              <Search className="h-5 w-5 mr-2" />
              بحث متقدم
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClear}
              className="h-12 px-6 border-gray-200 hover:bg-gray-50"
            >
              <X className="h-4 w-4 mr-2" />
              مسح الفلاتر
            </Button>
          </div>
          
          {currentUser?.activeDepartment && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-blue-700 font-medium">
                  البحث في: {currentUser.activeDepartment.name}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedSearch;
