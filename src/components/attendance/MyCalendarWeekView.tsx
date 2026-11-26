import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { AttendanceRecord } from '@/services/attendanceService';
import { LeaveReason } from '@/services/leaveReasonService';
import { getStatusVisualInfo } from './MyAttendanceLegend';
import { useDirection } from '@/i18n/useDirection';

interface MyCalendarWeekViewProps {
  currentDate: string; // YYYY-MM-DD (n'importe quel jour de la semaine)
  onDateChange: (date: string) => void;
  attendances: AttendanceRecord[];
  leaveReasons: LeaveReason[];
  isLoading: boolean;
  onSelectDay?: (date: string) => void;
}

const ARABIC_WEEKDAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const MyCalendarWeekView: React.FC<MyCalendarWeekViewProps> = ({
  currentDate,
  onDateChange,
  attendances,
  leaveReasons,
  isLoading,
  onSelectDay,
}) => {
  const { dir, isRTL } = useDirection();

  // Calculer les 7 jours de la semaine (commençant le Dimanche)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay(); // 0 = Dimanche
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      const iso = day.toISOString().split('T')[0];
      days.push({
        date: iso,
        dayNumber: day.getDate(),
        month: day.getMonth() + 1,
        dayName: ARABIC_WEEKDAYS[i],
        isWeekend: i === 5 || i === 6, // Vendredi / Samedi
        isToday: iso === new Date().toISOString().split('T')[0],
      });
    }
    return days;
  }, [currentDate]);

  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleCurrentWeek = () => {
    onDateChange(new Date().toISOString().split('T')[0]);
  };

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
    let unrecorded = 0;

    weekDays.forEach((wd) => {
      const att = attendanceMap.get(wd.date);
      if (!att) {
        unrecorded++;
      } else if (att.statut === 'present') {
        presents++;
      } else {
        absents++;
      }
    });

    return { presents, absents, unrecorded };
  }, [weekDays, attendanceMap]);

  const weekRangeLabel = useMemo(() => {
    if (weekDays.length === 0) return '';
    const first = weekDays[0];
    const last = weekDays[6];
    return `من ${first.date} إلى ${last.date}`;
  }, [weekDays]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-5 shadow-sm text-start" dir={dir}>
      {/* Contrôles navigation semaine */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevWeek}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
            title="الأسبوع السابق"
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <span>الأسبوع السابق</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentWeek}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            الأسبوع الحالي
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWeek}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
            title="الأسبوع الموالي"
          >
            <span>الأسبوع الموالي</span>
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono tabular-nums">
          <Calendar className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400" />
          <span>{weekRangeLabel}</span>
        </div>
      </div>

      {/* Grille 7 colonnes */}
      {isLoading ? (
        <div className="py-16 text-center space-y-2">
          <div className="h-6 w-6 border-2 border-[#2c5282] dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-700 dark:text-slate-300">جاري تحميل بيانات الأسبوع...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const att = attendanceMap.get(day.date);
            const visual = getStatusVisualInfo(att, leaveReasons);

            const cardClasses =
              visual.statut === 'present'
                ? 'bg-emerald-50 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800/70'
                : visual.statut === 'unrecorded'
                ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                : 'bg-white dark:bg-slate-900';

            return (
              <div
                key={day.date}
                onClick={() => onSelectDay && onSelectDay(day.date)}
                className={`p-3.5 rounded-lg border transition-all duration-150 flex flex-col justify-between min-h-[140px] cursor-pointer hover:shadow-sm ${cardClasses} ${
                  day.isToday ? 'ring-2 ring-[#2c5282] dark:ring-blue-500' : ''
                }`}
                style={
                  visual.statut === 'absent'
                    ? {
                        backgroundColor: visual.bgLight,
                        borderColor: visual.borderColor,
                      }
                    : undefined
                }
              >
                {/* Entête de case */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{day.dayName}</span>
                    {day.isToday && (
                      <span className="text-[13px] bg-[#2c5282] dark:bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold">
                        اليوم
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5">
                    {day.dayNumber}
                  </div>
                  <div className="text-[13px] text-slate-700 dark:text-slate-300 font-mono tabular-nums">{day.date}</div>
                </div>

                {/* Badge d'état dans la case */}
                <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/10 space-y-1">
                  <div
                    className={`text-xs font-semibold px-2 py-1 rounded-md text-center truncate bg-white/95 dark:bg-slate-900/90 border ${
                      visual.statut === 'present'
                        ? 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : visual.statut === 'unrecorded'
                        ? 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        : ''
                    }`}
                    style={
                      visual.statut === 'absent'
                        ? {
                            color: visual.color,
                            borderColor: visual.borderColor,
                          }
                        : undefined
                    }
                    title={visual.label}
                  >
                    {visual.label}
                  </div>

                  {att?.statut === 'present' && att.heureArrivee && (
                    <div className="text-[13px] text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 font-mono tabular-nums">
                      <Clock className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                      <span>{att.heureArrivee}</span>
                    </div>
                  )}

                  {att?.statut === 'absent' && visual.impacteSolde && (
                    <div className="text-[13px] text-amber-700 dark:text-amber-300 text-center font-medium">
                      يخصم من الرصيد
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Résumé en bas */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-700 dark:text-slate-300">حصيلة هذا الأسبوع :</span>
          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 font-medium tabular-nums">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>حضور : {weekStats.presents} أيام</span>
          </span>
          <span className="flex items-center gap-1 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-800 font-medium tabular-nums">
            <XCircle className="h-3.5 w-3.5" />
            <span>غياب : {weekStats.absents} أيام</span>
          </span>
          <span className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 tabular-nums">
            غير مسجل : {weekStats.unrecorded} أيام
          </span>
        </div>

        <span className="text-slate-700 dark:text-slate-300 text-[13px]">
          * اضغط على أي يوم للانتقال إلى المعاينة التفصيلية
        </span>
      </div>
    </div>
  );
};

export default MyCalendarWeekView;
