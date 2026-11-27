import React from 'react';
import { FolderOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageProvider';

interface BulkClassificationBarProps {
  selectedCount: number;
  onClassify: () => void;
  onClear: () => void;
}

const BulkClassificationBar: React.FC<BulkClassificationBarProps> = ({
  selectedCount,
  onClassify,
  onClear,
}) => {
  const { language, dir } = useLanguage();
  const isFr = language === 'fr';

  if (selectedCount <= 0) return null;

  return (
    <div
      dir={dir}
      className="fixed bottom-5 inset-x-0 z-40 px-4 flex justify-center pointer-events-none"
      role="region"
      aria-label={isFr ? 'Actions groupées de classement' : 'إجراءات التصنيف الجماعي'}
    >
      <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white border border-slate-700/90 shadow-xl max-w-full">
        <div className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
          <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-2 rounded-md bg-blue-500/25 text-blue-200 border border-blue-400/30 font-bold tabular-nums">
            <bdi dir="ltr">{selectedCount}</bdi>
          </span>
          <span className="text-slate-200">
            {isFr
              ? selectedCount === 1
                ? 'document sélectionné'
                : 'documents sélectionnés'
              : selectedCount === 1
                ? 'مستند محدد'
                : 'مستندات محددة'}
          </span>
        </div>

        <div className="h-5 w-px bg-slate-700 shrink-0" />

        <Button
          type="button"
          size="sm"
          onClick={onClassify}
          className="h-9 px-3.5 text-sm font-semibold rounded-lg bg-[#2c5282] hover:bg-[#36649c] text-white border border-blue-400/20 whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <FolderOpen className="h-4 w-4 shrink-0" />
          <span>{isFr ? 'Classer la sélection dans un dossier' : 'تصنيف المحدد في مجلد'}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          aria-label={isFr ? 'Annuler la sélection' : 'إلغاء التحديد'}
          title={isFr ? 'Annuler la sélection' : 'إلغاء التحديد'}
          className="h-9 px-2.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1"
        >
          <X className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{isFr ? 'Annuler' : 'إلغاء التحديد'}</span>
        </Button>
      </div>
    </div>
  );
};

export default BulkClassificationBar;
