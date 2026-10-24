import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield } from 'lucide-react';
import { Department } from '@/types';

export interface Step3AdminProps {
  posteActuel: string;
  setPosteActuel: (val: string) => void;
  poste: string;
  setPoste: (val: string) => void;
  activeDepartment: string;
  setActiveDepartment: (val: string) => void;
  departments: Department[];
  isLoadingDepartments: boolean;
  dateEmbauche: string;
  setDateEmbauche: (val: string) => void;
  numeroUnite: string;
  setNumeroUnite: (val: string) => void;
  numeroArmee: string;
  setNumeroArmee: (val: string) => void;
  dateEngagement: string;
  setDateEngagement: (val: string) => void;
  typeEngagement: string;
  setTypeEngagement: (val: string) => void;
  origineEngagement: string;
  setOrigineEngagement: (val: string) => void;
  niveauEtude: string;
  setNiveauEtude: (val: string) => void;
  diplomeBase: string;
  setDiplomeBase: (val: string) => void;
  specialite: string;
  setSpecialite: (val: string) => void;
  arme: string;
  setArme: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
}

export const Step3Admin: React.FC<Step3AdminProps> = ({
  posteActuel,
  setPosteActuel,
  setPoste,
  activeDepartment,
  setActiveDepartment,
  departments,
  isLoadingDepartments,
  dateEmbauche,
  setDateEmbauche,
  numeroUnite,
  setNumeroUnite,
  numeroArmee,
  setNumeroArmee,
  dateEngagement,
  setDateEngagement,
  typeEngagement,
  setTypeEngagement,
  origineEngagement,
  setOrigineEngagement,
  niveauEtude,
  setNiveauEtude,
  diplomeBase,
  setDiplomeBase,
  specialite,
  setSpecialite,
  arme,
  setArme,
  notes,
  setNotes,
}) => {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#1a202c] border-b border-[#e2e8f0] pb-3 mb-6 flex items-center gap-2">
        <Shield className="w-5 h-5 text-[#2c5282]" />
        <span>المعلومات المهنية والإدارية (Situation administrative)</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Poste actuel (الخطة) */}
        <div className="space-y-2">
          <Label htmlFor="posteActuel" className="text-base font-semibold text-gray-700">
            الخطة / المنصب الحالي (Poste actuel)
          </Label>
          <Input
            id="posteActuel"
            value={posteActuel}
            onChange={(e) => {
              setPosteActuel(e.target.value);
              setPoste(e.target.value);
            }}
            placeholder="مثال: رئيس مصلحة / متصرف..."
            className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Département principal */}
        <div className="space-y-2">
          <Label htmlFor="activeDepartment" className="text-base font-semibold text-gray-700">
            القسم الرئيسي (Département)
          </Label>
          <Select
            value={activeDepartment}
            onValueChange={(val) => setActiveDepartment(val)}
            disabled={isLoadingDepartments}
          >
            <SelectTrigger id="activeDepartment" className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
              <SelectValue placeholder="اختر القسم" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="NONE" className="text-base py-2 font-medium">غير محدد</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept._id} value={dept._id} className="text-base py-2">
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date d'embauche */}
        <div className="space-y-2">
          <Label htmlFor="dateEmbauche" className="text-base font-semibold text-gray-700">
            تاريخ التعيين أو الالتحاق (Date d'embauche)
          </Label>
          <Input
            id="dateEmbauche"
            type="date"
            value={dateEmbauche}
            onChange={(e) => setDateEmbauche(e.target.value)}
            className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Numéro d'unité */}
        <div className="space-y-2">
          <Label htmlFor="numeroUnite" className="text-base font-semibold text-gray-700">
            رقم الوحدة (Numéro d'unité)
          </Label>
          <Input
            id="numeroUnite"
            value={numeroUnite}
            onChange={(e) => setNumeroUnite(e.target.value)}
            placeholder="مثال: 104"
            className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Numéro d'armée */}
        <div className="space-y-2">
          <Label htmlFor="numeroArmee" className="text-base font-semibold text-gray-700">
            الرقم العسكري (Numéro d'armée)
          </Label>
          <Input
            id="numeroArmee"
            value={numeroArmee}
            onChange={(e) => setNumeroArmee(e.target.value)}
            placeholder="مثال: 12345/A"
            className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Date d'engagement */}
        <div className="space-y-2">
          <Label htmlFor="dateEngagement" className="text-base font-semibold text-gray-700">
            تاريخ الانخراط (Date d'engagement)
          </Label>
          <Input
            id="dateEngagement"
            type="date"
            value={dateEngagement}
            onChange={(e) => setDateEngagement(e.target.value)}
            className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Type d'engagement */}
        <div className="space-y-2">
          <Label htmlFor="typeEngagement" className="text-base font-semibold text-gray-700">
            نوع الانخراط (Type d'engagement)
          </Label>
          <Input
            id="typeEngagement"
            value={typeEngagement}
            onChange={(e) => setTypeEngagement(e.target.value)}
            placeholder="مثال: مباشر / متعاقد / تطوع..."
            className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Origine d'engagement */}
        <div className="space-y-2">
          <Label htmlFor="origineEngagement" className="text-base font-semibold text-gray-700">
            أصل الانخراط (Origine d'engagement)
          </Label>
          <Input
            id="origineEngagement"
            value={origineEngagement}
            onChange={(e) => setOrigineEngagement(e.target.value)}
            placeholder="مثال: الأكاديمية العسكرية / مدرسة الرقباء..."
            className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Niveau d'étude */}
        <div className="space-y-2">
          <Label htmlFor="niveauEtude" className="text-base font-semibold text-gray-700">
            المستوى الدراسي (Niveau d'étude)
          </Label>
          <Input
            id="niveauEtude"
            value={niveauEtude}
            onChange={(e) => setNiveauEtude(e.target.value)}
            placeholder="مثال: تعليم عالي / باكالوريا..."
            className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Diplôme de base (المؤهل) */}
        <div className="space-y-2">
          <Label htmlFor="diplomeBase" className="text-base font-semibold text-gray-700">
            المؤهل / الشهادة الأساسية (المؤهل)
          </Label>
          <Input
            id="diplomeBase"
            value={diplomeBase}
            onChange={(e) => setDiplomeBase(e.target.value)}
            placeholder="مثال: إجازة تطبيقية / ماجستير / مؤهل ضابط..."
            className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Spécialité (الإختصاص) */}
        <div className="space-y-2">
          <Label htmlFor="specialite" className="text-base font-semibold text-gray-700">
            الإختصاص (Spécialité)
          </Label>
          <Input
            id="specialite"
            value={specialite}
            onChange={(e) => setSpecialite(e.target.value)}
            placeholder="مثال: إعلامية / اتصالات / لوجستيك..."
            className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Arme (السلاح) */}
        <div className="space-y-2">
          <Label htmlFor="arme" className="text-base font-semibold text-gray-700">
            السلاح (Arme)
          </Label>
          <Input
            id="arme"
            value={arme}
            onChange={(e) => setArme(e.target.value)}
            placeholder="مثال: الإشارة / المشاة / النقل..."
            className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2 mt-6 pt-6 border-t border-[#e2e8f0]">
        <Label htmlFor="notes" className="text-base font-semibold text-gray-700">
          ملاحظات إضافية (Notes)
        </Label>
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ملاحظات أو تعليقات تخص ملف الموظف..."
          className="text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
        />
      </div>
    </div>
  );
};

export default Step3Admin;
