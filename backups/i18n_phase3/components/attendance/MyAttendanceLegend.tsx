import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LeaveReason, getLeaveReasons } from '@/services/leaveReasonService';
import { AttendanceRecord } from '@/services/attendanceService';

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
    bgLight: `${baseColor}15`, // 10% opacity for gentle background
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
  const { data: leaveReasons = [] } = useQuery({
    queryKey: ['leave-reasons-active'],
    queryFn: async () => {
      const res = await getLeaveReasons({ isActive: true });
      if (Array.isArray((res as any)?.data)) return (res as any).data;
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
    <div className="bg-white border border-[#e2e8f0] rounded p-4 space-y-3 shadow-none" dir="rtl">
      <div className="flex items-center justify-between border-b border-[#edf2f7] pb-2">
        <h3 className="text-xs font-bold text-[#1a202c]">
          دليل الألوان والرموز (Légende des statuts)
        </h3>
        <span className="text-[11px] text-[#718096]">
          يتم تحميل أسباب الغياب ديناميكياً بحسب إعدادات المؤسسة
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-xs">
        {/* Présent */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f0fff4] border border-[#c6f6d5] text-[#22543d]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2f855a] shrink-0" />
          <span className="font-semibold">حاضر (Présent)</span>
        </div>

        {/* Non saisi */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f7fafc] border border-[#e2e8f0] text-[#718096]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#a0aec0] shrink-0" />
          <span>غير مسجل بعد</span>
        </div>

        {/* Motifs dynamiques */}
        {activeReasons.map((reason) => {
          const color = reason.color || '#4a5568';
          return (
            <div
              key={reason._id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border"
              style={{
                backgroundColor: `${color}12`,
                borderColor: `${color}35`,
                color: '#2d3748',
              }}
              title={reason.description || undefined}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium">{reason.labelAr}</span>
              {reason.impacteSolde ? (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                  مخصوم
                </span>
              ) : (
                <span className="text-[10px] text-blue-700 bg-blue-50 px-1 rounded border border-blue-200">
                  غير مخصوم
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
