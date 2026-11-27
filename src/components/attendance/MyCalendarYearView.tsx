import React, { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { AttendanceRecord } from '@/services/attendanceService';
import { LeaveReason } from '@/services/leaveReasonService';
import { useDirection } from '@/i18n/useDirection';

interface MyCalendarYearViewProps {
  year: number;
  attendances: AttendanceRecord[];
  leaveReasons: LeaveReason[];
  isLoading: boolean;
  onSelectMonth: (month: number) => void;
}

const MONTH_NAMES_AR = [
  'جانفي',
  'فيفري',
  'مارس',
  'أفريل',
  'ماي',
  'جوان',
  'جويلية',
  'أوت',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const MONTH_NAMES_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export const MyCalendarYearView: React.FC<MyCalendarYearViewProps> = ({
  year,
  attendances,
  leaveReasons,
  isLoading,
  onSelectMonth,
}) => {
  const { dir, isRTL } = useDirection();
  const monthNames = isRTL ? MONTH_NAMES_AR : MONTH_NAMES_FR;

  // Agréger les données par mois (1 à 12)
  const monthsData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      monthNumber: i + 1,
      monthName: monthNames[i],
      presents: 0,
      absents: 0,
      deductibles: 0,
      motifsCount: {} as Record<string, number>,
      totalRecords: 0,
    }));

    attendances.forEach((att) => {
      if (!att.date) return;
      const d = new Date(att.date);
      if (d.getUTCFullYear() !== year && d.getFullYear() !== year) return;

      const mIndex = d.getUTCMonth();
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
  }, [attendances, year, monthNames]);

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

  const getMotifLabel = (motifCode: string) => {
    const reason = leaveReasons.find((r) => r.code === motifCode);
    if (isRTL) return reason?.labelAr || motifCode;
    return reason?.labelFr || reason?.labelAr || motifCode;
  };

  const formatDayUnit = (count: number) => {
    if (isRTL) return 'يوم';
    return count === 1 ? 'jour' : 'jours';
  };

  return (
    <div className="p-4 sm:p-5 space-y-5 text-start" dir={dir}>
      {/* Totaux Annuels — 3-column hairline summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-slate-200/80 dark:border-slate-800 rounded-lg divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200/80 dark:divide-slate-800 bg-slate-50/40 dark:bg-slate-950/30">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {isRTL ? 'إجمالي أيام الحضور' : 'Total jours présents'}
          </span>
          <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {yearTotals.totalPresents} {formatDayUnit(yearTotals.totalPresents)}
          </span>
        </div>

        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {isRTL ? 'إجمالي أيام الغياب' : 'Total jours absents'}
          </span>
          <span className="text-base font-bold text-rose-700 dark:text-rose-400 tabular-nums">
            {yearTotals.totalAbsents} {formatDayUnit(yearTotals.totalAbsents)}
          </span>
        </div>

        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {isRTL ? 'الأيام المخصومة من الرصيد' : 'Jours déduits du solde'}
          </span>
          <span className="text-base font-bold text-amber-700 dark:text-amber-400 tabular-nums">
            {yearTotals.totalDeductibles} {formatDayUnit(yearTotals.totalDeductibles)}
          </span>
        </div>
      </div>

      {/* Grille des 12 mois */}
      {isLoading ? (
        <div className="py-20 text-center space-y-2">
          <div className="h-6 w-6 border-2 border-[#2c5282] dark:border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {isRTL ? 'جاري تحميل بيانات السنة...' : 'Chargement du bilan annuel...'}
          </p>
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
                className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:border-[#2c5282] dark:hover:border-sky-500 rounded-lg p-3.5 flex flex-col justify-between transition-colors duration-150 cursor-pointer group"
              >
                <div>
                  {/* Entête du mois */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-[#2c5282] dark:group-hover:text-sky-400">
                      {m.monthName}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 group-hover:text-[#2c5282] dark:group-hover:text-sky-400 flex items-center text-xs font-medium">
                      <span>{isRTL ? 'عرض' : 'Voir'}</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>

                  {/* Statistiques du mois */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span>{isRTL ? 'أيام الحضور:' : 'Présences :'}</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {m.presents}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span>{isRTL ? 'أيام الغياب:' : 'Absences :'}</span>
                      <span className="font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                        {m.absents}
                      </span>
                    </div>

                    {m.deductibles > 0 && (
                      <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 text-xs tabular-nums">
                        <span>{isRTL ? 'خصم من الرصيد:' : 'Déduits :'}</span>
                        <span className="font-bold">
                          {m.deductibles} {formatDayUnit(m.deductibles)}
                        </span>
                      </div>
                    )}

                    {/* Liste succincte des motifs d'absence */}
                    {Object.keys(m.motifsCount).length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                          {isRTL ? 'أسباب الغياب:' : 'Motifs :'}
                        </span>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                          {Object.entries(m.motifsCount).map(([code, count]) => (
                            <span key={code}>
                              {getMotifLabel(code)}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Barre de présence */}
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    <span>{isRTL ? 'نسبة الانضباط' : 'Assiduité'}</span>
                    <span className="font-medium tabular-nums">{hasData ? `${presenceRate}%` : '—'}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        presenceRate >= 80
                          ? 'bg-emerald-600 dark:bg-emerald-500'
                          : presenceRate >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
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
