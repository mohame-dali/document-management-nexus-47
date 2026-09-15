import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDepartments } from '@/services/departmentService';
import { Department } from '@/types';
import { Personnel, PersonnelSexe } from '@/types/hr';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, X, AlertCircle } from 'lucide-react';

interface PersonnelFormProps {
  initialData?: Partial<Personnel>;
  onSubmit: (data: Partial<Personnel>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const PersonnelForm: React.FC<PersonnelFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [nom, setNom] = useState(initialData?.nom || '');
  const [prenom, setPrenom] = useState(initialData?.prenom || '');
  const [dateNaissance, setDateNaissance] = useState(
    initialData?.dateNaissance ? new Date(initialData.dateNaissance).toISOString().split('T')[0] : ''
  );
  const [lieuNaissance, setLieuNaissance] = useState(initialData?.lieuNaissance || '');
  const [sexe, setSexe] = useState<PersonnelSexe | 'NONE'>(initialData?.sexe || 'NONE');
  const [cin, setCin] = useState(initialData?.cin || '');
  const [adresse, setAdresse] = useState(initialData?.adresse || '');
  const [telephone, setTelephone] = useState(initialData?.telephone || '');
  const [emailPersonnel, setEmailPersonnel] = useState(initialData?.emailPersonnel || '');
  const [poste, setPoste] = useState(initialData?.poste || '');
  const [activeDepartment, setActiveDepartment] = useState<string>(
    initialData?.activeDepartment
      ? typeof initialData.activeDepartment === 'object'
        ? (initialData.activeDepartment as Department)._id
        : initialData.activeDepartment
      : 'NONE'
  );
  const [dateEmbauche, setDateEmbauche] = useState(
    initialData?.dateEmbauche ? new Date(initialData.dateEmbauche).toISOString().split('T')[0] : ''
  );
  const [notes, setNotes] = useState(initialData?.notes || '');

  const [errors, setErrors] = useState<{ nom?: string; prenom?: string }>({});

  useEffect(() => {
    if (initialData) {
      setNom(initialData.nom || '');
      setPrenom(initialData.prenom || '');
      setDateNaissance(
        initialData.dateNaissance
          ? new Date(initialData.dateNaissance).toISOString().split('T')[0]
          : ''
      );
      setLieuNaissance(initialData.lieuNaissance || '');
      setSexe(initialData.sexe || 'NONE');
      setCin(initialData.cin || '');
      setAdresse(initialData.adresse || '');
      setTelephone(initialData.telephone || '');
      setEmailPersonnel(initialData.emailPersonnel || '');
      setPoste(initialData.poste || '');
      setActiveDepartment(
        initialData.activeDepartment
          ? typeof initialData.activeDepartment === 'object'
            ? (initialData.activeDepartment as Department)._id
            : initialData.activeDepartment
          : 'NONE'
      );
      setDateEmbauche(
        initialData.dateEmbauche
          ? new Date(initialData.dateEmbauche).toISOString().split('T')[0]
          : ''
      );
      setNotes(initialData.notes || '');
    }
  }, [initialData]);

  // Récupération des départements pour la sélection
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

  const validate = () => {
    const newErrors: { nom?: string; prenom?: string } = {};
    if (!nom.trim()) {
      newErrors.nom = 'اللقب إجباري';
    }
    if (!prenom.trim()) {
      newErrors.prenom = 'الاسم إجباري';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: Partial<Personnel> = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      dateNaissance: dateNaissance ? new Date(dateNaissance).toISOString() : null,
      lieuNaissance: lieuNaissance.trim(),
      sexe: sexe !== 'NONE' ? (sexe as PersonnelSexe) : undefined,
      cin: cin.trim(),
      adresse: adresse.trim(),
      telephone: telephone.trim(),
      emailPersonnel: emailPersonnel.trim().toLowerCase(),
      poste: poste.trim(),
      activeDepartment: activeDepartment !== 'NONE' ? activeDepartment : null,
      dateEmbauche: dateEmbauche ? new Date(dateEmbauche).toISOString() : null,
      notes: notes.trim(),
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-right" dir="rtl">
      {/* 1. Informations Personnelles */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#1a202c] border-b border-[#e2e8f0] pb-3 mb-6">
          المعلومات الشخصية
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="nom" className="text-base font-semibold text-gray-700 flex items-center gap-1">
              <span>اللقب (Nom)</span>
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => {
                setNom(e.target.value);
                if (errors.nom) setErrors((prev) => ({ ...prev, nom: undefined }));
              }}
              placeholder="مثال: بنعلي"
              className={`h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] ${
                errors.nom ? 'border-red-500' : ''
              }`}
            />
            {errors.nom && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.nom}</span>
              </p>
            )}
          </div>

          {/* Prénom */}
          <div className="space-y-2">
            <Label htmlFor="prenom" className="text-base font-semibold text-gray-700 flex items-center gap-1">
              <span>الاسم (Prénom)</span>
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="prenom"
              value={prenom}
              onChange={(e) => {
                setPrenom(e.target.value);
                if (errors.prenom) setErrors((prev) => ({ ...prev, prenom: undefined }));
              }}
              placeholder="مثال: محمد"
              className={`h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] ${
                errors.prenom ? 'border-red-500' : ''
              }`}
            />
            {errors.prenom && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.prenom}</span>
              </p>
            )}
          </div>

          {/* CIN */}
          <div className="space-y-2">
            <Label htmlFor="cin" className="text-base font-semibold text-gray-700">
              رقم البطاقة الوطنية (CIN)
            </Label>
            <Input
              id="cin"
              value={cin}
              onChange={(e) => setCin(e.target.value)}
              placeholder="مثال: AB123456"
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Sexe */}
          <div className="space-y-2">
            <Label htmlFor="sexe" className="text-base font-semibold text-gray-700">
              الجنس (Sexe)
            </Label>
            <Select value={sexe} onValueChange={(val) => setSexe(val as PersonnelSexe | 'NONE')}>
              <SelectTrigger id="sexe" className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
                <SelectValue placeholder="اختر الجنس" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="NONE" className="text-base py-2 font-medium">غير محدد</SelectItem>
                <SelectItem value="Homme" className="text-base py-2">ذكر (Homme)</SelectItem>
                <SelectItem value="Femme" className="text-base py-2">أنثى (Femme)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date de naissance */}
          <div className="space-y-2">
            <Label htmlFor="dateNaissance" className="text-base font-semibold text-gray-700">
              تاريخ الازدياد
            </Label>
            <Input
              id="dateNaissance"
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Lieu de naissance */}
          <div className="space-y-2">
            <Label htmlFor="lieuNaissance" className="text-base font-semibold text-gray-700">
              مكان الازدياد
            </Label>
            <Input
              id="lieuNaissance"
              value={lieuNaissance}
              onChange={(e) => setLieuNaissance(e.target.value)}
              placeholder="مثال: الرباط"
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>
        </div>

        {/* Coordonnées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="telephone" className="text-base font-semibold text-gray-700">
              الهاتف
            </Label>
            <Input
              id="telephone"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="مثال: 0612345678"
              dir="ltr"
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailPersonnel" className="text-base font-semibold text-gray-700">
              البريد الإلكتروني الشخصي
            </Label>
            <Input
              id="emailPersonnel"
              type="email"
              value={emailPersonnel}
              onChange={(e) => setEmailPersonnel(e.target.value)}
              placeholder="exemple@domaine.com"
              dir="ltr"
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] text-right"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="adresse" className="text-base font-semibold text-gray-700">
              العنوان الشخصي
            </Label>
            <Input
              id="adresse"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              placeholder="العنوان الكامل للموظف..."
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>
        </div>
      </div>

      {/* 2. Informations Professionnelles */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#1a202c] border-b border-[#e2e8f0] pb-3 mb-6">
          المعلومات المهنية والإدارية
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Poste */}
          <div className="space-y-2">
            <Label htmlFor="poste" className="text-base font-semibold text-gray-700">
              الوظيفة / المنصب (Poste)
            </Label>
            <Input
              id="poste"
              value={poste}
              onChange={(e) => setPoste(e.target.value)}
              placeholder="مثال: مهندس دولة / متصرف..."
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
        </div>

        {/* Notes */}
        <div className="space-y-2 mt-6">
          <Label htmlFor="notes" className="text-base font-semibold text-gray-700">
            ملاحظات إضافية (Notes)
          </Label>
          <Textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات أو تعليقات تخص ملف الموظف..."
            className="text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>
      </div>

      {/* 3. Boutons d'action */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-[#e2e8f0]">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="h-11 px-6 text-base font-medium text-gray-700 border-gray-300 hover:bg-gray-100 rounded flex items-center gap-2"
        >
          <X className="w-5 h-5" />
          <span>إلغاء</span>
        </Button>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 px-8 text-base font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          <span>{isLoading ? 'جاري الحفظ...' : 'حفظ'}</span>
        </Button>
      </div>
    </form>
  );
};

export default PersonnelForm;
