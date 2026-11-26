import React from 'react';
import { useTranslation } from 'react-i18next';
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
import { AlertCircle, Shield } from 'lucide-react';
import { Department } from '@/types';
import { useDirection } from '@/i18n/useDirection';
import { PersonnelFormErrors } from '../PersonnelForm';

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
  errors?: PersonnelFormErrors;
  setErrors?: React.Dispatch<React.SetStateAction<PersonnelFormErrors>>;
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
  errors,
  setErrors,
}) => {
  const { t } = useTranslation();
  const { dir } = useDirection();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3 mb-6 flex items-center gap-2">
        <Shield className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
        <span>{t('hr.form.admin.sectionTitle')}</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Poste actuel */}
        <div className="space-y-2">
          <Label htmlFor="posteActuel" className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {t('hr.form.admin.posteActuel.label')}
          </Label>
          <Input
            id="posteActuel"
            value={posteActuel}
            onChange={(e) => {
              setPosteActuel(e.target.value);
              setPoste(e.target.value);
            }}
            placeholder={t('hr.form.admin.posteActuel.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Département principal */}
        <div className="space-y-2">
          <Label htmlFor="activeDepartment" className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {t('hr.form.admin.department.label')}
          </Label>
          <Select
            value={activeDepartment}
            onValueChange={(val) => setActiveDepartment(val)}
            disabled={isLoadingDepartments}
          >
            <SelectTrigger id="activeDepartment" className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
              <SelectValue placeholder={t('hr.form.admin.department.placeholder')} />
            </SelectTrigger>
            <SelectContent dir={dir}>
              <SelectItem value="NONE" className="text-base py-2 font-medium">{t('hr.form.admin.department.none')}</SelectItem>
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
          <Label htmlFor="dateEmbauche" className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {t('hr.form.admin.dateEmbauche.label')}
          </Label>
          <Input
            id="dateEmbauche"
            type="date"
            value={dateEmbauche}
            onChange={(e) => {
              setDateEmbauche(e.target.value);
              if (errors?.dateEmbauche && setErrors) {
                setErrors((prev) => ({ ...prev, dateEmbauche: undefined }));
              }
            }}
            className={`h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] ${
              errors?.dateEmbauche ? 'border-red-500' : ''
            }`}
          />
          {errors?.dateEmbauche && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.dateEmbauche}</span>
            </p>
          )}
        </div>

        {/* Numéro d'unité */}
        <div className="space-y-2">
          <Label htmlFor="numeroUnite" className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {t('hr.form.admin.numeroUnite.label')}
          </Label>
          <Input
            id="numeroUnite"
            value={numeroUnite}
            onChange={(e) => setNumeroUnite(e.target.value)}
            placeholder={t('hr.form.admin.numeroUnite.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Numéro d'armée */}
        <div className="space-y-2">
          <Label htmlFor="numeroArmee" className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {t('hr.form.admin.numeroArmee.label')}
          </Label>
          <Input
            id="numeroArmee"
            value={numeroArmee}
            onChange={(e) => setNumeroArmee(e.target.value)}
            placeholder={t('hr.form.admin.numeroArmee.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Date d'engagement */}
        <div className="space-y-2">
          <Label htmlFor="dateEngagement" className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {t('hr.form.admin.dateEngagement.label')}
          </Label>
          <Input
            id="dateEngagement"
            type="date"
            value={dateEngagement}
            onChange={(e) => setDateEngagement(e.target.value)}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Type d'engagement */}
        <div className="space-y-2">
          <Label htmlFor="typeEngagement" className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {t('hr.form.admin.typeEngagement.label')}
          </Label>
          <Input
            id="typeEngagement"
            value={typeEngagement}
            onChange={(e) => setTypeEngagement(e.target.value)}
            placeholder={t('hr.form.admin.typeEngagement.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Origine d'engagement */}
        <div className="space-y-2">
          <Label htmlFor="origineEngagement" className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {t('hr.form.admin.origineEngagement.label')}
          </Label>
          <Input
            id="origineEngagement"
            value={origineEngagement}
            onChange={(e) => setOrigineEngagement(e.target.value)}
            placeholder={t('hr.form.admin.origineEngagement.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Niveau d'étude */}
        <div className="space-y-2">
          <Label htmlFor="niveauEtude" className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {t('hr.form.admin.niveauEtude.label')}
          </Label>
          <Input
            id="niveauEtude"
            value={niveauEtude}
            onChange={(e) => setNiveauEtude(e.target.value)}
            placeholder={t('hr.form.admin.niveauEtude.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Diplôme de base */}
        <div className="space-y-2">
          <Label htmlFor="diplomeBase" className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {t('hr.form.admin.diplomeBase.label')}
          </Label>
          <Input
            id="diplomeBase"
            value={diplomeBase}
            onChange={(e) => setDiplomeBase(e.target.value)}
            placeholder={t('hr.form.admin.diplomeBase.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Spécialité */}
        <div className="space-y-2">
          <Label htmlFor="specialite" className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {t('hr.form.admin.specialite.label')}
          </Label>
          <Input
            id="specialite"
            value={specialite}
            onChange={(e) => setSpecialite(e.target.value)}
            placeholder={t('hr.form.admin.specialite.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Arme */}
        <div className="space-y-2">
          <Label htmlFor="arme" className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {t('hr.form.admin.arme.label')}
          </Label>
          <Input
            id="arme"
            value={arme}
            onChange={(e) => setArme(e.target.value)}
            placeholder={t('hr.form.admin.arme.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2 mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800">
        <Label htmlFor="notes" className="text-base font-semibold text-slate-700 dark:text-slate-200">
          {t('hr.form.admin.notes.label')}
        </Label>
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('hr.form.admin.notes.placeholder')}
          className="text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
        />
      </div>
    </div>
  );
};

export default Step3Admin;
