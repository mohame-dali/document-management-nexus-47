import React from 'react';
import { LeaveReason } from '@/services/leaveReasonService';
import { Check } from 'lucide-react';
import { useDirection } from '@/i18n/useDirection';

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
  const { isRTL } = useDirection();

  // 1. Non saisi
  if (!statut || statut === 'unrecorded') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs'
        } ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-slate-400 shrink-0" />
        <span>{isRTL ? 'غير مسجل' : 'Non saisi'}</span>
      </span>
    );
  }

  // 2. Présent
  if (statut === 'present') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-semibold rounded-md border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs'
        } ${className}`}
      >
        <Check
          className={
            size === 'sm'
              ? 'h-3 w-3 text-emerald-700 dark:text-emerald-300'
              : 'h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300'
          }
        />
        <span>{isRTL ? 'حاضر' : 'Présent'}</span>
        {showTime && heureArrivee && (
          <span className="font-mono tabular-nums text-emerald-900 dark:text-emerald-200 text-xs bg-white/90 dark:bg-emerald-900/60 px-1.5 rounded border border-emerald-200 dark:border-emerald-700/70">
            {heureArrivee}
          </span>
        )}
      </span>
    );
  }

  // 3. Absent avec motif
  const reason = leaveReasons.find((r) => r.code === motif);
  const label =
    (isRTL ? reason?.labelAr : reason?.labelFr || reason?.labelAr) ||
    (motif ? motif.replace(/_/g, ' ') : isRTL ? 'غائب' : 'Absent');
  const baseColor = reason?.color || '#c2410c';
  const isDeductible = impacteSolde ?? reason?.impacteSolde ?? false;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-md border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/95 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 transition-colors ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs'
      } ${className}`}
      style={{
        borderInlineStartWidth: '3px',
        borderInlineStartColor: baseColor,
      }}
      title={reason?.description || label}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: baseColor }}
      />
      <span className="font-bold truncate max-w-[140px]">{label}</span>

      {isDeductible && (
        <span
          className="text-[11px] px-1.5 rounded font-semibold border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
          title={isRTL ? 'يخصم من رصيد الإجازات السنوية' : 'Déduit du solde de congés'}
        >
          {isRTL ? 'خصم' : 'Déduit'}
        </span>
      )}
    </span>
  );
};

export default AttendanceStatusBadge;
