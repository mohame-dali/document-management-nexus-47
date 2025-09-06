import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { getIncomingDocuments, getOutgoingDocuments } from '@/services/documentService';
import { IncomingDocument, OutgoingDocument } from '@/types';

interface UseInfiniteDocumentsProps {
  documentType: 'incoming' | 'outgoing';
  year: string;
  department?: string;
  source?: string;
  enabled?: boolean;
}

interface DocumentPage {
  data: (IncomingDocument | OutgoingDocument)[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const useInfiniteDocuments = ({ 
  documentType, 
  year, 
  department,
  source,
  enabled = true 
}: UseInfiniteDocumentsProps) => {
  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchDocuments = useCallback(
    async ({ pageParam = 1 }): Promise<DocumentPage> => {
      const filters = {
        year,
        department: department === 'all' ? undefined : department,
        source: source && source !== 'all_sources' ? source : undefined,
        page: pageParam,
        limit: 20
      };

      if (documentType === 'incoming') {
        const result = await getIncomingDocuments(filters);
        return {
          data: result.data,
          totalCount: result.totalCount,
          page: result.page,
          limit: result.limit,
          hasMore: result.hasMore
        };
      } else {
        const result = await getOutgoingDocuments(filters);
        return {
          data: result.data,
          totalCount: result.totalCount,
          page: result.page,
          limit: result.limit,
          hasMore: result.hasMore
        };
      }
    },
    [documentType, year, department, source]
  );

  const queryKey = [
    documentType === 'incoming' ? 'incomingDocuments' : 'outgoingDocuments',
    'infinite',
    year,
    department,
    source
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
    queryFn: fetchDocuments,
    initialPageParam: 1,
    enabled: enabled && year.length === 4 && /^\d{4}$/.test(year),
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Set up intersection observer for infinite scrolling
  const lastDocumentElementRef = useCallback(
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

  // Flatten all pages into a single array of documents
  const allDocuments = data?.pages.flatMap(page => page.data) || [];
  const totalCount = data?.pages[0]?.totalCount || 0;
  const loadedCount = allDocuments.length; // Current number of loaded documents
  const isLoading = status === 'pending';
  const isError = status === 'error';

  return {
    documents: allDocuments,
    totalCount,
    loadedCount,
    error,
    isLoading,
    isError,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    lastDocumentElementRef,
    refetch
  };
};