export type PaginationItem = number | 'ellipsis';

/**
 * Computes pagination page numbers and ellipsis markers for a pager bar.
 */
export function getPaginationItems(
  currentPage: number,
  totalPages: number,
  siblingCount = 1
): PaginationItem[] {
  if (totalPages <= 0) {
    return [];
  }

  const totalPageNumbers = siblingCount * 2 + 5;
  if (totalPages <= totalPageNumbers) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const leftSiblingIndex = Math.max(safeCurrentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(safeCurrentPage + siblingCount, totalPages);

  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, 'ellipsis', totalPages];
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount;
    const startPage = totalPages - rightItemCount + 1;
    const rightRange = Array.from({ length: rightItemCount }, (_, i) => startPage + i);
    return [1, 'ellipsis', ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  );
  return [1, 'ellipsis', ...middleRange, 'ellipsis', totalPages];
}

export default getPaginationItems;
