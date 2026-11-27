import React, { useMemo } from 'react';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { AttendanceRecord } from '@/services/attendanceService';
import { LeaveReason } from '@/services/leaveReasonService';
import { getStatusVisualInfo } from './MyAttendanceLegend';
import { useDirection } from '@/i18n/useDirection';

interface MyCalendarWeekViewProps {
  currentDate: string; // YYYY-MM-DD (n'importe quel jour de la semaine)
  attendances: AttendanceRecord[];
  leaveReasons: LeaveReason[];
  isLoading: boolean;
  onSelectDay?: (date: string) => void;
}

const WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const WEEKDAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const getLocalTodayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

export const MyCalendarWeekView: React.FC<MyCalendarWeekViewProps> = ({
  currentDate,
  attendances,
  leaveReasons,
  isLoading,
  onSelectDay,
}) => {
  const { dir, isRTL } = useDirection();
  const todayStr = useMemo(() => getLocalTodayIso(), []);
  const weekdayNames = isRTL ? WEEKDAYS_AR : WEEKDAYS_FR;

  // Calculer les 7 jours de la semaine (commençant le Dimanche)
  const weekDays = useMemo(() => {
    const d = new Date(`${currentDate}T12:00:00`);
    const dayOfWeek = d.getDay(); // 0 = Dimanche
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(
        day.getDate()
      ).padStart(2, '0')}`;
      days.push({
        date: iso,
        dayNumber: day.getDate(),
        month: day.getMonth() + 1,
        dayName: weekdayNames[i],
        isWeekend: i === 0 || i === 6, // Dimanche & Samedi
        isToday: iso === todayStr,
      });
    }
    return days;
  }, [currentDate, weekdayNames, todayStr]);

  // Map des présences par date YYYY-MM-DD
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendances.forEach((att) => {
      const dateKey = att.date ? att.date.split('T')[0] : '';
      if (dateKey) {
        map.set(dateKey, att);
      }
    });
    return map;
  }, [attendances]);

  // Statistiques de la semaine
  const weekStats = useMemo(() => {
    let presents = 0;
    let absents = 0;

    weekDays.forEach((wd) => {
      const att = attendanceMap.get(wd.date);
      if (att?.statut === 'present') {
        presents++;
      } else if (att?.statut === 'absent') {
        absents++;
      }
    });

    return { presents, absents };
  }, [weekDays, attendanceMap]);

  return (
    <div className="p-4 sm:p-5 space-y-4 text-start" dir={dir}>
      {/* Grille 7 colonnes */}
      {isLoading ? (
        <div className="py-16 text-center space-y-2">
          <div className="h-6 w-6 border-2 border-[#2c5282] dark:border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {isRTL ? 'جاري تحميل بيانات الأسبوع...' : 'Chargement de la semaine...'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-200/70 dark:bg-slate-800 gap-px">
          {weekDays.map((day) => {
            const att = attendanceMap.get(day.date);
            const visual = getStatusVisualInfo(att, leaveReasons, isRTL);
            const isPastUnrecordedWorkday = !att && day.date < todayStr && !day.isWeekend;

            return (
              <div
                key={day.date}
                onClick={() => onSelectDay && onSelectDay(day.date)}
                className={`p-3.5 transition-colors duration-150 flex flex-col justify-between min-h-[144px] cursor-pointer ${
                  day.isWeekend
                    ? 'bg-slate-50/80 dark:bg-slate-800/35 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Entête de case */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        day.isWeekend
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {day.dayName}
                    </span>
                    {isPastUnrecordedWorkday && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"
                        title={isRTL ? 'غير مسجل' : 'Non saisi'}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span
                      className={
                        day.isToday
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center text-sm font-bold tabular-nums'
                          : 'text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums'
                      }
                    >
                      {day.dayNumber}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                    {day.date}
                  </div>
                </div>

                {/* Status pill ONLY when a record exists */}
                {att && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    {att.statut === 'present' ? (
                      <div className="text-xs font-semibold px-2.5 py-1 rounded-md text-center truncate bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70">
                        {visual.label}
                      </div>
                    ) : (
                      <div
                        className="text-xs font-semibold px-2.5 py-1 rounded-md text-center truncate border"
                        style={{
                          backgroundColor: visual.bgLight,
                          color: visual.color,
                          borderColor: visual.borderColor,
                        }}
                        title={visual.label}
                      >
                        {visual.label}
                      </div>
                    )}

                    {att.statut === 'present' && att.heureArrivee && (
                      <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1 tabular-nums">
                        <Clock className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                        <span>{att.heureArrivee}</span>
                      </div>
                    )}

                    {att.statut === 'absent' && visual.impacteSolde && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-300 text-center font-medium">
                        {isRTL ? 'يخصم من الرصيد' : 'Déduit du solde'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Résumé en bas */}
      <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            {isRTL ? 'حصيلة الأسبوع:' : 'Bilan de la semaine :'}
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{isRTL ? `حضور: ${weekStats.presents} أيام` : `Présence : ${weekStats.presents} j`}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold tabular-nums">
            <XCircle className="h-3.5 w-3.5" />
            <span>{isRTL ? `غياب: ${weekStats.absents} أيام` : `Absence : ${weekStats.absents} j`}</span>
          </span>
        </div>

        <span className="text-slate-500 dark:text-slate-400">
          {isRTL
            ? 'اضغط على أي يوم للانتقال إلى المعاينة التفصيلية'
            : 'Cliquez sur un jour pour afficher les détails'}
        </span>
      </div>
    </div>
  );
};

export default MyCalendarWeekView;
