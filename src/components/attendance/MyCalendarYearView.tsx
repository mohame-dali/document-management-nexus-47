import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import { AttendanceRecord } from '@/services/attendanceService';
import { LeaveReason } from '@/services/leaveReasonService';
import { useDirection } from '@/i18n/useDirection';

interface MyCalendarYearViewProps {
  year: number;
  onYearChange: (year: number) => void;
  attendances: AttendanceRecord[];
  leaveReasons: LeaveReason[];
  isLoading: boolean;
  onSelectMonth: (month: number) => void;
}

const MONTH_NAMES = [
  'جانفي (Jan)',
  'فيفري (Fév)',
  'مارس (Mar)',
  'أفريل (Avr)',
  'ماي (Mai)',
  'جوان (Juin)',
  'جويلية (Juil)',
  'أوت (Août)',
  'سبتمبر (Sep)',
  'أكتوبر (Oct)',
  'نوفمبر (Nov)',
  'ديسمبر (Déc)',
];

export const MyCalendarYearView: React.FC<MyCalendarYearViewProps> = ({
  year,
  onYearChange,
  attendances,
  leaveReasons,
  isLoading,
  onSelectMonth,
}) => {
  const { dir, isRTL } = useDirection();
  const handlePrevYear = () => onYearChange(year - 1);
  const handleNextYear = () => onYearChange(year + 1);
  const handleCurrentYear = () => onYearChange(new Date().getFullYear());

  // Agréger les données par mois (1 à 12)
  const monthsData = useMemo(() => {
    // Initialiser 12 mois
    const data = Array.from({ length: 12 }, (_, i) => ({
      monthNumber: i + 1,
      monthName: MONTH_NAMES[i],
      presents: 0,
      absents: 0,
      deductibles: 0,
      motifsCount: {} as Record<string, number>,
      totalRecords: 0,
    }));

    attendances.forEach((att) => {
      if (!att.date) return;
      const d = new Date(att.date);
      // Vérifier que la date correspond à l'année affichée
      if (d.getUTCFullYear() !== year && d.getFullYear() !== year) return;

      const mIndex = d.getUTCMonth(); // 0 à 11
      if (mIndex >= 0 && mIndex < 12) {
        data[mIndex].totalRecords++;
        if (att.statut === 'present') {
          data[mIndex].presents++;
        } else if (att.statut === 'absent') {
          data[mIndex].absents++;
          if (att.impacteSolde) {
            data[mIndex].deductibles++;
          }
          const m = att.motif || 'autre';
          data[mIndex].motifsCount[m] = (data[mIndex].motifsCount[m] || 0) + 1;
        }
      }
    });

    return data;
  }, [attendances, year]);

  // Totaux annuels
  const yearTotals = useMemo(() => {
    let totalPresents = 0;
    let totalAbsents = 0;
    let totalDeductibles = 0;

    monthsData.forEach((m) => {
      totalPresents += m.presents;
      totalAbsents += m.absents;
      totalDeductibles += m.deductibles;
    });

    return { totalPresents, totalAbsents, totalDeductibles };
  }, [monthsData]);

  // Obtenir le label en arabe d'un motif
  const getMotifLabel = (motifCode: string) => {
    const reason = leaveReasons.find((r) => r.code === motifCode);
    return reason?.labelAr || motifCode;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-5 shadow-sm text-start" dir={dir}>
      {/* Contrôles navigation année */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevYear}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
            title="السنة السابقة"
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <span>السنة السابقة</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentYear}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            السنة الحالية
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextYear}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
            title="السنة الموالية"
          >
            <span>السنة الموالية</span>
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">السنة المعروضة :</span>
          <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
            {year}
          </span>
        </div>
      </div>

      {/* Totaux Annuels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-emerald-50/80 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/70 rounded-lg p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">إجمالي أيام الحضور</span>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 font-mono tabular-nums mt-0.5">
              {yearTotals.totalPresents} <span className="text-xs font-normal">يوم</span>
            </div>
          </div>
          <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="bg-red-50/80 dark:bg-red-950/35 border border-red-200 dark:border-red-800/70 rounded-lg p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-red-800 dark:text-red-300 font-medium">إجمالي أيام الغياب</span>
            <div className="text-2xl font-bold text-red-900 dark:text-red-200 font-mono tabular-nums mt-0.5">
              {yearTotals.totalAbsents} <span className="text-xs font-normal">يوم</span>
            </div>
          </div>
          <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>

        <div className="bg-amber-50/80 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/70 rounded-lg p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">أيام الغياب المخصومة من الرصيد</span>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-200 font-mono tabular-nums mt-0.5">
              {yearTotals.totalDeductibles} <span className="text-xs font-normal">يوم</span>
            </div>
          </div>
          <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
      </div>

      {/* Grille des 12 mois */}
      {isLoading ? (
        <div className="py-20 text-center space-y-2">
          <div className="h-6 w-6 border-2 border-[#2c5282] dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400">جاري تحميل بيانات السنة...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {monthsData.map((m) => {
            const hasData = m.totalRecords > 0;
            const presenceRate =
              hasData && m.presents + m.absents > 0
                ? Math.round((m.presents / (m.presents + m.absents)) * 100)
                : 0;

            return (
              <div
                key={m.monthNumber}
                onClick={() => onSelectMonth(m.monthNumber)}
                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-[#2c5282] dark:hover:border-blue-500 rounded-lg p-3.5 flex flex-col justify-between transition-all duration-150 cursor-pointer group hover:shadow-sm"
              >
                <div>
                  {/* Entête du mois */}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-[#2c5282] dark:group-hover:text-blue-400">
                      {m.monthName}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 group-hover:text-[#2c5282] dark:group-hover:text-blue-400 flex items-center text-[10px] font-semibold">
                      <span>عرض</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>

                  {/* Statistiques du mois */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span>أيام الحضور :</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">{m.presents}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span>أيام الغياب :</span>
                      <span className="font-bold text-red-700 dark:text-red-400 font-mono tabular-nums">{m.absents}</span>
                    </div>

                    {m.deductibles > 0 && (
                      <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/50 px-1.5 py-0.5 rounded text-[11px] tabular-nums">
                        <span>خصم من الرصيد :</span>
                        <span className="font-bold font-mono">{m.deductibles} يوم</span>
                      </div>
                    )}

                    {/* Liste succincte des motifs d'absence */}
                    {Object.keys(m.motifsCount).length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">
                          أسباب الغياب :
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(m.motifsCount).map(([code, count]) => (
                            <span
                              key={code}
                              className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono tabular-nums"
                            >
                              {getMotifLabel(code)}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Barre de présence */}
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                    <span>نسبة الانضباط</span>
                    <span className="font-mono tabular-nums">{hasData ? `${presenceRate}%` : '-'}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${
                        presenceRate >= 80
                          ? 'bg-emerald-600 dark:bg-emerald-500'
                          : presenceRate >= 50
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${hasData ? presenceRate : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyCalendarYearView;
