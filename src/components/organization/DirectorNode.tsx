import React from 'react';
import { Handle, Position } from 'reactflow';
import { Crown, Briefcase } from 'lucide-react';
import PersonnelAvatar from '../hr/PersonnelAvatar';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';

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
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isFr = language === 'fr';
  const isClickable = !!data._id && !!data.onDirectorClick;

  return (
    <div
      onClick={() => {
        if (isClickable && data._id && data.onDirectorClick) {
          data.onDirectorClick(data._id);
        }
      }}
      className={`bg-white dark:bg-slate-900 border-2 border-[#2c5282] dark:border-blue-500 rounded-lg shadow-sm p-4 w-[280px] text-start select-none transition-all duration-200 ${
        isClickable ? 'cursor-pointer hover:shadow-md hover:border-[#1e3a5f] dark:hover:border-blue-400' : ''
      }`}
      dir={dir}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#2c5282] !w-2.5 !h-2.5" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-[#FFD758] text-[#1a202c]">
          <Crown className="h-3.5 w-3.5" />
          <span>{isFr ? 'Direction générale' : 'مدير الإدارة'}</span>
        </div>
        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          {isFr ? 'Niveau 1' : 'المستوى الأول'}
        </span>
      </div>

      {/* Director Identity */}
      <div className="flex items-center gap-3">
        <PersonnelAvatar
          photo={data.photo}
          nom={data.nom}
          prenom={data.prenom}
          size="md"
          className="border border-[#2c5282]/30"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {data.prenom} {data.nom}
          </h3>
          {data.username && (
            <span
              dir="ltr"
              className="inline-block max-w-full truncate text-xs font-mono text-[#2c5282] dark:text-blue-300 mt-0.5"
            >
              @{data.username}
            </span>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 mt-0.5 truncate">
            <Briefcase className="w-3 h-3 text-[#2c5282] dark:text-blue-400 shrink-0" />
            <span className="truncate">
              {data.poste || (isFr ? 'Directeur' : 'مدير الإدارة')}
            </span>
          </p>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[#2c5282] !w-2.5 !h-2.5" />
    </div>
  );
};

export default DirectorNode;
