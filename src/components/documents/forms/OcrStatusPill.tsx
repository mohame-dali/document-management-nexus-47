import React from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';
import { OcrState } from '@/utils/ocrSubjectHelper';
import { cn } from '@/lib/utils';

interface OcrStatusPillProps {
  state: OcrState;
  compact?: boolean;
  className?: string;
}

const OcrStatusPill: React.FC<OcrStatusPillProps> = ({
  state,
  compact = false,
  className,
}) => {
  const { t } = useLanguage();

  if (state.status === 'idle') {
    return null;
  }

  if (state.status === 'processing') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800/80 bg-blue-50/90 dark:bg-blue-950/50 text-[#1e3a5f] dark:text-blue-200 font-medium transition-all',
          compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs sm:text-[13px]',
          className
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2c5282] dark:text-blue-400 shrink-0" />
        <span className="animate-pulse">{t('documents.forms.ocrStatus.processing')}</span>
        {state.progress > 0 && state.progress < 100 && (
          <span className="font-mono text-[12px] font-semibold text-[#2c5282] dark:text-blue-300 tabular-nums shrink-0">
            <bdi dir="ltr">{state.progress}%</bdi>
          </span>
        )}
      </div>
    );
  }

  if (state.status === 'completed') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/90 dark:bg-emerald-950/45 text-emerald-800 dark:text-emerald-200 font-medium',
          compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs sm:text-[13px]',
          className
        )}
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>{t('documents.forms.ocrStatus.completed')}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/45 text-amber-800 dark:text-amber-200 font-medium',
        compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs sm:text-[13px]',
        className
      )}
    >
      <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
      <span>{t('documents.forms.ocrStatus.error')}</span>
    </div>
  );
};

export default OcrStatusPill;
