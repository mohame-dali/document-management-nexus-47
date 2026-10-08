import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Users, ChevronDown, ChevronUp, User } from 'lucide-react';
import { ChartPersonnel } from '@/services/organizationChartService';
import PersonnelAvatar from '../hr/PersonnelAvatar';

interface DepartmentNodeProps {
  data: {
    _id: string;
    name: string;
    unitType: 'bureau_ordre' | 'rh' | 'service';
    totalPersonnel: number;
    personnel: ChartPersonnel[];
    onPersonnelClick?: (personnelId: string) => void;
  };
}

const DepartmentNode: React.FC<DepartmentNodeProps> = ({ data }) => {
  const [expanded, setExpanded] = useState(false);

  const getBorderColor = () => {
    switch (data.unitType) {
      case 'bureau_ordre':
        return 'border-amber-300';
      case 'rh':
        return 'border-emerald-400';
      case 'service':
      default:
        return 'border-blue-200';
    }
  };

  const getBadgeStyle = (unitType: string) => {
    switch (unitType) {
      case 'bureau_ordre':
        return {
          label: 'مكتب الضبط',
          className: 'bg-amber-100 text-amber-900 border border-amber-300',
        };
      case 'rh':
        return {
          label: 'الموارد البشرية',
          className: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
        };
      case 'service':
      default:
        return {
          label: 'مصلحة',
          className: 'bg-blue-100 text-blue-900 border border-blue-300',
        };
    }
  };

  const badgeInfo = getBadgeStyle(data.unitType);

  return (
    <div
      className={`bg-white border-2 ${getBorderColor()} rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] p-4 w-[280px] text-right select-none transition-all duration-200`}
      dir="rtl"
    >
      <Handle type="target" position={Position.Top} className="!bg-[#cbd5e1] !w-2.5 !h-2.5" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-bold text-sm text-[#1a202c] leading-tight break-words flex-1">
          {data.name}
        </h4>
        <div className="shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full ${badgeInfo.className}`}>
            {badgeInfo.label}
          </span>
        </div>
      </div>

      {/* Staff count toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs text-[#4a5568] hover:text-[#2c5282] hover:bg-[#f7fafc] px-2 py-1.5 rounded border border-[#edf2f7] transition-colors mt-2"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Users className="w-3.5 h-3.5 text-[#2c5282]" />
          <span>
            {data.totalPersonnel} موظف{data.totalPersonnel > 1 ? 'ين' : ''}
          </span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[#718096]">
          {expanded ? (
            <>
              <span>إخفاء</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>عرض</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </span>
      </button>

      {/* Collapsible list */}
      {expanded && (
        <div className="mt-3 border-t border-[#edf2f7] pt-2 max-h-48 overflow-y-auto space-y-1.5 nodrag nowheel">
          {data.personnel && data.personnel.length > 0 ? (
            data.personnel.map((p) => (
              <div
                key={p._id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (data.onPersonnelClick) {
                    data.onPersonnelClick(p._id);
                  }
                }}
                className="flex items-center gap-2 p-1.5 hover:bg-[#edf2f7] rounded cursor-pointer transition-colors text-right"
                title={`${p.prenom} ${p.nom} - انقر لعرض الملف`}
              >
                <PersonnelAvatar
                  photo={p.photo}
                  nom={p.nom}
                  prenom={p.prenom}
                  size="xs"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#1a202c] truncate">
                    {p.prenom} {p.nom}
                  </p>
                  {p.poste ? (
                    <p className="text-[10px] text-[#718096] truncate">{p.poste}</p>
                  ) : (
                    <p className="text-[10px] text-[#a0aec0] italic truncate">بدون خطة</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-[#a0aec0] text-center py-2">لا يوجد موظفين مسجلين</p>
          )}
          {data.totalPersonnel > 10 && (
            <p className="text-[10px] text-[#718096] text-center pt-1 border-t border-dashed border-[#e2e8f0]">
              + {data.totalPersonnel - 10} موظفين آخرين
            </p>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-[#cbd5e1] !w-2.5 !h-2.5" />
    </div>
  );
};

export default DepartmentNode;
