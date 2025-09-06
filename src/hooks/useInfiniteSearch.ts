import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { advancedSearchDocuments } from '@/services/documentService';
import { IncomingDocument, OutgoingDocument } from '@/types';

interface SearchFilters {
  keyword?: string;
  documentType?: 'all' | 'incoming' | 'outgoing';
  year?: string;
  dateFrom?: string;
  dateTo?: string;
  serialNumber?: string;
  subject?: string;
  source?: string;
}

interface SearchPage {
  incoming: IncomingDocument[];
  outgoing: OutgoingDocument[];
  page: number;
  limit: number;
  hasMore: boolean;
  totalCount: number;
}

interface UseInfiniteSearchProps {
  filters: SearchFilters | null;
  enabled?: boolean;
}

export const useInfiniteSearch = ({ 
  filters, 
  enabled = true 
}: UseInfiniteSearchProps) => {
  const observerRef = useRef<IntersectionObserver>();

  const fetchSearchResults = useCallback(
    async ({ pageParam = 1 }): Promise<SearchPage> => {
      if (!filters) {
        return {
          incoming: [],
          outgoing: [],
          page: 1,
          limit: 20,
          hasMore: false,
          totalCount: 0
        };
      }

      const searchFilters = {
        ...filters,
        page: pageParam,
        limit: 20,
        // Convert 'all_sources' back to empty string for backend
        source: filters.source === 'all_sources' ? '' : filters.source
      };

      const result = await advancedSearchDocuments(searchFilters);
      
      return {
        incoming: result.incoming || [],
        outgoing: result.outgoing || [],
        page: pageParam,
        limit: 20,
        hasMore: result.hasMore || false,
        totalCount: result.totalCount || (result.incoming?.length || 0) + (result.outgoing?.length || 0)
      };
    },
    [filters]
  );

  const queryKey = [
    'advancedSearch',
    'infinite',
    filters?.keyword,
    filters?.documentType,
    filters?.year,
    filters?.dateFrom,
    filters?.dateTo,
    filters?.serialNumber,
    filters?.subject,
    filters?.source
  ];

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    refetch
  } = useInfiniteQuery({
    queryKey,
    queryFn: fetchSearchResults,
    initialPageParam: 1,
    enabled: enabled && !!filters,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Set up intersection observer for infinite scrolling
  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (isFetchingNextPage) return;
      
      if (observerRef.current) observerRef.current.disconnect();
      
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      }, {
        threshold: 0.1,
        rootMargin: '100px'
      });
      
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, fetchNextPage, hasNextPage]
  );

  // Clean up observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Flatten all pages into single arrays
  const allIncoming = data?.pages.flatMap(page => page.incoming) || [];
  const allOutgoing = data?.pages.flatMap(page => page.outgoing) || [];
  const totalCount = data?.pages[0]?.totalCount || 0;
  const isLoading = status === 'pending';
  const isError = status === 'error';

  return {
    incoming: allIncoming,
    outgoing: allOutgoing,
    totalCount,
    error,
    isLoading,
    isError,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    lastElementRef,
    refetch
  };
};