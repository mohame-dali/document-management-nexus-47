import React from 'react';
import { PersonnelStatut } from '@/types/hr';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';

interface PersonnelStatusBadgeProps {
  statut: PersonnelStatut | string;
  className?: string;
}

export const PersonnelStatusBadge: React.FC<PersonnelStatusBadgeProps> = ({ statut, className = '' }) => {
  const { t } = useLanguage();
  const { isRTL } = useDirection();

  switch (statut) {
    case 'actif':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border border-emerald-200/80 bg-emerald-50/90 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
          <span>{isRTL ? 'نشط' : t('personnel.filters.statusActive')}</span>
        </span>
      );
    case 'inactif':
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border border-slate-200/80 bg-slate-100/90 text-slate-700 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-slate-400 shrink-0" />
          <span>{isRTL ? 'غير نشط' : t('personnel.filters.statusInactive')}</span>
        </span>
      );
    case 'en_attente':
    default:
      return (
        <span
          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border border-amber-200/80 bg-amber-50/90 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 shrink-0" />
          <span>{isRTL ? 'في الانتظار' : t('personnel.filters.statusPending')}</span>
        </span>
      );
  }
};

export default PersonnelStatusBadge;
