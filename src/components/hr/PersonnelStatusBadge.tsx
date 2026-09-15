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
          className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold rounded text-white ${className}`}
          style={{ backgroundColor: '#38a169' }}
        >
          نشط
        </span>
      );
    case 'inactif':
      return (
        <span
          className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold rounded text-white ${className}`}
          style={{ backgroundColor: '#a0aec0' }}
        >
          غير نشط
        </span>
      );
    case 'en_attente':
    default:
      return (
        <span
          className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded ${className}`}
          style={{ backgroundColor: '#FFCB56', color: '#1a202c' }}
        >
          في الانتظار
        </span>
      );
  }
};

export default PersonnelStatusBadge;
