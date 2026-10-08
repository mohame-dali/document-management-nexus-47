import React from 'react';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { dot: 'w-2 h-2', text: 'text-[10px]' },
  md: { dot: 'w-2.5 h-2.5', text: 'text-xs' },
  lg: { dot: 'w-3 h-3', text: 'text-sm' },
};

export const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({
  isOnline,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const { dot, text } = sizeMap[size];
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span
        className={`${dot} rounded-full ${
          isOnline ? 'bg-emerald-500' : 'bg-slate-300'
        } ${isOnline ? 'ring-2 ring-white' : ''}`}
        title={isOnline ? 'متصل الآن' : 'غير متصل'}
      />
      {showLabel && (
        <span className={`${text} font-medium ${
          isOnline ? 'text-emerald-600' : 'text-slate-400'
        }`}>
          {isOnline ? 'متصل الآن' : 'غير متصل'}
        </span>
      )}
    </div>
  );
};

export default OnlineIndicator;
