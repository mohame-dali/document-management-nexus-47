import React from 'react';
import { Handle, Position } from 'reactflow';
import { Users, Building } from 'lucide-react';

interface DepartmentNodeProps {
  data: {
    name: string;
    description: string;
    isFunctional: boolean;
    unitType: 'bureau_directeur' | 'bureau_ordre' | 'rh' | null;
    personnelCount: number;
  };
}

const DepartmentNode: React.FC<DepartmentNodeProps> = ({ data }) => {
  const getBadge = () => {
    if (data.unitType === 'bureau_directeur') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-white bg-[#2c5282] rounded-full">
          Bureau Directeur
        </span>
      );
    }
    if (data.unitType === 'bureau_ordre') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-[#1a202c] bg-[#FFCB56] rounded-full">
          Bureau d'Ordre
        </span>
      );
    }
    if (data.unitType === 'rh') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-white bg-[#38a169] rounded-full">
          Ressources Humaines
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-[#cbd5e1] rounded shadow-sm px-4 py-3 min-w-[200px] text-center select-none">
      <Handle type="target" position={Position.Top} className="!bg-[#cbd5e1]" />
      <div className="flex items-center justify-center gap-2 mb-1">
        <Building className="w-4 h-4 text-[#2c5282]" />
        <p className="text-sm font-bold text-[#1a202c]">{data.name}</p>
      </div>
      {getBadge()}
      <p className="text-xs text-gray-500 mt-1.5 flex items-center justify-center gap-1">
        <Users className="w-3 h-3" />
        {data.personnelCount} employé{data.personnelCount > 1 ? 's' : ''}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-[#cbd5e1]" />
    </div>
  );
};

export default DepartmentNode;
