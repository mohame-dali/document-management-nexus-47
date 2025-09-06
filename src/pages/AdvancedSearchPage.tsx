
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdvancedSearch from '@/components/search/AdvancedSearch';
import SearchResults from '@/components/search/SearchResults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter } from 'lucide-react';
import { useInfiniteSearch } from '@/hooks/useInfiniteSearch';

interface SearchFilters {
  keyword: string;
  documentType: 'all' | 'incoming' | 'outgoing';
  year: string;
  dateFrom: string;
  dateTo: string;
  serialNumber: string;
  subject: string;
}

const AdvancedSearchPage = () => {
  const { currentUser } = useAuth();
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const {
    incoming,
    outgoing,
    totalCount,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    lastElementRef,
  } = useInfiniteSearch({
    filters: searchFilters,
    enabled: !!searchFilters,
  });

  const handleSearch = async (filters: SearchFilters) => {
    console.log('Performing advanced search with filters:', filters);
    setSearchFilters(filters);
    setSearchPerformed(true);
  };

  const handleClearSearch = () => {
    console.log('Clearing search');
    setSearchFilters(null);
    setSearchPerformed(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" dir="rtl">
      <div className="p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl shadow-lg">
              <Search className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                البحث المتقدم
              </h1>
              <p className="text-lg text-slate-600 mt-1">
                ابحث في الوثائق باستخدام فلاتر متقدمة والنصوص المستخرجة بـ OCR
              </p>
            </div>
          </div>
        </div>

        {/* Advanced Search Section */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Filter className="h-6 w-6 text-cyan-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">فلاتر البحث</h2>
            </div>
          </div>
          <div className="p-6">
            <AdvancedSearch onSearch={handleSearch} onClear={handleClearSearch} />
          </div>
        </div>

        {/* Search Results Section */}
        <SearchResults 
          incoming={incoming}
          outgoing={outgoing}
          isLoading={isLoading}
          searchPerformed={searchPerformed}
          totalCount={totalCount}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          lastElementRef={lastElementRef}
        />
      </div>
    </div>
  );
};

export default AdvancedSearchPage;
