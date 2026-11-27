import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
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
  dayAttendance: AttendanceRecord | null;
  leaveReasons: LeaveReason[];
  isLoading: boolean;
}

export const MyCalendarDayView: React.FC<MyCalendarDayViewProps> = ({
  selectedDate,
  dayAttendance,
  leaveReasons,
  isLoading,
}) => {
  const { dir, isRTL } = useDirection();

  const visual = getStatusVisualInfo(dayAttendance, leaveReasons, isRTL);
  const details = dayAttendance?.detailsMotif;

  const bannerClasses =
    visual.statut === 'present'
      ? 'bg-emerald-50/70 dark:bg-emerald-950/35 border-emerald-200/80 dark:border-emerald-800/70'
      : visual.statut === 'unrecorded'
      ? 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700'
      : 'bg-white dark:bg-slate-900';

  return (
    <div className="p-4 sm:p-5 space-y-4 text-start" dir={dir}>
      {isLoading ? (
        <div className="py-12 text-center space-y-2">
          <div className="h-6 w-6 border-2 border-[#2c5282] dark:border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {isRTL ? 'جاري تحميل بيانات اليوم...' : 'Chargement des données du jour...'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Entête du jour avec statut */}
          <div
            className={`p-5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-150 ${bannerClasses}`}
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
                {isRTL ? 'تاريخ المعاينة اليومية' : 'Date sélectionnée'}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                <bdi dir={isRTL ? 'rtl' : 'ltr'} className="tabular-nums">
                  {formatDateWithWeekday(selectedDate, isRTL ? 'ar' : 'fr')}
                </bdi>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{selectedDate}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Badge d'état principal */}
              <div
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 border bg-white/95 dark:bg-slate-900/90 ${
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
                  className={`w-2 h-2 rounded-full shrink-0 ${
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
                <div className="px-3 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 tabular-nums">
                  <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {isRTL
                      ? `وقت الوصول: ${dayAttendance.heureArrivee}`
                      : `Arrivée : ${dayAttendance.heureArrivee}`}
                  </span>
                </div>
              )}

              {/* Badge impact solde si absent */}
              {dayAttendance?.statut === 'absent' && (
                <div>
                  {visual.impacteSolde ? (
                    <Badge
                      variant="outline"
                      className="rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 px-3 py-1 text-xs font-semibold flex items-center gap-1"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{isRTL ? 'يخصم من رصيد الإجازات' : 'Déduit du solde'}</span>
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800 px-3 py-1 text-xs font-semibold flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{isRTL ? 'لا يخصم من الرصيد السنوي' : 'Non déduit du solde'}</span>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section détails contextuels du motif d'absence */}
          {dayAttendance?.statut === 'absent' && details && (
            <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-200/80 dark:border-slate-700 pb-2">
                <FileText className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                <span>{isRTL ? 'البيانات التفصيلية لسبب الغياب' : 'Détails du motif'}</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                {details.nomService && (
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
                      <span>{isRTL ? 'المصلحة أو الوجهة:' : 'Service :'}</span>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {details.nomService}
                    </span>
                  </div>
                )}

                {details.lieuMission && (
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
                      <span>{isRTL ? 'مكان المهمة:' : 'Lieu de mission :'}</span>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {details.lieuMission}
                    </span>
                  </div>
                )}

                {details.objetMission && (
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
                      <span>{isRTL ? 'موضوع المهمة:' : 'Objet de la mission :'}</span>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {details.objetMission}
                    </span>
                  </div>
                )}

                {details.intituleFormation && (
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
                      <span>{isRTL ? 'عنوان الدورة التكوينية:' : 'Formation :'}</span>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {details.intituleFormation}
                    </span>
                  </div>
                )}

                {details.organismeFormation && (
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">
                      {isRTL ? 'الهيئة المؤطرة:' : 'Organisme :'}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {details.organismeFormation}
                    </span>
                  </div>
                )}

                {details.dureeFormation && (
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">
                      {isRTL ? 'مدة التكوين:' : 'Durée :'}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {details.dureeFormation}
                    </span>
                  </div>
                )}
              </div>

              {details.commentaire && (
                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700 text-xs space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    <span>{isRTL ? 'ملاحظات إضافية:' : 'Commentaire :'}</span>
                  </span>
                  <p className="text-slate-800 dark:text-slate-200">{details.commentaire}</p>
                </div>
              )}
            </div>
          )}

          {/* Si non enregistré */}
          {!dayAttendance && (
            <div className="bg-slate-50/60 dark:bg-slate-800/30 border border-dashed border-slate-300/80 dark:border-slate-700 rounded-lg p-8 text-center space-y-2">
              <Calendar className="h-7 w-7 text-slate-400 dark:text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {isRTL
                  ? 'لم يتم تسجيل حالة الحضور لهذا اليوم بعد'
                  : 'Aucune présence enregistrée pour cette journée'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isRTL
                  ? 'يقوم مسؤول الموارد البشرية أو رئيس المصلحة بتسجيل وتأكيد الحضور اليومي.'
                  : 'Le pointage est saisi et validé par le service des ressources humaines.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyCalendarDayView;
