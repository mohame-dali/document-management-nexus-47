import React from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Briefcase,
  HelpCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useDirection } from '@/i18n/useDirection';

export interface KPICounts {
  total: number;
  presents: number;
  absents: number;
  formation: number;
  service: number;
  unrecorded: number;
}

interface AllPersonnelKPICardsProps {
  counts: KPICounts;
  isLoading?: boolean;
  activeFilter?: string | null;
  onFilterClick?: (filterKey: string | null) => void;
}

export const AllPersonnelKPICards: React.FC<AllPersonnelKPICardsProps> = ({
  counts,
  isLoading = false,
  activeFilter,
  onFilterClick,
}) => {
  const { dir } = useDirection();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" dir={dir}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      key: 'all',
      title: 'إجمالي الموظفين',
      value: counts.total,
      unit: 'موظف',
      icon: Users,
      iconColor: 'text-[#2c5282] dark:text-blue-300',
      bgIcon: 'bg-blue-50 border-blue-100 dark:bg-blue-950/60 dark:border-blue-800/70',
      activeBorder: 'ring-2 ring-[#2c5282] dark:ring-blue-400',
    },
    {
      key: 'present',
      title: 'الحاضرون',
      value: counts.presents,
      unit: 'حاضر',
      icon: CheckCircle2,
      iconColor: 'text-[#2f855a] dark:text-emerald-300',
      bgIcon: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-800/70',
      activeBorder: 'ring-2 ring-[#2f855a] dark:ring-emerald-400',
    },
    {
      key: 'absent',
      title: 'الغائبون',
      value: counts.absents,
      unit: 'غائب',
      icon: XCircle,
      iconColor: 'text-[#c53030] dark:text-red-300',
      bgIcon: 'bg-red-50 border-red-100 dark:bg-red-950/60 dark:border-red-800/70',
      activeBorder: 'ring-2 ring-[#c53030] dark:ring-red-400',
    },
    {
      key: 'formation',
      title: 'في تكوين',
      value: counts.formation,
      unit: 'موظف',
      icon: GraduationCap,
      iconColor: 'text-indigo-600 dark:text-indigo-300',
      bgIcon: 'bg-indigo-50 border-indigo-100 dark:bg-indigo-950/60 dark:border-indigo-800/70',
      activeBorder: 'ring-2 ring-indigo-600 dark:ring-indigo-400',
    },
    {
      key: 'service',
      title: 'في خدمة / مهمة',
      value: counts.service,
      unit: 'موظف',
      icon: Briefcase,
      iconColor: 'text-teal-600 dark:text-teal-300',
      bgIcon: 'bg-teal-50 border-teal-100 dark:bg-teal-950/60 dark:border-teal-800/70',
      activeBorder: 'ring-2 ring-teal-600 dark:ring-teal-400',
    },
    {
      key: 'unrecorded',
      title: 'غير مسجل',
      value: counts.unrecorded,
      unit: 'موظف',
      icon: HelpCircle,
      iconColor: 'text-slate-700 dark:text-slate-300',
      bgIcon: 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700',
      activeBorder: 'ring-2 ring-[#718096] dark:ring-slate-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" dir={dir}>
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;

        return (
          <div
            key={card.key}
            onClick={() => onFilterClick && onFilterClick(isActive ? null : card.key)}
            className={`bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-lg p-3.5 flex items-center justify-between transition-all duration-200 shadow-sm ${
              onFilterClick ? 'cursor-pointer hover:border-[#2c5282] dark:hover:border-blue-500 hover:shadow-md' : ''
            } ${isActive ? card.activeBorder : ''}`}
          >
            <div>
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium block truncate">
                {card.title}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#1a202c] dark:text-slate-100 font-mono tabular-nums leading-none">
                  {card.value}
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-300 font-normal">
                  {card.unit}
                </span>
              </div>
            </div>

            <div className={`p-2 rounded-lg border ${card.bgIcon} ${card.iconColor} shrink-0`}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AllPersonnelKPICards;
