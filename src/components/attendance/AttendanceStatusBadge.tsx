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
        className={`inline-flex items-center gap-1.5 font-semibold rounded border border-[#cbd5e1] bg-[#f1f5f9] text-[#1e293b] ${
          size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
        } ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-sm bg-[#475569] shrink-0" />
        <span>غير مسجل</span>
      </span>
    );
  }

  // 2. Présent
  if (statut === 'present') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-semibold rounded border border-[#86efac] bg-[#ecfdf5] text-[#14532d] ${
          size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
        } ${className}`}
      >
        <Check className={size === 'sm' ? 'h-3 w-3 text-[#14532d]' : 'h-3.5 w-3.5 text-[#14532d]'} />
        <span>حاضر</span>
        {showTime && heureArrivee && (
          <span className="font-mono tabular-nums text-[#14532d] text-[11px] bg-white px-1 rounded border border-[#86efac]">
            {heureArrivee}
          </span>
        )}
      </span>
    );
  }

  // 3. Absent avec motif
  const reason = leaveReasons.find((r) => r.code === motif);
  const label = reason?.labelAr || (motif ? motif.replace(/_/g, ' ') : 'غائب');
  const baseColor = reason?.color || '#9a3412';
  const isDeductible = impacteSolde ?? reason?.impacteSolde ?? false;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded border transition-colors ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
      } ${className}`}
      style={{
        backgroundColor: `${baseColor}14`,
        borderColor: `${baseColor}55`,
        color: '#0f172a',
      }}
      title={reason?.description || label}
    >
      <span
        className="w-2 h-2 rounded-sm shrink-0"
        style={{ backgroundColor: baseColor }}
      />
      <span className="font-bold truncate max-w-[120px]">{label}</span>

      {isDeductible && (
        <span
          className="text-[10px] px-1 rounded font-semibold border border-[#f59e0b] bg-[#fef9e7] text-[#78350f]"
          title="يخصم من رصيد الإجازات السنوية"
        >
          خصم
        </span>
      )}
    </span>
  );
};

export default AttendanceStatusBadge;
