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
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" dir="rtl">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded bg-gray-100" />
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
      iconColor: 'text-[#2c5282]',
      bgIcon: 'bg-blue-50 border-blue-100',
      activeBorder: 'ring-2 ring-[#2c5282]',
    },
    {
      key: 'present',
      title: 'الحاضرون',
      value: counts.presents,
      unit: 'حاضر',
      icon: CheckCircle2,
      iconColor: 'text-[#2f855a]',
      bgIcon: 'bg-green-50 border-green-100',
      activeBorder: 'ring-2 ring-[#2f855a]',
    },
    {
      key: 'absent',
      title: 'الغائبون',
      value: counts.absents,
      unit: 'غائب',
      icon: XCircle,
      iconColor: 'text-[#c53030]',
      bgIcon: 'bg-red-50 border-red-100',
      activeBorder: 'ring-2 ring-[#c53030]',
    },
    {
      key: 'formation',
      title: 'في تكوين',
      value: counts.formation,
      unit: 'موظف',
      icon: GraduationCap,
      iconColor: 'text-indigo-600',
      bgIcon: 'bg-indigo-50 border-indigo-100',
      activeBorder: 'ring-2 ring-indigo-600',
    },
    {
      key: 'service',
      title: 'في خدمة / مهمة',
      value: counts.service,
      unit: 'موظف',
      icon: Briefcase,
      iconColor: 'text-teal-600',
      bgIcon: 'bg-teal-50 border-teal-100',
      activeBorder: 'ring-2 ring-teal-600',
    },
    {
      key: 'unrecorded',
      title: 'غير مسجل',
      value: counts.unrecorded,
      unit: 'موظف',
      icon: HelpCircle,
      iconColor: 'text-[#718096]',
      bgIcon: 'bg-gray-100 border-gray-200',
      activeBorder: 'ring-2 ring-[#718096]',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" dir="rtl">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;

        return (
          <div
            key={card.key}
            onClick={() => onFilterClick && onFilterClick(isActive ? null : card.key)}
            className={`bg-white border border-[#e2e8f0] rounded p-3.5 flex items-center justify-between transition-all duration-200 ${
              onFilterClick ? 'cursor-pointer hover:border-[#2c5282] hover:shadow-sm' : ''
            } ${isActive ? card.activeBorder : ''}`}
          >
            <div>
              <span className="text-[11px] text-[#718096] font-medium block truncate">
                {card.title}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#1a202c] font-mono leading-none">
                  {card.value}
                </span>
                <span className="text-[10px] text-[#718096] font-normal">
                  {card.unit}
                </span>
              </div>
            </div>

            <div className={`p-2 rounded border ${card.bgIcon} ${card.iconColor} shrink-0`}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AllPersonnelKPICards;
