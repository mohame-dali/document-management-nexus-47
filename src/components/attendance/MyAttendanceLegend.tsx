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
  leaveReasons: LeaveReason[],
  isRTL: boolean = true
): StatusVisualInfo => {
  if (!attendance) {
    return {
      label: isRTL ? 'غير مسجل' : 'Non saisi',
      color: '#94a3b8',
      bgLight: '#f8fafc',
      borderColor: '#e2e8f0',
      textColor: '#64748b',
      impacteSolde: false,
      statut: 'unrecorded',
      motifCode: null,
    };
  }

  if (attendance.statut === 'present') {
    return {
      label: isRTL ? 'حاضر' : 'Présent',
      color: '#15803d',
      bgLight: '#f0fdf4',
      borderColor: '#bbf7d0',
      textColor: '#166534',
      impacteSolde: false,
      statut: 'present',
      motifCode: null,
    };
  }

  // Absent : rechercher le LeaveReason correspondant
  const motif = attendance.motif;
  const safeReasonsList = Array.isArray(leaveReasons) ? leaveReasons : [];
  const reason = safeReasonsList.find((r) => r.code === motif || r._id === attendance.leaveReasonId);

  const label = isRTL
    ? reason?.labelAr || (motif ? motif.replace(/_/g, ' ') : 'غائب')
    : reason?.labelFr || reason?.labelAr || (motif ? motif.replace(/_/g, ' ') : 'Absent');
  const baseColor = reason?.color || '#d97706';
  const impacteSolde = attendance.impacteSolde ?? reason?.impacteSolde ?? false;

  return {
    label,
    color: baseColor,
    bgLight: `${baseColor}14`,
    borderColor: `${baseColor}38`,
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
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-5 py-3.5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3"
      dir={dir}
    >
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
        {isRTL ? 'دليل الحالات:' : 'Légende :'}
      </span>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        {/* Présent */}
        <div className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
          <span className="font-medium">{isRTL ? 'حاضر' : 'Présent'}</span>
        </div>

        {/* Jour ouvré passé non saisi */}
        <div className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
          <span>{isRTL ? 'غير مسجل (سابق)' : 'Non saisi (passé)'}</span>
        </div>

        {/* Motifs dynamiques */}
        {activeReasons.map((reason) => {
          const color = reason.color || '#475569';
          const reasonLabel = isRTL ? reason.labelAr : reason.labelFr || reason.labelAr;
          return (
            <div
              key={reason._id}
              className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
              title={reason.description || undefined}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium">{reasonLabel}</span>
              <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                {reason.impacteSolde
                  ? isRTL
                    ? '· مخصوم'
                    : '· Déduit'
                  : isRTL
                  ? '· غير مخصوم'
                  : '· Non déduit'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyAttendanceLegend;
