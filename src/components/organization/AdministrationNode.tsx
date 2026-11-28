import React from 'react';
import { Handle, Position } from 'reactflow';
import { Building2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';

interface AdministrationNodeProps {
  data: { name: string };
}

const AdministrationNode: React.FC<AdministrationNodeProps> = ({ data }) => {
  const { language } = useLanguage();
  const isFr = language === 'fr';

  return (
    <div className="bg-[#2c5282] text-white rounded-lg shadow-sm px-6 py-4 min-w-[240px] text-center select-none border border-[#1e3a5f]">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Building2 className="w-4 h-4 opacity-90" />
        <span className="text-xs font-medium opacity-85">
          {isFr ? 'Administration' : 'الإدارة'}
        </span>
      </div>
      <p className="text-base font-bold leading-tight">{data.name}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-[#2c5282]" />
    </div>
  );
};

export default AdministrationNode;
