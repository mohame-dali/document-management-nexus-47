import React, { useState, useRef, useEffect } from 'react';
import { Eye, Copy, Check, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageProvider';
import { cn } from '@/lib/utils';

interface RowQuickActionsToolbarProps {
  hasAttachment: boolean;
  referenceValue: string;
  canAssignResponsible?: boolean;
  onPreviewPdf: () => void;
  onAssignResponsible?: () => void;
  className?: string;
}

const RowQuickActionsToolbar: React.FC<RowQuickActionsToolbarProps> = ({
  hasAttachment,
  referenceValue,
  canAssignResponsible = false,
  onPreviewPdf,
  onAssignResponsible,
  className,
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!referenceValue) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(referenceValue);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = referenceValue;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success(t('documents.quickActions.copiedToast', { ref: referenceValue }), {
        duration: 1600,
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  return (
    <TooltipProvider delayDuration={180}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'inline-flex items-center gap-0.5 rounded-lg border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 px-1 py-0.5 shadow-xs shrink-0',
          'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-150',
          className
        )}
      >
        {hasAttachment && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewPdf();
                }}
                aria-label={t('documents.quickActions.previewPdf')}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[#2c5282] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs font-medium">
              {t('documents.quickActions.previewPdf')}
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? t('documents.quickActions.copied') : t('documents.quickActions.copyRef')}
              className={cn(
                'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]',
                copied
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#2c5282] dark:hover:text-blue-300'
              )}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs font-medium">
            {copied ? t('documents.quickActions.copied') : t('documents.quickActions.copyRef')}
          </TooltipContent>
        </Tooltip>

        {canAssignResponsible && onAssignResponsible && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignResponsible();
                }}
                aria-label={t('documents.quickActions.assignResponsible')}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs font-medium">
              {t('documents.quickActions.assignResponsible')}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default RowQuickActionsToolbar;
