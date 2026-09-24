import React from 'react';
import { Handle, Position } from 'reactflow';
import { Award, Briefcase } from 'lucide-react';
import PersonnelAvatar from '../hr/PersonnelAvatar';

interface DirectorNodeProps {
  data: {
    _id?: string;
    nom: string;
    prenom: string;
    poste?: string;
    photo?: string;
    onDirectorClick?: (id: string) => void;
  };
}

const DirectorNode: React.FC<DirectorNodeProps> = ({ data }) => {
  const isClickable = !!data._id && !!data.onDirectorClick;

  return (
    <div
      onClick={() => {
        if (isClickable && data._id && data.onDirectorClick) {
          data.onDirectorClick(data._id);
        }
      }}
      className={`bg-white border-2 border-[#2c5282] rounded-lg shadow-md p-4 w-[280px] text-right select-none transition-all duration-200 ${
        isClickable ? 'cursor-pointer hover:shadow-lg hover:border-[#1a365d]' : ''
      }`}
      dir="rtl"
    >
      <Handle type="target" position={Position.Top} className="!bg-[#2c5282] !w-2.5 !h-2.5" />

      {/* Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-3 border-b border-[#e2e8f0] pb-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold text-white bg-[#2c5282] rounded-full">
          <Award className="w-3.5 h-3.5 text-[#FFCB56]" />
          مدير الإدارة (Directeur)
        </span>
        <span className="text-[11px] text-[#718096] font-medium">المستوى الأول</span>
      </div>

      {/* Director Identity */}
      <div className="flex items-center gap-3">
        <PersonnelAvatar
          photo={data.photo}
          nom={data.nom}
          prenom={data.prenom}
          size="md"
          className="border-2 border-[#2c5282]/30 shadow-xs"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#1a202c] truncate">
            {data.prenom} {data.nom}
          </h3>
          <p className="text-xs text-[#4a5568] flex items-center gap-1 mt-0.5 truncate">
            <Briefcase className="w-3 h-3 text-[#2c5282] shrink-0" />
            <span className="truncate">{data.poste || 'مدير الإدارة'}</span>
          </p>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[#2c5282] !w-2.5 !h-2.5" />
    </div>
  );
};

export default DirectorNode;
