import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PlusCircle, LayoutGrid, LayoutList, Search, Calendar, FileText, Clock, Users, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

import { getDepartments } from '@/services/departmentService';
import { getDocumentOptions } from '@/services/documentOptionsService';
import { useAuth } from '@/contexts/AuthContext';
import { IncomingDocument } from '@/types';
import DocumentDataGrid from '@/components/documents/DocumentDataGrid';
import { useInfiniteDocuments } from '@/hooks/useInfiniteDocuments';
import { useYearPersistence } from '@/hooks/useYearPersistence';
import { useQuery } from '@tanstack/react-query';
import ScrollToTop from '@/components/common/ScrollToTop';

const translations = {
  title: 'الوثائق الواردة',
  addDocument: 'إضافة وثيقة',
  search: 'بحث...',
  filter: 'تصفية',
  all: 'الكل',
  year: 'السنة',
  enterYear: 'أدخل السنة',
  department: 'القسم',
  noDocuments: 'لا توجد وثائق واردة',
  serialNumber: 'رقم التسلسل',
  subject: 'الموضوع',
  arrivalDate: 'تاريخ الوصول',
  source: 'المصدر',
  viewDetails: 'عرض التفاصيل',
  loading: 'جاري التحميل...',
  error: 'حدث خطأ أثناء تحميل المستندات',
  loadingMore: 'تحميل المزيد...',
  noMoreDocuments: 'لا توجد مستندات إضافية'
};

const IncomingDocumentsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all_sources');
  
  // Use year persistence hook
  const { selectedYear, handleYearChange, isValidYear } = useYearPersistence('incomingDocumentsSelectedYear');

  // AdminTuningDesk can now add documents (along with Admin)
  const canAddDocuments = currentUser?.role === 'Admin' || currentUser?.role === 'AdminTuningDesk';

  // Fetch departments for AdminTuningDesk filtering
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    enabled: currentUser?.role === 'AdminTuningDesk'
  });

  // Fetch source options for source filtering
  const { data: sourceOptions = [] } = useQuery({
    queryKey: ['documentOptions', 'source', 'incoming'],
    queryFn: () => getDocumentOptions({ category: 'source', documentType: 'incoming' }),
    enabled: true,
  });

  // Use infinite scrolling hook
  const {
    documents,
    totalCount,
    loadedCount,
    isLoading,
    isError,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    lastDocumentElementRef,
    refetch
  } = useInfiniteDocuments({
    documentType: 'incoming',
    year: selectedYear,
    department: selectedDepartment,
    source: selectedSource,
    enabled: isValidYear
  });

  // Auto-refresh when user returns to this page
  React.useEffect(() => {
    const handleFocus = () => {
      if (isValidYear) {
        refetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch, isValidYear]);

  // Filter documents based on search query
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc: IncomingDocument) => {
      const matchesSearch = 
        String(doc.serialNumber).toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.source && doc.source.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [documents, searchQuery]);

  const handleAddDocument = () => {
    navigate('/dashboard/incoming-documents/create');
  };

  const handleViewDocument = (id: string) => {
    navigate(`/dashboard/incoming-documents/${id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
  };

  // Show loading only when actually fetching
  if (isLoading && isValidYear) {
    return (
      <div className="container mx-auto p-4 space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{translations.title}</h1>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="overflow-hidden border-0 shadow-md">
              <CardContent className="p-0">
                <div className="p-6">
                  <Skeleton className="h-4 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError && isValidYear) {
    return (
      <div className="container mx-auto p-4" dir="rtl">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FileText className="h-5 w-5 text-red-600" />
            </div>
            <p className="font-medium">{translations.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7fafc]" dir="rtl">
      <div className="container mx-auto p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="bg-white rounded border border-[#e2e8f0] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-[#ebf4ff] rounded border border-[#bee3f8] text-[#2c5282] shadow-xs">
                <FileText className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">
                  {translations.title}
                </h1>
                <p className="text-sm text-[#4a5568] mt-1">إدارة ومتابعة الوثائق الواردة</p>
              </div>
            </div>

            {/* Show add button for Admin and AdminTuningDesk */}
            {canAddDocuments && (
              <Button onClick={handleAddDocument} className="bg-[#2c5282] hover:bg-[#234269] text-white rounded shadow-sm transition-colors duration-200">
                <PlusCircle className="w-4 h-4 ml-2" /> 
                {translations.addDocument}
              </Button>
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded border border-[#e2e8f0] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-wrap">
              {/* Search Input */}
              <div className="relative min-w-72">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder={translations.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 text-right border-[#e2e8f0] focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]/20 rounded shadow-xs text-sm"
                />
              </div>
              
              {/* Year Filter */}
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder={translations.enterYear}
                  value={selectedYear}
                  onChange={handleYearChange}
                  className="w-32 pr-9 text-right border-[#e2e8f0] focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]/20 rounded shadow-xs text-sm"
                  maxLength={4}
                  type="text"
                />
              </div>

              {/* Department Filter - Only for AdminTuningDesk */}
              {currentUser?.role === 'AdminTuningDesk' && departments && (
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-full sm:w-48 border-[#e2e8f0] focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]/20 rounded shadow-xs text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-500" />
                      <SelectValue placeholder={translations.department} />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded border-[#e2e8f0] shadow-md">
                    <SelectItem value="all" className="rounded">{translations.all}</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept._id} value={dept._id} className="rounded">{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Source Filter */}
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="w-full sm:w-48 border-[#e2e8f0] focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]/20 rounded shadow-xs text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <SelectValue placeholder="اختر المصدر..." />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded border-[#e2e8f0] shadow-md">
                  <SelectItem value="all_sources" className="rounded">جميع المصادر</SelectItem>
                  {sourceOptions.filter(option => option.isActive).map((option) => (
                    <SelectItem key={option._id} value={option.value} className="rounded">
                      {option.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex bg-[#edf2f7] rounded p-1 border border-[#e2e8f0]">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`rounded transition-colors duration-200 h-8 px-2.5 ${
                  viewMode === 'grid' 
                    ? 'bg-[#2c5282] text-white shadow-xs' 
                    : 'text-[#4a5568] hover:text-[#1a202c]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`rounded transition-colors duration-200 h-8 px-2.5 ${
                  viewMode === 'list' 
                    ? 'bg-[#2c5282] text-white shadow-xs' 
                    : 'text-[#4a5568] hover:text-[#1a202c]'
                }`}
              >
                <LayoutList className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Active Year Display */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Clock className="w-4 h-4 text-[#2c5282]" />
            <Badge variant="secondary" className="text-xs bg-[#ebf4ff] text-[#2c5282] border-[#bee3f8] rounded">
              {translations.year}: {selectedYear || new Date().getFullYear()}
            </Badge>
            {filteredDocuments.length > 0 && (
              <Badge variant="outline" className="text-xs bg-[#ebf8f1] text-[#22543d] border-[#bbf0d0] rounded">
                {filteredDocuments.length} من {totalCount} وثيقة
              </Badge>
            )}
            {selectedSource !== 'all_sources' && (
              <Badge variant="outline" className="text-xs bg-[#f1f5f9] text-[#475569] border-[#e2e8f0] rounded">
                المصدر: {selectedSource}
              </Badge>
            )}
            {isFetching && !isFetchingNextPage && (
              <Badge variant="outline" className="text-xs bg-[#ebf4ff] text-[#2c5282] border-[#bee3f8] rounded">
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
                {translations.loading}
              </Badge>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded border border-[#e2e8f0] shadow-sm overflow-hidden">
          {/* Show message if year is incomplete */}
          {!isValidYear ? (
            <div className="text-center py-20">
              <div className="p-4 bg-blue-50 rounded-2xl inline-block mb-4">
                <Calendar className="h-12 w-12 text-blue-500 mx-auto" />
              </div>
              <p className="text-slate-600 text-lg">أدخل سنة كاملة (4 أرقام) لعرض المستندات</p>
            </div>
          ) : filteredDocuments.length === 0 && !isLoading ? (
            <div className="text-center py-20">
              <div className="p-4 bg-slate-50 rounded-2xl inline-block mb-4">
                <FileText className="h-12 w-12 text-slate-400 mx-auto" />
              </div>
              <p className="text-slate-600 text-lg">{translations.noDocuments}</p>
            </div>
          ) : (
            <div className="p-6">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredDocuments.map((doc: IncomingDocument, index: number) => {
                    const isLast = index === filteredDocuments.length - 1;
                    return (
                      <Card 
                        key={doc._id}
                        ref={isLast ? lastDocumentElementRef : null}
                        className="group overflow-hidden cursor-pointer border border-[#e2e8f0] shadow-sm hover:shadow hover:border-[#cbd5e1] rounded transition-all duration-200 bg-white"
                        onClick={() => handleViewDocument(doc._id)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="p-2 bg-[#ebf4ff] rounded border border-[#bee3f8] text-[#2c5282] transition-colors duration-200">
                              <FileText className="h-4 w-4" />
                            </div>
                            <Badge variant="outline" className="text-xs bg-[#f7fafc] text-[#4a5568] border-[#e2e8f0] rounded">
                              #{doc.serialNumber}
                            </Badge>
                          </div>
                          
                          <h3 className="font-medium text-sm text-[#1a202c] line-clamp-2 mb-2 group-hover:text-[#2c5282] transition-colors duration-200 leading-snug">
                            {doc.subject}
                          </h3>
                          
                          <div className="space-y-1.5 text-xs text-[#718096]">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-[#a0aec0]" />
                              <span>{formatDate(doc.arrivalDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-3.5 w-3.5 text-[#a0aec0]" />
                              <span className="truncate">{doc.source}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <DocumentDataGrid 
                  documents={filteredDocuments} 
                  type="incoming" 
                />
              )}

              {/* Load More / Loading States */}
              {isFetchingNextPage && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                  <p className="text-slate-600">{translations.loadingMore}</p>
                </div>
              )}

              {!hasNextPage && filteredDocuments.length > 0 && (
                <div className="text-center py-8">
                  <div className="p-3 bg-green-50 rounded-xl inline-block mb-2">
                    <Clock className="w-6 h-6 text-green-500 mx-auto" />
                  </div>
                  <p className="text-slate-600">{translations.noMoreDocuments}</p>
                  <p className="text-sm text-slate-500 mt-1">تم عرض جميع المستندات ({loadedCount} من {totalCount})</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ScrollToTop />
    </div>
  );
};

export default IncomingDocumentsPage;