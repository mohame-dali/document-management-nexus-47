import React from 'react';
import { Calendar, CheckCircle2, Clock, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
  if (isLoading) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded p-5 space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded" />
          <Skeleton className="h-24 rounded" />
          <Skeleton className="h-24 rounded" />
        </div>
      </div>
    );
  }

  const total = balance?.totalDays ?? balance?.soldeAnnuel ?? 45;
  const used = balance?.usedDays ?? balance?.joursUtilises ?? 0;
  const remaining = balance?.remainingDays ?? balance?.soldeRestant ?? Math.max(0, total - used);
  const percentUsed = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  return (
    <div className="bg-white border border-[#e2e8f0] rounded p-5 space-y-4 shadow-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#edf2f7] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#2c5282] text-white rounded">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1a202c]">
              رصيد الإجازات السنوية (Solde de congés)
            </h2>
            <p className="text-xs text-[#718096]">
              متابعة الأيام المستحقة، المستنفذة والرصيد المتبقي لسنة {year}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded self-start sm:self-auto border border-gray-200 font-mono">
          السنة المالية : {year}
        </span>
      </div>

      {/* Grid 3 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total days */}
        <div className="bg-[#f7fafc] border border-[#e2e8f0] rounded p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#718096] font-medium block">
              الرصيد الإجمالي السنوي
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#1a202c] font-mono">{total}</span>
              <span className="text-xs text-[#718096]">يوم</span>
            </div>
          </div>
          <div className="p-2.5 bg-blue-50 text-[#2c5282] rounded border border-blue-100">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        {/* Used days */}
        <div className="bg-[#f7fafc] border border-[#e2e8f0] rounded p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#718096] font-medium block">
              الأيام المستهلكة (الغياب المخصوم)
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-amber-700 font-mono">{used}</span>
              <span className="text-xs text-[#718096]">يوم</span>
            </div>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Remaining days */}
        <div className="bg-[#f7fafc] border border-[#e2e8f0] rounded p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#718096] font-medium block">
              الرصيد المتبقي المتاح
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[#2c5282] font-mono">{remaining}</span>
              <span className="text-xs text-[#2c5282] font-medium">يوم</span>
            </div>
          </div>
          <div className="p-2.5 bg-[#2c5282]/10 text-[#2c5282] rounded border border-[#2c5282]/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Progress Bar & Details */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs text-[#718096] mb-1.5 font-medium">
          <span>نسبة استهلاك الرصيد السنوي</span>
          <span className="font-mono">{percentUsed}% ({used} من {total} يوم)</span>
        </div>
        <div className="w-full bg-[#edf2f7] rounded h-2.5 overflow-hidden border border-[#e2e8f0]">
          <div
            className="h-full bg-[#2c5282] transition-all duration-300"
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      {/* Breakdown by motif if available */}
      {balance?.byMotif && Object.keys(balance.byMotif).length > 0 && (
        <div className="pt-2 border-t border-[#edf2f7] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#718096] flex items-center gap-1">
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
                className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200"
              >
                {label}: <strong className="font-mono">{count}</strong> يوم
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyLeaveBalanceCard;
