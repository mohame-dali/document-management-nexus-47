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
  const { dir, isRTL } = useDirection();

  if (isLoading) {
    return (
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg px-4 py-2.5 shadow-xs"
        dir={dir}
      >
        <Skeleton className="h-6 w-full rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  const items = [
    {
      key: 'all',
      label: isRTL ? 'الإجمالي' : 'Total',
      value: counts.total,
      icon: Users,
      textColor: 'text-slate-900 dark:text-slate-100',
      activeBg: 'bg-[#2c5282] dark:bg-sky-700 text-white',
    },
    {
      key: 'present',
      label: isRTL ? 'حاضر' : 'Présents',
      value: counts.presents,
      icon: CheckCircle2,
      textColor: 'text-emerald-700 dark:text-emerald-400',
      activeBg: 'bg-emerald-700 text-white',
    },
    {
      key: 'absent',
      label: isRTL ? 'غائب' : 'Absents',
      value: counts.absents,
      icon: XCircle,
      textColor: 'text-red-700 dark:text-red-400',
      activeBg: 'bg-red-700 text-white',
    },
    {
      key: 'formation',
      label: isRTL ? 'تكوين' : 'Formation',
      value: counts.formation,
      icon: GraduationCap,
      textColor: 'text-indigo-700 dark:text-indigo-400',
      activeBg: 'bg-indigo-700 text-white',
    },
    {
      key: 'service',
      label: isRTL ? 'خدمة / مهمة' : 'Service / Mission',
      value: counts.service,
      icon: Briefcase,
      textColor: 'text-teal-700 dark:text-teal-400',
      activeBg: 'bg-teal-700 text-white',
    },
    {
      key: 'unrecorded',
      label: isRTL ? 'غير مسجل' : 'Non saisi',
      value: counts.unrecorded,
      icon: HelpCircle,
      textColor: 'text-slate-600 dark:text-slate-300',
      activeBg: 'bg-slate-700 text-white',
    },
  ];

  return (
    <div
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-1.5 shadow-xs"
      dir={dir}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeFilter === item.key;
        const clickable = Boolean(onFilterClick);

        if (clickable) {
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onFilterClick && onFilterClick(isActive ? null : item.key)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors tabular-nums whitespace-nowrap ${
                isActive
                  ? item.activeBg
                  : `${item.textColor} hover:bg-slate-100 dark:hover:bg-slate-800`
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.label}:</span>
              <strong className="font-bold font-mono">{item.value}</strong>
            </button>
          );
        }

        return (
          <span
            key={item.key}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tabular-nums whitespace-nowrap ${item.textColor}`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{item.label}:</span>
            <strong className="font-bold font-mono">{item.value}</strong>
          </span>
        );
      })}
    </div>
  );
};

export default AllPersonnelKPICards;
