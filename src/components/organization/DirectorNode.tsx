import React from 'react';
import { Handle, Position } from 'reactflow';
import { Crown, Briefcase } from 'lucide-react';
import PersonnelAvatar from '../hr/PersonnelAvatar';

interface DirectorNodeProps {
  data: {
    _id?: string;
    nom: string;
    prenom: string;
    username?: string | null;
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
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-[#FFD758] text-[#1a202c] border border-[#e2be40]">
          <Crown className="h-3 w-3" />
          مدير الإدارة
        </div>
        <span className="text-[13px] text-slate-700 dark:text-slate-300 font-medium">المستوى الأول</span>
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
          {data.username && (
            <span
              dir="ltr"
              className="inline-block max-w-full truncate text-[13px] font-mono text-[#2c5282] bg-[#ebf4ff] border border-[#bee3f8] rounded px-1.5 py-0.5 mt-0.5"
            >
              @{data.username}
            </span>
          )}
          <p className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5 truncate">
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
