import React from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { Folder } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import { cn } from '@/lib/utils';

interface FolderStatusPillProps {
  folder?: Folder | string | null;
  canEdit: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

const FolderStatusPill: React.FC<FolderStatusPillProps> = ({
  folder,
  canEdit,
  onClick,
  size = 'sm',
  className,
}) => {
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const hasFolder = Boolean(folder);
  const folderName =
    folder && typeof folder === 'object' && 'name' in folder && folder.name
      ? folder.name
      : hasFolder
        ? isFr
          ? 'Classé'
          : 'مصنف'
        : null;

  const sizeClasses =
    size === 'md'
      ? 'px-2.5 py-1 text-xs'
      : 'px-2 py-0.5 text-xs';

  if (hasFolder && folderName) {
    if (canEdit && onClick) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          title={isFr ? `Dossier : ${folderName} (cliquer pour modifier)` : `المجلد: ${folderName} (انقر للتغيير)`}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full font-semibold max-w-[175px]',
            'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200',
            'border border-emerald-200/80 dark:border-emerald-800/70',
            'hover:bg-emerald-100/90 dark:hover:bg-emerald-900/60 hover:border-emerald-300 dark:hover:border-emerald-700',
            'transition-colors cursor-pointer whitespace-nowrap shrink-0',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]',
            sizeClasses,
            className
          )}
        >
          <FolderOpen className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="truncate">{folderName}</span>
        </button>
      );
    }

    return (
      <span
        title={folderName}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-semibold max-w-[175px]',
          'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200',
          'border border-emerald-200/80 dark:border-emerald-800/70 whitespace-nowrap shrink-0',
          sizeClasses,
          className
        )}
      >
        <FolderOpen className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="truncate">{folderName}</span>
      </span>
    );
  }

  if (canEdit && onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        title={isFr ? 'Classer dans un dossier' : 'تصنيف في مجلد'}
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-medium',
          'border border-dashed border-slate-300 dark:border-slate-700',
          'text-slate-600 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-800/50',
          'hover:border-[#2c5282] dark:hover:border-blue-500 hover:text-[#2c5282] dark:hover:text-blue-300',
          'hover:bg-blue-50/70 dark:hover:bg-blue-950/40',
          'transition-colors cursor-pointer whitespace-nowrap shrink-0',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]',
          sizeClasses,
          className
        )}
      >
        <Plus className="h-3 w-3 shrink-0" />
        <span>{isFr ? 'Classer' : 'تصنيف'}</span>
      </button>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        'bg-slate-100/90 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
        'border border-slate-200/80 dark:border-slate-700 whitespace-nowrap shrink-0',
        sizeClasses,
        className
      )}
    >
      {isFr ? 'Non classé' : 'غير مصنف'}
    </span>
  );
};

export default FolderStatusPill;
