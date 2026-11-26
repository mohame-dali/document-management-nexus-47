import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';
import { cn } from '@/lib/utils';

interface CopyReferenceButtonProps {
  value: string;
  label?: string;
  className?: string;
}

const CopyReferenceButton: React.FC<CopyReferenceButtonProps> = ({
  value,
  label,
  className,
}) => {
  const { language } = useLanguage();
  const isFr = language === 'fr';
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
    if (!value) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  const defaultTooltip = isFr ? 'Copier le numéro' : 'نسخ الرقم';
  const copiedTooltip = isFr ? 'Copié ✓' : 'تم النسخ ✓';

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? copiedTooltip : (label || defaultTooltip)}
      aria-label={copied ? copiedTooltip : (label || defaultTooltip)}
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]',
        copied
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70'
          : 'text-slate-700 dark:text-slate-300 hover:text-[#2c5282] hover:bg-blue-50/80 dark:text-slate-300 dark:hover:text-blue-300 dark:hover:bg-blue-950/50',
        className
      )}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 shrink-0" />
          <span className="leading-none">✓</span>
        </>
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0" />
      )}
    </button>
  );
};

export default CopyReferenceButton;
