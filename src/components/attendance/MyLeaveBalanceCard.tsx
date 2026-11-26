import React from 'react';
import { Calendar, CheckCircle2, Clock, Info } from 'lucide-react';
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
  const { dir } = useDirection();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-lg p-5 space-y-4" dir={dir}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 dark:bg-slate-800" />
          <Skeleton className="h-5 w-20 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-lg dark:bg-slate-800" />
          <Skeleton className="h-24 rounded-lg dark:bg-slate-800" />
          <Skeleton className="h-24 rounded-lg dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  const total = balance?.totalDays ?? balance?.soldeAnnuel ?? 45;
  const used = balance?.usedDays ?? balance?.joursUtilises ?? 0;
  const remaining = balance?.remainingDays ?? balance?.soldeRestant ?? Math.max(0, total - used);
  const percentUsed = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-lg p-5 space-y-4 shadow-sm" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#edf2f7] dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#2c5282] text-white rounded-lg">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1a202c] dark:text-slate-100">
              رصيد الإجازات السنوية (Solde de congés)
            </h2>
            <p className="text-xs text-[#5f6b7d] dark:text-slate-400">
              متابعة الأيام المستحقة، المستنفذة والرصيد المتبقي لسنة {year}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md self-start sm:self-auto border border-slate-200 dark:border-slate-700 font-mono tabular-nums">
          السنة المالية : {year}
        </span>
      </div>

      {/* Grid 3 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total days */}
        <div className="bg-[#f7fafc] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-slate-700 rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5f6b7d] dark:text-slate-400 font-medium block">
              الرصيد الإجمالي السنوي
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#1a202c] dark:text-slate-100 font-mono tabular-nums">{total}</span>
              <span className="text-xs text-[#5f6b7d] dark:text-slate-400">يوم</span>
            </div>
          </div>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300 rounded-lg border border-blue-100 dark:border-blue-800/70">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        {/* Used days */}
        <div className="bg-[#f7fafc] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-slate-700 rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5f6b7d] dark:text-slate-400 font-medium block">
              الأيام المستهلكة (الغياب المخصوم)
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-amber-700 dark:text-amber-300 font-mono tabular-nums">{used}</span>
              <span className="text-xs text-[#5f6b7d] dark:text-slate-400">يوم</span>
            </div>
          </div>
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800/70">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Remaining days */}
        <div className="bg-[#f7fafc] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-slate-700 rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5f6b7d] dark:text-slate-400 font-medium block">
              الرصيد المتبقي المتاح
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[#2c5282] dark:text-blue-300 font-mono tabular-nums">{remaining}</span>
              <span className="text-xs text-[#2c5282] dark:text-blue-300 font-medium">يوم</span>
            </div>
          </div>
          <div className="p-2.5 bg-[#2c5282]/10 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300 rounded-lg border border-[#2c5282]/20 dark:border-blue-800/70">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Progress Bar & Details */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs text-[#5f6b7d] dark:text-slate-400 mb-1.5 font-medium">
          <span>نسبة استهلاك الرصيد السنوي</span>
          <span className="font-mono tabular-nums">{percentUsed}% ({used} من {total} يوم)</span>
        </div>
        <div className="w-full bg-[#edf2f7] dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-[#e2e8f0] dark:border-slate-700">
          <div
            className="h-full bg-[#2c5282] dark:bg-blue-500 transition-all duration-200"
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      {/* Breakdown by motif if available */}
      {balance?.byMotif && Object.keys(balance.byMotif).length > 0 && (
        <div className="pt-2 border-t border-[#edf2f7] dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#5f6b7d] dark:text-slate-400 flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            <span>تفاصيل الاستهلاك :</span>
          </span>
          {Object.entries(balance.byMotif).map(([motifCode, count]) => {
            if (count === 0) return null;
            let label = motifCode;
            if (motifCode === 'conge_annuel') label = 'عطلة سنوية';
            else if (motifCode === 'absence_injustifiee') label = 'غياب غير مبرر';
            else if (motifCode === 'recuperation') label = 'استرجاع';
            else if (motifCode === 'conge_exceptionnel') label = 'عطلة استثنائية';

            return (
              <span
                key={motifCode}
                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md border border-slate-200 dark:border-slate-700"
              >
                {label}: <strong className="font-mono tabular-nums">{count}</strong> يوم
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyLeaveBalanceCard;
