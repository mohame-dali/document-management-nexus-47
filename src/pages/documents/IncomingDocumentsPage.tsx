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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30" dir="rtl">
      <div className="container mx-auto p-4 space-y-6">
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {translations.title}
                </h1>
                <p className="text-slate-600 mt-1">إدارة ومتابعة الوثائق الواردة</p>
              </div>
            </div>

            {/* Show add button for Admin and AdminTuningDesk */}
            {canAddDocuments && (
              <Button onClick={handleAddDocument} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <PlusCircle className="w-5 h-5 ml-2" /> 
                {translations.addDocument}
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Filters Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Search Input */}
              <div className="relative min-w-80">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder={translations.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 text-right border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl shadow-sm"
                />
              </div>
              
              {/* Year Filter */}
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder={translations.enterYear}
                  value={selectedYear}
                  onChange={handleYearChange}
                  className="w-32 pr-10 text-right border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl shadow-sm"
                  maxLength={4}
                  type="text"
                />
              </div>

              {/* Department Filter - Only for AdminTuningDesk */}
              {currentUser?.role === 'AdminTuningDesk' && departments && (
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-full sm:w-48 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-500" />
                      <SelectValue placeholder={translations.department} />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    <SelectItem value="all" className="rounded-lg">{translations.all}</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept._id} value={dept._id} className="rounded-lg">{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`rounded-lg transition-all duration-200 ${
                  viewMode === 'grid' 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`rounded-lg transition-all duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <LayoutList className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Active Year Display */}
          <div className="mt-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <Badge variant="secondary" className="text-sm bg-blue-50 text-blue-700 border-blue-200 rounded-lg">
              {translations.year}: {selectedYear || new Date().getFullYear()}
            </Badge>
            {filteredDocuments.length > 0 && (
              <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-200 rounded-lg">
                {filteredDocuments.length} من {totalCount} وثيقة
              </Badge>
            )}
            {isFetching && !isFetchingNextPage && (
              <Badge variant="outline" className="text-sm bg-blue-50 text-blue-700 border-blue-200 rounded-lg">
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
                {translations.loading}
              </Badge>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
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
                        className="group overflow-hidden cursor-pointer border-0 shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-white to-slate-50/50"
                        onClick={() => handleViewDocument(doc._id)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200 rounded-md">
                              #{doc.serialNumber}
                            </Badge>
                          </div>
                          
                          <h3 className="font-semibold text-slate-800 line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors">
                            {doc.subject}
                          </h3>
                          
                          <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <span>{formatDate(doc.arrivalDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-slate-400" />
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