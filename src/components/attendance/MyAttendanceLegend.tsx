import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LeaveReason, getLeaveReasons } from '@/services/leaveReasonService';
import { AttendanceRecord } from '@/services/attendanceService';
import { useDirection } from '@/i18n/useDirection';

export interface StatusVisualInfo {
  label: string;
  color: string;
  bgLight: string;
  borderColor: string;
  textColor: string;
  impacteSolde: boolean;
  statut: 'present' | 'absent' | 'unrecorded';
  motifCode?: string | null;
}

export const getStatusVisualInfo = (
  attendance: AttendanceRecord | null | undefined,
  leaveReasons: LeaveReason[]
): StatusVisualInfo => {
  if (!attendance) {
    return {
      label: 'غير مسجل',
      color: '#a0aec0',
      bgLight: '#f7fafc',
      borderColor: '#e2e8f0',
      textColor: '#718096',
      impacteSolde: false,
      statut: 'unrecorded',
      motifCode: null,
    };
  }

  if (attendance.statut === 'present') {
    return {
      label: 'حاضر',
      color: '#2f855a',
      bgLight: '#f0fff4',
      borderColor: '#c6f6d5',
      textColor: '#22543d',
      impacteSolde: false,
      statut: 'present',
      motifCode: null,
    };
  }

  // Absent : rechercher le LeaveReason correspondant
  const motif = attendance.motif;
  const safeReasonsList = Array.isArray(leaveReasons) ? leaveReasons : [];
  const reason = safeReasonsList.find((r) => r.code === motif || r._id === attendance.leaveReasonId);

  const label = reason?.labelAr || (motif ? motif.replace(/_/g, ' ') : 'غائب');
  const baseColor = reason?.color || '#dd6b20';
  const impacteSolde = attendance.impacteSolde ?? reason?.impacteSolde ?? false;

  return {
    label,
    color: baseColor,
    bgLight: `${baseColor}15`,
    borderColor: `${baseColor}40`,
    textColor: baseColor,
    impacteSolde,
    statut: 'absent',
    motifCode: motif,
  };
};

interface MyAttendanceLegendProps {
  leaveReasons?: LeaveReason[];
}

export const MyAttendanceLegend: React.FC<MyAttendanceLegendProps> = ({ leaveReasons: propLeaveReasons }) => {
  const { dir, isRTL } = useDirection();

  const { data: leaveReasons = [] } = useQuery({
    queryKey: ['leave-reasons-active'],
    queryFn: async () => {
      const res = await getLeaveReasons({ isActive: true });
      const resData = (res as { data?: unknown })?.data;
      if (Array.isArray(resData)) return resData as LeaveReason[];
      if (Array.isArray(res)) return res;
      return [];
    },
    enabled: !propLeaveReasons,
    staleTime: 5 * 60 * 1000,
  });

  const effectiveReasons = propLeaveReasons ?? leaveReasons;
  const safeReasons = Array.isArray(effectiveReasons) ? effectiveReasons : [];
  const activeReasons = safeReasons.filter((r) => r && r.isActive);

  return (
    <div
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-sm"
      dir={dir}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
          {isRTL ? 'دليل الألوان والرموز' : 'Légende des statuts'}
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {isRTL
            ? 'يتم تحميل أسباب الغياب ديناميكياً بحسب إعدادات المؤسسة'
            : "Motifs d'absence chargés dynamiquement selon la configuration"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-xs">
        {/* Présent */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
          <span className="font-semibold">{isRTL ? 'حاضر' : 'Présent'}</span>
        </div>

        {/* Non saisi */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
          <span>{isRTL ? 'غير مسجل بعد' : 'Non saisi'}</span>
        </div>

        {/* Motifs dynamiques */}
        {activeReasons.map((reason) => {
          const color = reason.color || '#4a5568';
          const reasonLabel = isRTL ? reason.labelAr : reason.labelFr || reason.labelAr;
          return (
            <div
              key={reason._id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100"
              style={{
                borderInlineStartWidth: '3px',
                borderInlineStartColor: color,
              }}
              title={reason.description || undefined}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium">{reasonLabel}</span>
              {reason.impacteSolde ? (
                <span className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 rounded border border-amber-200 dark:border-amber-800/60">
                  {isRTL ? 'مخصوم' : 'Déduit'}
                </span>
              ) : (
                <span className="text-[11px] text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 rounded border border-blue-200 dark:border-blue-800/60">
                  {isRTL ? 'غير مخصوم' : 'Non déduit'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyAttendanceLegend;
