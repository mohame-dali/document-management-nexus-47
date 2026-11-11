import React from 'react';
import { LeaveReason } from '@/services/leaveReasonService';
import { Check, X, Clock, AlertCircle } from 'lucide-react';

export interface AttendanceStatusBadgeProps {
  statut?: 'present' | 'absent' | 'unrecorded' | string | null;
  motif?: string | null;
  heureArrivee?: string | null;
  leaveReasons?: LeaveReason[];
  impacteSolde?: boolean;
  size?: 'sm' | 'md';
  showTime?: boolean;
  className?: string;
}

export const AttendanceStatusBadge: React.FC<AttendanceStatusBadgeProps> = ({
  statut,
  motif,
  heureArrivee,
  leaveReasons = [],
  impacteSolde,
  size = 'md',
  showTime = true,
  className = '',
}) => {
  // 1. Non saisi
  if (!statut || statut === 'unrecorded') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded border border-[#e2e8f0] bg-[#f7fafc] text-[#718096] ${
          size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#a0aec0] shrink-0" />
        <span>غير مسجل</span>
      </span>
    );
  }

  // 2. Présent
  if (statut === 'present') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-semibold rounded border border-[#c6f6d5] bg-[#f0fff4] text-[#22543d] ${
          size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } ${className}`}
      >
        <Check className={size === 'sm' ? 'h-3 w-3 text-[#2f855a]' : 'h-3.5 w-3.5 text-[#2f855a]'} />
        <span>حاضر</span>
        {showTime && heureArrivee && (
          <span className="font-mono text-[#2f855a] text-[10px] bg-white/80 px-1 rounded border border-green-200">
            {heureArrivee}
          </span>
        )}
      </span>
    );
  }

  // 3. Absent avec motif
  const reason = leaveReasons.find((r) => r.code === motif);
  const label = reason?.labelAr || (motif ? motif.replace(/_/g, ' ') : 'غائب');
  const baseColor = reason?.color || '#dd6b20';
  const isDeductible = impacteSolde ?? reason?.impacteSolde ?? false;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border transition-colors ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${className}`}
      style={{
        backgroundColor: `${baseColor}15`,
        borderColor: `${baseColor}40`,
        color: baseColor,
      }}
      title={reason?.description || label}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: baseColor }}
      />
      <span className="font-bold truncate max-w-[120px]">{label}</span>

      {isDeductible && (
        <span
          className="text-[9px] px-1 rounded font-semibold border"
          style={{
            backgroundColor: '#fffaf0',
            borderColor: '#feebc8',
            color: '#c05621',
          }}
          title="يخصم من رصيد الإجازات السنوية"
        >
          خصم
        </span>
      )}
    </span>
  );
};

export default AttendanceStatusBadge;
