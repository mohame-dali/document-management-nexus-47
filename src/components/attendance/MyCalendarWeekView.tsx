import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { AttendanceRecord } from '@/services/attendanceService';
import { LeaveReason } from '@/services/leaveReasonService';
import { getStatusVisualInfo } from './MyAttendanceLegend';

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
    <div className="bg-white border border-[#e2e8f0] rounded p-5 space-y-5 shadow-none" dir="rtl">
      {/* Contrôles navigation semaine */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#edf2f7] pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevWeek}
            className="h-9 px-3 border-[#e2e8f0] rounded text-[#2c5282] hover:bg-gray-50 flex items-center gap-1 text-xs"
            title="الأسبوع السابق"
          >
            <ChevronRight className="h-4 w-4" />
            <span>الأسبوع السابق</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentWeek}
            className="h-9 px-3 border-[#e2e8f0] rounded text-gray-700 hover:bg-gray-50 text-xs font-semibold"
          >
            الأسبوع الحالي
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWeek}
            className="h-9 px-3 border-[#e2e8f0] rounded text-[#2c5282] hover:bg-gray-50 flex items-center gap-1 text-xs"
            title="الأسبوع الموالي"
          >
            <span>الأسبوع الموالي</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-xs text-[#718096] flex items-center gap-1.5 font-mono">
          <Calendar className="h-3.5 w-3.5 text-[#2c5282]" />
          <span>{weekRangeLabel}</span>
        </div>
      </div>

      {/* Grille 7 colonnes */}
      {isLoading ? (
        <div className="py-16 text-center space-y-2">
          <div className="h-6 w-6 border-2 border-[#2c5282] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500">جاري تحميل بيانات الأسبوع...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const att = attendanceMap.get(day.date);
            const visual = getStatusVisualInfo(att, leaveReasons);

            return (
              <div
                key={day.date}
                onClick={() => onSelectDay && onSelectDay(day.date)}
                className={`p-3.5 rounded border transition-all duration-150 flex flex-col justify-between min-h-[140px] cursor-pointer hover:shadow-sm ${
                  day.isToday ? 'ring-2 ring-[#2c5282]' : ''
                }`}
                style={{
                  backgroundColor: visual.bgLight,
                  borderColor: visual.borderColor,
                }}
              >
                {/* Entête de case */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">{day.dayName}</span>
                    {day.isToday && (
                      <span className="text-[10px] bg-[#2c5282] text-white px-1.5 py-0.2 rounded font-semibold">
                        اليوم
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-gray-900 font-mono mt-0.5">
                    {day.dayNumber}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">{day.date}</div>
                </div>

                {/* Badge d'état dans la case */}
                <div className="mt-3 pt-2 border-t border-black/5 space-y-1">
                  <div
                    className="text-xs font-semibold px-2 py-1 rounded text-center truncate"
                    style={{
                      backgroundColor: '#ffffff',
                      color: visual.color,
                      border: `1px solid ${visual.borderColor}`,
                    }}
                    title={visual.label}
                  >
                    {visual.label}
                  </div>

                  {att?.statut === 'present' && att.heureArrivee && (
                    <div className="text-[11px] text-gray-500 flex items-center justify-center gap-1 font-mono">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span>{att.heureArrivee}</span>
                    </div>
                  )}

                  {att?.statut === 'absent' && visual.impacteSolde && (
                    <div className="text-[10px] text-amber-700 text-center font-medium">
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
      <div className="pt-3 border-t border-[#edf2f7] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#718096]">حصيلة هذا الأسبوع :</span>
          <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2.5 py-1 rounded border border-green-200 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>حضور : {weekStats.presents} أيام</span>
          </span>
          <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2.5 py-1 rounded border border-red-200 font-medium">
            <XCircle className="h-3.5 w-3.5" />
            <span>غياب : {weekStats.absents} أيام</span>
          </span>
          <span className="text-gray-500 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
            غير مسجل : {weekStats.unrecorded} أيام
          </span>
        </div>

        <span className="text-gray-400 text-[11px]">
          * اضغط على أي يوم للانتقال إلى المعاينة التفصيلية
        </span>
      </div>
    </div>
  );
};

export default MyCalendarWeekView;
