import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdvancedSearch, { SearchFilters } from '@/components/search/AdvancedSearch';
import SearchResults from '@/components/search/SearchResults';
import { Search, Building2 } from 'lucide-react';
import { useInfiniteSearch } from '@/hooks/useInfiniteSearch';

const AdvancedSearchPage: React.FC = () => {
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
    fetchNextPage,
    lastElementRef,
  } = useInfiniteSearch({
    filters: searchFilters,
    enabled: !!searchFilters,
  });

  const handleSearch = (filters: SearchFilters) => {
    setSearchFilters(filters);
    setSearchPerformed(true);
  };

  const handleClearSearch = () => {
    setSearchFilters(null);
    setSearchPerformed(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-4 sm:p-6 lg:p-8 space-y-6" dir="rtl">
      {/* Institutional AdminLTE Page Header */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded bg-[#2c5282] text-white flex items-center justify-center flex-shrink-0">
            <Search className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2c5282] leading-normal flex items-center gap-2.5">
              البحث المتقدم في المراسلات
            </h1>
            <p className="text-sm sm:text-base text-[#4a5568] leading-normal mt-1">
              محرك استعلام إداري متقدم للبحث في نصوص وفهارس المراسلات الواردة والصادرة والنصوص المقروءة آلياً (OCR)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {currentUser?.activeDepartment && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold bg-white border border-[#cbd5e1] text-[#2d3748]">
              <Building2 className="h-4 w-4 text-[#2c5282]" />
              <span>{currentUser.activeDepartment.name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Advanced Filters Section */}
      <AdvancedSearch 
        onSearch={handleSearch} 
        onClear={handleClearSearch} 
      />

      {/* Search Results & Pagination Section */}
      <SearchResults 
        incoming={incoming}
        outgoing={outgoing}
        isLoading={isLoading}
        searchPerformed={searchPerformed}
        totalCount={totalCount}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        onFetchNextPage={fetchNextPage}
        lastElementRef={lastElementRef}
        searchedKeyword={searchFilters?.keyword || ''}
      />
    </div>
  );
};

export default AdvancedSearchPage;
