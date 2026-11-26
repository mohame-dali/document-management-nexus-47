import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Building2,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { AttendanceRecord } from '@/services/attendanceService';
import { LeaveReason } from '@/services/leaveReasonService';
import { formatDateWithWeekday } from '@/utils/formatDate';
import { getStatusVisualInfo } from './MyAttendanceLegend';
import { useDirection } from '@/i18n/useDirection';

interface MyCalendarDayViewProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  dayAttendance: AttendanceRecord | null;
  leaveReasons: LeaveReason[];
  isLoading: boolean;
}

export const MyCalendarDayView: React.FC<MyCalendarDayViewProps> = ({
  selectedDate,
  onDateChange,
  dayAttendance,
  leaveReasons,
  isLoading,
}) => {
  const { dir, isRTL } = useDirection();

  // Navigation jour précédent / suivant
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    const prev = current.toISOString().split('T')[0];
    onDateChange(prev);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    const next = current.toISOString().split('T')[0];
    onDateChange(next);
  };

  const handleToday = () => {
    const today = new Date().toISOString().split('T')[0];
    onDateChange(today);
  };

  const visual = getStatusVisualInfo(dayAttendance, leaveReasons);
  const details = dayAttendance?.detailsMotif;

  const bannerClasses =
    visual.statut === 'present'
      ? 'bg-emerald-50 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800/70'
      : visual.statut === 'unrecorded'
      ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
      : 'bg-white dark:bg-slate-900';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-5 shadow-sm text-start" dir={dir}>
      {/* Contrôles de navigation et date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevDay}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
            title="اليوم السابق"
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <span>اليوم السابق</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            اليوم
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextDay}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
            title="اليوم الموالي"
          >
            <span>اليوم الموالي</span>
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Sélecteur de date direct */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">اختر التاريخ:</span>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-9 w-40 border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-950 dark:text-slate-100 tabular-nums"
          />
        </div>
      </div>

      {/* Détails de la journée */}
      {isLoading ? (
        <div className="py-12 text-center space-y-2">
          <div className="h-6 w-6 border-2 border-[#2c5282] dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400">جاري تحميل بيانات اليوم...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Entête du jour avec statut */}
          <div
            className={`p-5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 ${bannerClasses}`}
            style={
              visual.statut === 'absent'
                ? {
                    backgroundColor: visual.bgLight,
                    borderColor: visual.borderColor,
                  }
                : undefined
            }
          >
            <div className="space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                تاريخ المعاينة اليومية
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                <bdi dir={isRTL ? 'rtl' : 'ltr'} className="tabular-nums">{formatDateWithWeekday(selectedDate, isRTL ? 'ar' : 'fr')}</bdi>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">{selectedDate}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Badge d'état principal */}
              <div
                className={`px-3.5 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 border shadow-none bg-white/95 dark:bg-slate-900/90 ${
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
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    visual.statut === 'present'
                      ? 'bg-emerald-600 dark:bg-emerald-400'
                      : visual.statut === 'unrecorded'
                      ? 'bg-slate-400 dark:bg-slate-500'
                      : ''
                  }`}
                  style={visual.statut === 'absent' ? { backgroundColor: visual.color } : undefined}
                />
                <span>{visual.label}</span>
              </div>

              {/* Heure d'arrivée si présent */}
              {dayAttendance?.statut === 'present' && dayAttendance.heureArrivee && (
                <div className="px-3 py-1.5 rounded-lg bg-white/95 dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 tabular-nums">
                  <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>وقت الوصول : {dayAttendance.heureArrivee}</span>
                </div>
              )}

              {/* Badge impact solde si absent */}
              {dayAttendance?.statut === 'absent' && (
                <div>
                  {visual.impacteSolde ? (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 px-3 py-1 text-xs font-semibold flex items-center gap-1"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>يخصم من رصيد الإجازات</span>
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800 px-3 py-1 text-xs font-semibold flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>لا يخصم من الرصيد السنوي</span>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section détails contextuels du motif d'absence */}
          {dayAttendance?.statut === 'absent' && details && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-2">
                <FileText className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
                <span>البيانات التفصيلية لسبب الغياب</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                {/* Service */}
                {details.nomService && (
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400" />
                      <span>المصلحة أو الوجهة:</span>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{details.nomService}</span>
                  </div>
                )}

                {/* Mission */}
                {details.lieuMission && (
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400" />
                      <span>مكان المهمة:</span>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{details.lieuMission}</span>
                  </div>
                )}

                {details.objetMission && (
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400" />
                      <span>موضوع المهمة:</span>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{details.objetMission}</span>
                  </div>
                )}

                {/* Formation */}
                {details.intituleFormation && (
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400" />
                      <span>عنوان الدورة التكوينية:</span>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{details.intituleFormation}</span>
                  </div>
                )}

                {details.organismeFormation && (
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">الهيئة المؤطرة:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{details.organismeFormation}</span>
                  </div>
                )}

                {details.dureeFormation && (
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">مدة التكوين:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{details.dureeFormation}</span>
                  </div>
                )}
              </div>

              {details.commentaire && (
                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                    <span>ملاحظات إضافية:</span>
                  </span>
                  <p className="text-slate-800 dark:text-slate-200">{details.commentaire}</p>
                </div>
              )}
            </div>
          )}

          {/* Si non enregistré */}
          {!dayAttendance && (
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center space-y-2">
              <Calendar className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                لم يتم تسجيل حالة الحضور لهذا اليوم بعد
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                يقوم مسؤول الموارد البشرية أو رئيس المصلحة بتسجيل وتأكيد الحضور اليومي.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyCalendarDayView;
