import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Heart } from 'lucide-react';

export interface Step2FamilyProps {
  etatCivil: string;
  setEtatCivil: (val: string) => void;
  nomConjoint: string;
  setNomConjoint: (val: string) => void;
  dateMariage: string;
  setDateMariage: (val: string) => void;
  nombreEnfants: string | number;
  setNombreEnfants: (val: string | number) => void;
}

export const Step2Family: React.FC<Step2FamilyProps> = ({
  etatCivil,
  setEtatCivil,
  nomConjoint,
  setNomConjoint,
  dateMariage,
  setDateMariage,
  nombreEnfants,
  setNombreEnfants,
}) => {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#1a202c] border-b border-[#e2e8f0] pb-3 mb-6 flex items-center gap-2">
        <Heart className="w-5 h-5 text-rose-600" />
        <span>الحالة العائلية (Situation familiale)</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* État civil */}
        <div className="space-y-2">
          <Label htmlFor="etatCivil" className="text-base font-semibold text-gray-700">
            الحالة المدنية (État civil)
          </Label>
          <Select value={etatCivil} onValueChange={(val) => setEtatCivil(val)}>
            <SelectTrigger id="etatCivil" className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
              <SelectValue placeholder="اختر الحالة المدنية" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="NONE" className="text-base py-2 font-medium">غير محدد</SelectItem>
              <SelectItem value="celibataire" className="text-base py-2">أعزب / عزباء</SelectItem>
              <SelectItem value="marie" className="text-base py-2 font-semibold text-[#2c5282]">متزوج / متزوجة</SelectItem>
              <SelectItem value="divorce" className="text-base py-2">مطلق / مطلقة</SelectItem>
              <SelectItem value="veuf" className="text-base py-2">أرمل / أرملة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Nom du conjoint */}
        <div className="space-y-2">
          <Label htmlFor="nomConjoint" className="text-base font-semibold text-gray-700">
            اسم القرين (Nom du conjoint)
          </Label>
          <Input
            id="nomConjoint"
            value={nomConjoint}
            onChange={(e) => setNomConjoint(e.target.value)}
            placeholder="اسم ولقب الزوج أو الزوجة..."
            className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Date de mariage */}
        <div className="space-y-2">
          <Label htmlFor="dateMariage" className="text-base font-semibold text-gray-700">
            تاريخ الزواج (Date de mariage)
          </Label>
          <Input
            id="dateMariage"
            type="date"
            value={dateMariage}
            onChange={(e) => setDateMariage(e.target.value)}
            className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Nombre d'enfants */}
        <div className="space-y-2">
          <Label htmlFor="nombreEnfants" className="text-base font-semibold text-gray-700">
            عدد الأبناء (Nombre d'enfants)
          </Label>
          <Input
            id="nombreEnfants"
            type="number"
            min="0"
            value={nombreEnfants}
            onChange={(e) => setNombreEnfants(e.target.value)}
            placeholder="0"
            className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>
      </div>
    </div>
  );
};

export default Step2Family;
