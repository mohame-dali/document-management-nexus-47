import React from 'react';
import { Award, GraduationCap, Briefcase, FileCheck, Tag } from 'lucide-react';

interface AssociationTypeBadgeProps {
  type: string;
  className?: string;
}

export const AssociationTypeBadge: React.FC<AssociationTypeBadgeProps> = ({ type, className = '' }) => {
  const normalized = (type || '').trim().toLowerCase();

  // Subtle gold accent for Stage, Formation, Diplome
  // Text is strictly dark (#1a202c) on gold to guarantee WCAG AA contrast and adhere to user directives
  if (normalized.includes('stage') || normalized.includes('تدريب')) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold bg-[#FFCB56]/25 text-[#1a202c] border border-[#FFCB56] ${className}`}
      >
        <Briefcase className="w-3.5 h-3.5 text-[#b45309]" />
        <span>{type}</span>
      </span>
    );
  }

  if (normalized.includes('formation') || normalized.includes('تكوين')) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold bg-[#FFD758]/30 text-[#1a202c] border border-[#FFCB56] ${className}`}
      >
        <Award className="w-3.5 h-3.5 text-[#b45309]" />
        <span>{type}</span>
      </span>
    );
  }

  if (normalized.includes('dipl') || normalized.includes('شهادة') || normalized.includes('دبلوم')) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold bg-[#FFCB56]/30 text-[#1a202c] border border-[#eab308] ${className}`}
      >
        <GraduationCap className="w-3.5 h-3.5 text-[#b45309]" />
        <span>{type}</span>
      </span>
    );
  }

  if (normalized.includes('décision') || normalized.includes('decision') || normalized.includes('قرار')) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold bg-blue-50 text-[#1e3a8a] border border-blue-200 ${className}`}
      >
        <FileCheck className="w-3.5 h-3.5 text-[#2563eb]" />
        <span>{type}</span>
      </span>
    );
  }

  // Default / Autre
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-gray-100 text-[#1a202c] border border-gray-200 ${className}`}
    >
      <Tag className="w-3.5 h-3.5 text-gray-500" />
      <span>{type || 'أخرى'}</span>
    </span>
  );
};

export default AssociationTypeBadge;
