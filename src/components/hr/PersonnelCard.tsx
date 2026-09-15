import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Personnel } from '@/types/hr';
import { Department } from '@/types';
import PersonnelStatusBadge from './PersonnelStatusBadge';
import { User, Phone, Mail, Building2, Briefcase, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PersonnelCardProps {
  personnel: Personnel;
  onView?: () => void;
  className?: string;
}

export const PersonnelCard: React.FC<PersonnelCardProps> = ({
  personnel,
  onView,
  className = ''
}) => {
  const navigate = useNavigate();

  const handleView = () => {
    if (onView) {
      onView();
    } else {
      navigate(`/dashboard/hr/personnel/${personnel._id}`);
    }
  };

  const departmentName = personnel.activeDepartment
    ? typeof personnel.activeDepartment === 'object'
      ? (personnel.activeDepartment as Department).name
      : 'قسم محدد'
    : 'غير محدد';

  return (
    <div
      className={`bg-white border border-[#e2e8f0] rounded p-5 shadow-sm hover:border-[#2c5282] transition-colors duration-200 text-right ${className}`}
      dir="rtl"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded bg-[#f7fafc] border border-[#e2e8f0] flex items-center justify-center text-[#2c5282] shrink-0 font-bold text-lg">
            {personnel.prenom ? personnel.prenom.charAt(0) : <User className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1a202c]">
              {personnel.nom} {personnel.prenom}
            </h3>
            {personnel.cin && (
              <p className="text-sm text-gray-500 font-mono">
                CIN: {personnel.cin}
              </p>
            )}
          </div>
        </div>
        <PersonnelStatusBadge statut={personnel.statut} />
      </div>

      <div className="space-y-2 text-sm text-gray-600 border-t border-[#f1f5f9] pt-3 mb-4">
        {personnel.poste && (
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-medium text-gray-800">{personnel.poste}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
          <span>{departmentName}</span>
        </div>

        {personnel.telephone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            <span dir="ltr">{personnel.telephone}</span>
          </div>
        )}

        {personnel.emailPersonnel && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            <span dir="ltr" className="truncate">{personnel.emailPersonnel}</span>
          </div>
        )}
      </div>

      <div className="pt-2 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleView}
          className="h-10 px-4 text-sm font-medium text-[#2c5282] border-[#2c5282] hover:bg-[#2c5282] hover:text-white rounded flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          <span>عرض التفاصيل</span>
        </Button>
      </div>
    </div>
  );
};

export default PersonnelCard;
