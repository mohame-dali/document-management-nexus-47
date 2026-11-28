import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  Save,
  Sliders,
  Trash2,
  Upload,
  Loader2,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import {
  setBureauDepartments,
  setRhDepartment,
  updateOrganizationSettings,
} from '@/services/organizationSettingsService';
import { getDepartments } from '@/services/departmentService';
import { Department } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NONE_DEPT_VALUE = '__none__';

export const OrganizationIdentityPanel: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isRTL = language !== 'fr';

  const { isSetupComplete, settings: orgSettings, rhDeptId, boDeptId, dirDeptId } = useSetupStatus();

  const [nomAdministration, setNomAdministration] = useState('');
  const [logoAdministration, setLogoAdministration] = useState('');
  const [selectedRhId, setSelectedRhId] = useState<string>(NONE_DEPT_VALUE);
  const [selectedBoId, setSelectedBoId] = useState<string>(NONE_DEPT_VALUE);
  const [selectedDirId, setSelectedDirId] = useState<string>(NONE_DEPT_VALUE);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!orgSettings) return;
    setNomAdministration(orgSettings.nomAdministration || '');
    setLogoAdministration(orgSettings.logoAdministration || '');
    setSelectedRhId(rhDeptId || NONE_DEPT_VALUE);
    setSelectedBoId(boDeptId || NONE_DEPT_VALUE);
    setSelectedDirId(dirDeptId || NONE_DEPT_VALUE);
  }, [orgSettings, rhDeptId, boDeptId, dirDeptId]);

  const { data: departments = [], isLoading: deptsLoading } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: getDepartments,
    staleTime: 60 * 1000,
  });

  const activeDepartments = useMemo(
    () => departments.filter((d) => d.isActive !== false),
    [departments]
  );

  const resolvedLogoPreview = useMemo(() => {
    const raw = logoAdministration.trim();
    if (!raw) return null;
    if (raw.startsWith('http') || raw.startsWith('data:')) return raw;
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const baseOrigin = apiUrl.replace(/\/api\/?$/, '');
    const cleanPath = raw.startsWith('/') ? raw : `/${raw}`;
    return `${baseOrigin}${cleanPath}`;
  }, [logoAdministration]);

  const invalidateOrgQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] }),
      queryClient.invalidateQueries({ queryKey: ['organizationSettings'] }),
    ]);
  };

  const saveIdentityMutation = useMutation({
    mutationFn: () =>
      updateOrganizationSettings({
        nomAdministration: nomAdministration.trim(),
        logoAdministration: logoAdministration.trim(),
      }),
    onSuccess: async () => {
      await invalidateOrgQueries();
      toast.success(
        isRTL
          ? 'تم حفظ هوية المؤسسة والشعار بنجاح'
          : "Identité et logo de l'institution enregistrés"
      );
    },
    onError: () => {
      toast.error(
        isRTL
          ? 'تعذر حفظ هوية المؤسسة'
          : "Impossible d'enregistrer l'identité de l'institution"
      );
    },
  });

  const saveDepartmentsMutation = useMutation({
    mutationFn: async () => {
      await setRhDepartment(selectedRhId === NONE_DEPT_VALUE ? null : selectedRhId);
      await setBureauDepartments({
        bureauOrdreDepartmentId: selectedBoId === NONE_DEPT_VALUE ? null : selectedBoId,
        bureauDirecteurDepartmentId: selectedDirId === NONE_DEPT_VALUE ? null : selectedDirId,
      });
    },
    onSuccess: async () => {
      await invalidateOrgQueries();
      toast.success(
        isRTL
          ? 'تم تحديث تعيين الأقسام السيادية بنجاح'
          : 'Départements fonctionnels mis à jour avec succès'
      );
    },
    onError: () => {
      toast.error(
        isRTL
          ? 'حدث خطأ أثناء تحديث الأقسام السيادية'
          : 'Erreur lors de la mise à jour des départements'
      );
    },
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(
        isRTL
          ? 'حجم الشعار يجب ألا يتجاوز 2 ميغابايت'
          : 'La taille du logo ne doit pas dépasser 2 Mo'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoAdministration(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleIdentitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomAdministration.trim()) {
      toast.error(
        isRTL ? 'يرجى إدخال اسم المؤسسة أو الإدارة' : "Veuillez saisir le nom de l'institution"
      );
      return;
    }
    saveIdentityMutation.mutate();
  };

  return (
    <div dir={dir} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {isRTL ? 'هوية المؤسسة والأقسام السيادية' : "Identité de l'institution"}
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                isSetupComplete
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {isSetupComplete ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              <span>
                {isSetupComplete
                  ? isRTL
                    ? 'التكوين مكتمل'
                    : 'Configuration complète'
                  : isRTL
                    ? 'بحاجة إلى استكمال التهيئة'
                    : 'Configuration incomplète'}
              </span>
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {isRTL
              ? 'تحرير الاسم الرسمي للمؤسسة وشعارها وتعيين وحدات الموارد البشرية ومكتب الضبط والإدارة العامة.'
              : "Modifiez le nom officiel, le logo et les départements souverains (RH, Bureau d'Ordre, Direction)."}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/setup')}
          className="h-10 px-4 text-sm font-medium border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg gap-2 whitespace-nowrap shrink-0 self-start sm:self-center"
        >
          <Sliders className="w-4 h-4 text-[#2c5282] dark:text-blue-400" />
          <span>{isRTL ? 'معالج الإعداد (4 خطوات)' : 'Assistant de configuration'}</span>
        </Button>
      </div>

      {/* Section 1: Immediately Editable Identity & Logo */}
      <form onSubmit={handleIdentitySubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Logo Upload Preview */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isRTL ? 'شعار المؤسسة' : "Logo de l'institution"}
              </Label>
              {logoAdministration && (
                <button
                  type="button"
                  onClick={() => setLogoAdministration('')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'إزالة' : 'Retirer'}</span>
                </button>
              )}
            </div>

            <div className="h-28 w-full rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden p-3">
              {resolvedLogoPreview ? (
                <img
                  src={resolvedLogoPreview}
                  alt={nomAdministration || 'Logo'}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <ImageIcon className="w-7 h-7" />
                  <span className="text-xs">
                    {isRTL ? 'لا يوجد شعار مرفوع' : 'Aucun logo défini'}
                  </span>
                </div>
              )}
            </div>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
              className="w-full h-10 text-sm font-semibold border-slate-300 dark:border-slate-700 text-[#2c5282] dark:text-blue-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{isRTL ? 'رفع صورة الشعار' : 'Téléverser un logo'}</span>
            </Button>
          </div>

          {/* Organization Name + Logo URL */}
          <div className="lg:col-span-2 space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="org-identity-name"
                className="text-sm font-bold text-slate-900 dark:text-slate-100"
              >
                {isRTL ? 'الاسم الرسمي للإدارة أو المؤسسة' : "Nom officiel de l'institution"}{' '}
                <span className="text-red-600">*</span>
              </Label>
              <Input
                id="org-identity-name"
                value={nomAdministration}
                onChange={(e) => setNomAdministration(e.target.value)}
                placeholder={
                  isRTL
                    ? 'مثال: الإدارة العامة للوثائق والمراسلات'
                    : "Ex. : Direction Générale de l'Administration"
                }
                className="h-11 text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg"
                required
              />
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {isRTL
                  ? 'يظهر هذا الاسم في الشريط العلوي، الهيكل التنظيمي، والتقارير المطبوعة.'
                  : "Ce nom apparaît dans l'en-tête, l'organigramme et les rapports imprimés."}
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="org-identity-logo-url"
                className="text-sm font-bold text-slate-900 dark:text-slate-100"
              >
                {isRTL ? 'مسار أو رابط الشعار (اختياري)' : 'Chemin ou URL du logo (optionnel)'}
              </Label>
              <Input
                id="org-identity-logo-url"
                dir="ltr"
                value={logoAdministration.startsWith('data:') ? '' : logoAdministration}
                onChange={(e) => setLogoAdministration(e.target.value)}
                placeholder={
                  logoAdministration.startsWith('data:')
                    ? isRTL
                      ? 'تم تحميل صورة مدمجة — يمكنك رفع صورة أخرى أو مسحها'
                      : 'Image intégrée chargée — cliquez sur Retirer pour changer'
                    : '/uploads/logo.png'
                }
                className="h-11 text-sm font-mono border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg"
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={saveIdentityMutation.isPending}
                className="h-10 px-6 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg gap-2 whitespace-nowrap"
              >
                {saveIdentityMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {saveIdentityMutation.isPending
                    ? isRTL
                      ? 'جاري الحفظ...'
                      : 'Enregistrement...'
                    : isRTL
                      ? 'حفظ الهوية والشعار'
                      : "Enregistrer l'identité"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Section 2: Sovereign / Core Departments */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#2c5282] dark:text-blue-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {isRTL ? 'الأقسام الوظيفية الرئيسية' : 'Départements fonctionnels principaux'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* RH Department */}
          <div className="space-y-2">
            <Label htmlFor="org-rh-dept" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isRTL ? 'قسم الموارد البشرية (RH)' : 'Ressources Humaines (RH)'}
            </Label>
            <Select
              value={selectedRhId}
              onValueChange={setSelectedRhId}
              disabled={deptsLoading}
            >
              <SelectTrigger
                id="org-rh-dept"
                className="h-10 text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg"
              >
                <SelectValue placeholder={isRTL ? 'اختر القسم...' : 'Sélectionner...'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_DEPT_VALUE}>
                  {isRTL ? 'غير معيّن' : 'Non assigné'}
                </SelectItem>
                {activeDepartments.map((dept) => (
                  <SelectItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bureau d'Ordre */}
          <div className="space-y-2">
            <Label htmlFor="org-bo-dept" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isRTL ? 'مكتب الضبط (BO)' : "Bureau d'Ordre (BO)"}
            </Label>
            <Select
              value={selectedBoId}
              onValueChange={setSelectedBoId}
              disabled={deptsLoading}
            >
              <SelectTrigger
                id="org-bo-dept"
                className="h-10 text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg"
              >
                <SelectValue placeholder={isRTL ? 'اختر القسم...' : 'Sélectionner...'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_DEPT_VALUE}>
                  {isRTL ? 'غير معيّن' : 'Non assigné'}
                </SelectItem>
                {activeDepartments.map((dept) => (
                  <SelectItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bureau Directeur */}
          <div className="space-y-2">
            <Label htmlFor="org-dir-dept" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isRTL ? 'الإدارة العامة (Direction)' : 'Direction Générale'}
            </Label>
            <Select
              value={selectedDirId}
              onValueChange={setSelectedDirId}
              disabled={deptsLoading}
            >
              <SelectTrigger
                id="org-dir-dept"
                className="h-10 text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg"
              >
                <SelectValue placeholder={isRTL ? 'اختر القسم...' : 'Sélectionner...'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_DEPT_VALUE}>
                  {isRTL ? 'غير معيّن' : 'Non assigné'}
                </SelectItem>
                {activeDepartments.map((dept) => (
                  <SelectItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => saveDepartmentsMutation.mutate()}
            disabled={saveDepartmentsMutation.isPending || deptsLoading}
            className="h-10 px-5 text-sm font-semibold border-[#2c5282] dark:border-blue-500 text-[#2c5282] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg gap-2 whitespace-nowrap"
          >
            {saveDepartmentsMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>
              {saveDepartmentsMutation.isPending
                ? isRTL
                  ? 'جاري الحفظ...'
                  : 'Enregistrement...'
                : isRTL
                  ? 'حفظ تعيين الأقسام'
                  : 'Enregistrer les départements'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationIdentityPanel;
