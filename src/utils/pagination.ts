export type PaginationItem = number | 'ellipsis';

/**
 * Generates a truncated list of page numbers with 'ellipsis' markers
 * for accessible pagination controls (always keeps first, last, and a window around currentPage).
 */
export function getPaginationItems(
  currentPage: number,
  totalPages: number,
  siblingCount = 1
): PaginationItem[] {
  if (totalPages <= 1) return totalPages === 1 ? [1] : [];

  const totalNumbers = siblingCount * 2 + 5; // first + last + current + 2*siblings + 2 ellipses
  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRangeEnd = 3 + siblingCount * 2;
    const leftRange = Array.from({ length: leftRangeEnd }, (_, i) => i + 1);
    return [...leftRange, 'ellipsis', totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRangeCount = 3 + siblingCount * 2;
    const rightRangeStart = totalPages - rightRangeCount + 1;
    const rightRange = Array.from(
      { length: rightRangeCount },
      (_, i) => rightRangeStart + i
    );
    return [1, 'ellipsis', ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  );
  return [1, 'ellipsis', ...middleRange, 'ellipsis', totalPages];
}
