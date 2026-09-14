import { useState, useCallback, useRef } from 'react';
import { InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { searchIncomingDocumentsPaginated, searchOutgoingDocumentsPaginated } from '@/services/documentService';
import { IncomingDocument, OutgoingDocument } from '@/types';

interface SearchFilters {
  keyword: string;
  documentType: 'all' | 'incoming' | 'outgoing';
  year: string;
  dateFrom: string;
  dateTo: string;
  serialNumber: string;
  subject: string;
}

interface SearchResultData {
  incoming: IncomingDocument[];
  outgoing: OutgoingDocument[];
  incomingPagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  } | null;
  outgoingPagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  } | null;
}

interface PaginatedSearchResult {
  incoming: IncomingDocument[];
  outgoing: OutgoingDocument[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  totalIncoming: number;
  totalOutgoing: number;
  resetSearch: () => void;
}

export const usePaginatedSearch = (filters: SearchFilters | null): PaginatedSearchResult => {
  const [searchKey, setSearchKey] = useState(0);
  const filtersRef = useRef(filters);

  // Reset search when filters change
  if (filters !== filtersRef.current) {
    filtersRef.current = filters;
    setSearchKey(prev => prev + 1);
  }

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<SearchResultData, Error, InfiniteData<SearchResultData>, [string, SearchFilters | null, number], number>({
    queryKey: ['advancedSearch', filters, searchKey],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      if (!filters) {
        return {
          incoming: [],
          outgoing: [],
          incomingPagination: null,
          outgoingPagination: null
        };
      }

      const searchParams = {
        keyword: filters.keyword,
        year: filters.year,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        serialNumber: filters.serialNumber,
        subject: filters.subject,
        page: pageParam as number,
        limit: 20,
      };

      const results: SearchResultData = {
        incoming: [],
        outgoing: [],
        incomingPagination: null,
        outgoingPagination: null,
      };

      // Search based on document type
      if (filters.documentType === 'all') {
        const [incomingResult, outgoingResult] = await Promise.all([
          searchIncomingDocumentsPaginated(searchParams),
          searchOutgoingDocumentsPaginated(searchParams),
        ]);
        results.incoming = incomingResult.data;
        results.outgoing = outgoingResult.data;
        results.incomingPagination = incomingResult.pagination;
        results.outgoingPagination = outgoingResult.pagination;
      } else if (filters.documentType === 'incoming') {
        const incomingResult = await searchIncomingDocumentsPaginated(searchParams);
        results.incoming = incomingResult.data;
        results.incomingPagination = incomingResult.pagination;
      } else if (filters.documentType === 'outgoing') {
        const outgoingResult = await searchOutgoingDocumentsPaginated(searchParams);
        results.outgoing = outgoingResult.data;
        results.outgoingPagination = outgoingResult.pagination;
      }

      return results;
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length + 1;
      const hasMoreIncoming = lastPage.incomingPagination?.hasMore ?? false;
      const hasMoreOutgoing = lastPage.outgoingPagination?.hasMore ?? false;
      
      // Return next page if any type has more results
      if (hasMoreIncoming || hasMoreOutgoing) {
        return currentPage;
      }
      return undefined;
    },
    enabled: !!filters,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const resetSearch = useCallback(() => {
    refetch();
  }, [refetch]);

  // Flatten all pages into single arrays
  const allIncoming = data?.pages?.flatMap(page => page.incoming) ?? [];
  const allOutgoing = data?.pages?.flatMap(page => page.outgoing) ?? [];

  // Calculate totals from the first page
  const totalIncoming = data?.pages?.[0]?.incomingPagination?.totalCount ?? 0;
  const totalOutgoing = data?.pages?.[0]?.outgoingPagination?.totalCount ?? 0;

  return {
    incoming: allIncoming,
    outgoing: allOutgoing,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    totalIncoming,
    totalOutgoing,
    resetSearch,
  };
};
