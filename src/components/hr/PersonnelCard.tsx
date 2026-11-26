import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Personnel } from '@/types/hr';
import { Department } from '@/types';
import PersonnelStatusBadge from './PersonnelStatusBadge';
import PersonnelAvatar from './PersonnelAvatar';
import { Phone, Mail, Building2, Briefcase, Eye, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDirection } from '@/i18n/useDirection';
import { useLanguage } from '@/contexts/LanguageProvider';

interface PersonnelCardProps {
  personnel: Personnel;
  onView?: () => void;
  className?: string;
}

export const PersonnelCard: React.FC<PersonnelCardProps> = ({
  personnel,
  onView,
  className = ''
}) => {
  const navigate = useNavigate();
  const { dir, isRTL } = useDirection();
  const { t } = useLanguage();

  const handleView = () => {
    if (onView) {
      onView();
    } else {
      navigate(`/dashboard/hr/personnel/${personnel._id}`);
    }
  };

  const departmentName = personnel.activeDepartment
    ? typeof personnel.activeDepartment === 'object'
      ? (personnel.activeDepartment as Department).name
      : isRTL
      ? 'قسم محدد'
      : 'Département assigné'
    : isRTL
    ? 'غير محدد'
    : 'Non assigné';

  const hasLinkedAccount = Boolean(
    personnel.userId && typeof personnel.userId === 'object' && !personnel.userId.isDeleted
  );

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 shadow-sm hover:border-[#2c5282] dark:hover:border-blue-700 transition-colors duration-200 text-start ${className}`}
      dir={dir}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <PersonnelAvatar
            photo={personnel.photo}
            nom={personnel.nom}
            prenom={personnel.prenom}
            size="md"
            className="!w-12 !h-12 !text-base"
          />
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              {personnel.nom} {personnel.prenom}
            </h3>
            {personnel.cin && (
              <p className="text-sm text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                CIN: {personnel.cin}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <PersonnelStatusBadge statut={personnel.statut} />
          {hasLinkedAccount ? (
            <span
              title={t('personnel.account.linkedActive')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60"
            >
              <CheckCircle className="w-3 h-3 shrink-0" />
              <span>{t('personnel.account.linkedBadge')}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <Clock className="w-3 h-3 shrink-0" />
              <span>{isRTL ? 'بدون حساب' : 'Sans compte'}</span>
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-3 mb-4">
        {personnel.poste && (
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
            <span className="font-medium text-slate-800 dark:text-slate-200">{personnel.poste}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
            <Building2 className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
            <span>{departmentName}</span>
          </span>
        </div>

        {personnel.telephone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
            <span dir="ltr" className="tabular-nums">{personnel.telephone}</span>
          </div>
        )}

        {personnel.emailPersonnel && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
            <span dir="ltr" className="truncate">{personnel.emailPersonnel}</span>
          </div>
        )}
      </div>

      <div className="pt-2 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleView}
          className="h-11 px-4 text-sm font-medium text-[#2c5282] dark:text-blue-200 border-[#2c5282] dark:border-blue-700 hover:bg-[#2c5282] hover:text-white rounded-lg flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          <span>{isRTL ? 'عرض التفاصيل' : 'Voir le profil'}</span>
        </Button>
      </div>
    </div>
  );
};

export default PersonnelCard;
