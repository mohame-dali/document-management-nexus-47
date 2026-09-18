import React from 'react';
import { Handle, Position } from 'reactflow';
import { Building2 } from 'lucide-react';

interface AdministrationNodeProps {
  data: { name: string };
}

const AdministrationNode: React.FC<AdministrationNodeProps> = ({ data }) => {
  return (
    <div className="bg-[#2c5282] text-white rounded-lg shadow-md px-6 py-4 min-w-[240px] text-center select-none">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Building2 className="w-5 h-5" />
        <span className="text-xs font-medium opacity-80">الإدارة</span>
      </div>
      <p className="text-base font-bold leading-tight">{data.name}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-[#2c5282]" />
    </div>
  );
};

export default AdministrationNode;
