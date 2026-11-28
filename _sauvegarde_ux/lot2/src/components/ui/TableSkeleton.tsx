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
    <div className="w-full space-y-2 p-4" dir="rtl">
      <div className="flex gap-3 pb-3 border-b border-slate-200">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-slate-200 rounded animate-pulse flex-1"
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-3 py-2">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-4 bg-slate-100 rounded animate-pulse flex-1"
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
