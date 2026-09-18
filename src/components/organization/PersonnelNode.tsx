import React from 'react';
import { Handle, Position } from 'reactflow';
import PersonnelAvatar from '../hr/PersonnelAvatar';

interface PersonnelNodeProps {
  data: {
    _id: string;
    nom: string;
    prenom: string;
    poste: string;
    photo: string;
  };
}

const PersonnelNode: React.FC<PersonnelNodeProps> = ({ data }) => {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm px-3 py-2 min-w-[180px] hover:border-[#2c5282] hover:shadow-md transition-all duration-200 cursor-pointer select-none">
      <Handle type="target" position={Position.Top} className="!bg-[#e2e8f0]" />
      <div className="flex items-center gap-2">
        <PersonnelAvatar
          photo={data.photo}
          nom={data.nom}
          prenom={data.prenom}
          size="sm"
        />
        <div className="text-right min-w-0 flex-1">
          <p className="text-xs font-bold text-[#1a202c] truncate">
            {data.prenom} {data.nom}
          </p>
          {data.poste && (
            <p className="text-[10px] text-gray-500 truncate">{data.poste}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonnelNode;
