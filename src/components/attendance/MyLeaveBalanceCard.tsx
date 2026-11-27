import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useDirection } from '@/i18n/useDirection';

export interface LeaveBalanceData {
  personnelId?: string;
  year?: number;
  annee?: number;
  totalDays?: number;
  soldeAnnuel?: number;
  usedDays?: number;
  joursUtilises?: number;
  remainingDays?: number;
  soldeRestant?: number;
  byMotif?: Record<string, number>;
}

interface MyLeaveBalanceCardProps {
  balance: LeaveBalanceData | null;
  isLoading: boolean;
  year: number;
}

export const MyLeaveBalanceCard: React.FC<MyLeaveBalanceCardProps> = ({
  balance,
  isLoading,
  year,
}) => {
  const { dir, isRTL } = useDirection();

  if (isLoading) {
    return (
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm"
        dir={dir}
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-44 dark:bg-slate-800" />
          <Skeleton className="h-4 w-24 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <Skeleton className="h-16 rounded-lg dark:bg-slate-800" />
          <Skeleton className="h-16 rounded-lg dark:bg-slate-800" />
          <Skeleton className="h-16 rounded-lg dark:bg-slate-800" />
        </div>
        <Skeleton className="h-2 w-full rounded-full dark:bg-slate-800" />
      </div>
    );
  }

  const total = balance?.totalDays ?? balance?.soldeAnnuel ?? 45;
  const used = balance?.usedDays ?? balance?.joursUtilises ?? 0;
  const remaining = balance?.remainingDays ?? balance?.soldeRestant ?? Math.max(0, total - used);
  const percentUsed = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  const nonZeroMotifs =
    used > 0 && balance?.byMotif
      ? Object.entries(balance.byMotif).filter(([, count]) => count > 0)
      : [];

  const formatDayUnit = (count: number) => {
    if (isRTL) return 'يوم';
    return count === 1 ? 'jour' : 'jours';
  };

  return (
    <div
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden"
      dir={dir}
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {isRTL ? 'رصيد الإجازات السنوية' : 'Solde de congés annuels'}
        </h2>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
          {isRTL ? `السنة المالية ${year}` : `Exercice ${year}`}
        </span>
      </div>

      {/* Sleek 3-Column Metric Grid (no nested cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200/80 dark:divide-slate-800">
        {/* Total Balance */}
        <div className="px-5 py-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {isRTL ? 'الرصيد الإجمالي' : 'Solde annuel'}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {total}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {formatDayUnit(total)}
            </span>
          </div>
        </div>

        {/* Consumed Days */}
        <div className="px-5 py-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {isRTL ? 'الأيام المستهلكة' : 'Jours consommés'}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {used}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {formatDayUnit(used)}
            </span>
          </div>
        </div>

        {/* Remaining Balance */}
        <div className="px-5 py-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {isRTL ? 'الرصيد المتبقي' : 'Solde restant'}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#2c5282] dark:text-sky-400 tabular-nums">
              {remaining}
            </span>
            <span className="text-xs font-medium text-[#2c5282]/80 dark:text-sky-400/80">
              {formatDayUnit(remaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Slim Progress Bar */}
      <div className="px-5 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>{isRTL ? 'نسبة استهلاك الرصيد السنوي' : 'Taux d’utilisation annuel'}</span>
          <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">
            {isRTL
              ? `${percentUsed}% (${used} من ${total} يوم)`
              : `${percentUsed}% (${used} sur ${total} ${formatDayUnit(total)})`}
          </span>
        </div>
        <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-[#2c5282] dark:bg-sky-500 rounded-full transition-all duration-200"
            style={{ width: `${percentUsed}%` }}
          />
        </div>

        {/* Breakdown only when consumed days > 0 */}
        {nonZeroMotifs.length > 0 && (
          <div className="pt-2.5 mt-2 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {isRTL ? 'تفاصيل الاستهلاك:' : 'Détail de consommation :'}
            </span>
            {nonZeroMotifs.map(([motifCode, count]) => {
              let label = motifCode;
              if (isRTL) {
                if (motifCode === 'conge_annuel') label = 'عطلة سنوية';
                else if (motifCode === 'absence_injustifiee') label = 'غياب غير مبرر';
                else if (motifCode === 'recuperation') label = 'استرجاع';
                else if (motifCode === 'conge_exceptionnel') label = 'عطلة استثنائية';
              } else {
                if (motifCode === 'conge_annuel') label = 'Congé annuel';
                else if (motifCode === 'absence_injustifiee') label = 'Absence injustifiée';
                else if (motifCode === 'recuperation') label = 'Récupération';
                else if (motifCode === 'conge_exceptionnel') label = 'Congé exceptionnel';
              }

              return (
                <span
                  key={motifCode}
                  className="text-slate-700 dark:text-slate-300 tabular-nums"
                >
                  {label}: <strong className="font-semibold text-slate-900 dark:text-slate-100">{count}</strong> {formatDayUnit(count)}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLeaveBalanceCard;
