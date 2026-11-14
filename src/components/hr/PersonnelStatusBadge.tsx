import React from 'react';
import { PersonnelStatut } from '@/types/hr';

interface PersonnelStatusBadgeProps {
  statut: PersonnelStatut | string;
  className?: string;
}

export const PersonnelStatusBadge: React.FC<PersonnelStatusBadgeProps> = ({ statut, className = '' }) => {
  switch (statut) {
    case 'actif':
      return (
        <span
          className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold rounded border border-[#86efac] bg-[#ecfdf5] text-[#14532d] ${className}`}
        >
          نشط
        </span>
      );
    case 'inactif':
      return (
        <span
          className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold rounded border border-[#cbd5e1] bg-[#f1f5f9] text-[#1e293b] ${className}`}
        >
          غير نشط
        </span>
      );
    case 'en_attente':
    default:
      return (
        <span
          className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold rounded border border-[#d97706] bg-[#FFCB56] text-[#111827] ${className}`}
        >
          في الانتظار
        </span>
      );
  }
};

export default PersonnelStatusBadge;
