import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  rows = 8, 
  columns = 5 
}) => {
  return (
    <div className="w-full space-y-2 p-4">
      <div className="flex gap-3 pb-3 border-b border-[#cbd5e1]">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-[#e2e8f0] rounded animate-pulse flex-1"
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-3 py-2 border-b border-[#f1f5f9] last:border-b-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-4 bg-[#f1f5f9] rounded animate-pulse flex-1"
              style={{
                animationDelay: `${(rowIdx * columns + colIdx) * 30}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;
