import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Layers, 
  Sliders, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  AlertCircle,
  ShieldCheck,
  Building,
  Upload,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Department } from '@/types';
import { getDepartments, createDepartment } from '@/services/departmentService';
import { 
  getOrganizationSettings, 
  updateOrganizationSettings, 
  setRhDepartment, 
  setBureauDepartments 
} from '@/services/organizationSettingsService';
import { useQueryClient } from '@tanstack/react-query';

const SetupWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Étape 1 : Nom & Logo
  const [nomAdministration, setNomAdministration] = useState<string>('');
  const [logoAdministration, setLogoAdministration] = useState<string>('');

  // Étape 2 : Départements
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isAddDeptOpen, setIsAddDeptOpen] = useState<boolean>(false);
  const [newDeptName, setNewDeptName] = useState<string>('');
  const [newDeptDesc, setNewDeptDesc] = useState<string>('');
  const [creatingDept, setCreatingDept] = useState<boolean>(false);

  // Étape 3 : Affectations
  const [rhDepartmentId, setRhDepartmentIdState] = useState<string>('');
  const [bureauOrdreDepartmentId, setBureauOrdreDepartmentIdState] = useState<string>('');
  const [bureauDirecteurDepartmentId, setBureauDirecteurDepartmentIdState] = useState<string>('');

  // Charger les données initiales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [settingsRes, deptsRes] = await Promise.all([
          getOrganizationSettings(),
          getDepartments()
        ]);

        if (settingsRes) {
          if (settingsRes.nomAdministration) setNomAdministration(settingsRes.nomAdministration);
          if (settingsRes.logoAdministration) setLogoAdministration(settingsRes.logoAdministration);
          
          const getRawId = (val: unknown) => {
            if (!val) return '';
            if (typeof val === 'string') return val;
            if (typeof val === 'object' && '_id' in (val as { _id: string })) return (val as { _id: string })._id;
            return '';
          };

          setRhDepartmentIdState(getRawId(settingsRes.rhDepartmentId));
          setBureauOrdreDepartmentIdState(getRawId(settingsRes.bureauOrdreDepartmentId));
          setBureauDirecteurDepartmentIdState(getRawId(settingsRes.bureauDirecteurDepartmentId));
        }

        if (Array.isArray(deptsRes)) {
          setDepartments(deptsRes);
        }
      } catch (err) {
        console.error('Erreur chargement données de configuration:', err);
        toast.error('حدث خطأ أثناء تحميل بيانات الإعدادات الحالية');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Création d'un département à l'étape 2
  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) {
      toast.error('يرجى إدخال اسم القسم');
      return;
    }

    try {
      setCreatingDept(true);
      const created = await createDepartment({
        name: newDeptName.trim(),
        description: newDeptDesc.trim() || undefined,
        isActive: true
      });

      toast.success(`تم إنشاء القسم "${created.name}" بنجاح`);
      setNewDeptName('');
      setNewDeptDesc('');
      setIsAddDeptOpen(false);

      // Recharger la liste
      const refreshed = await getDepartments();
      setDepartments(refreshed);
    } catch (err: unknown) {
      console.error('Erreur création département:', err);
      toast.error('فشل في إنشاء القسم. يرجى المحاولة ثانية');
    } finally {
      setCreatingDept(false);
    }
  };

  // Traitement final (Étape 4)
  const handleFinalSubmit = async () => {
    if (!nomAdministration.trim()) {
      toast.error('اسم الإدارة مطلوب');
      setCurrentStep(1);
      return;
    }
    if (departments.length < 3) {
      toast.error('يجب إنشاء 3 أقسام على الأقل');
      setCurrentStep(2);
      return;
    }
    if (!rhDepartmentId || !bureauOrdreDepartmentId || !bureauDirecteurDepartmentId) {
      toast.error('يرجى تعيين كافة الأقسام الرئيسية في الخطوة 3');
      setCurrentStep(3);
      return;
    }

    try {
      setSaving(true);

      // 1. Mise à jour nom et logo
      await updateOrganizationSettings({
        nomAdministration: nomAdministration.trim(),
        logoAdministration: logoAdministration.trim() || undefined
      });

      // 2. Mise à jour RH
      await setRhDepartment(rhDepartmentId);

      // 3. Mise à jour Bureau Directeur et Bureau d'Ordre
      await setBureauDepartments({
        bureauDirecteurDepartmentId,
        bureauOrdreDepartmentId
      });

      // Invalider le cache React Query
      await queryClient.invalidateQueries({ queryKey: ['organization-settings'] });

      toast.success('تم حفظ وضبط إعدادات المؤسسة بنجاح');
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('Erreur finalisation configuration:', err);
      toast.error('حدث خطأ أثناء حفظ الإعدادات النهائية');
    } finally {
      setSaving(false);
    }
  };

  // Helper pour obtenir le nom d'un département à partir de son ID
  const getDeptName = (id: string) => {
    const d = departments.find(item => item._id === id);
    return d ? d.name : 'غير محدد';
  };

  // Validation par étape
  const canGoNext = () => {
    if (currentStep === 1) return nomAdministration.trim().length > 0;
    if (currentStep === 2) return departments.length >= 3;
    if (currentStep === 3) {
      return (
        rhDepartmentId !== '' &&
        bureauOrdreDepartmentId !== '' &&
        bureauDirecteurDepartmentId !== '' &&
        rhDepartmentId !== bureauOrdreDepartmentId &&
        rhDepartmentId !== bureauDirecteurDepartmentId &&
        bureauOrdreDepartmentId !== bureauDirecteurDepartmentId
      );
    }
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7fafc] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-[#2c5282] animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-600">جاري تحميل معالج الإعداد الأولي للنظام...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7fafc] py-10 px-4 sm:px-6 lg:px-8 text-right" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* En-tête principal de la page */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#ebf8ff] text-[#2c5282] rounded-lg">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">معالج الإعداد الأولي للنظام</h1>
              <p className="text-sm text-gray-500 mt-1">
                تهيئة الهيكلية الإدارية والتعريفية للمؤسسة في خطوات موجهة وبسيطة
              </p>
            </div>
          </div>
          <div className="text-left w-full md:w-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ebf8ff] text-[#2c5282] border border-[#bee3f8]">
              <ShieldCheck className="w-4 h-4" />
              صلاحية مسؤول النظام
            </span>
          </div>
        </div>

        {/* Indicateur visuel d'étapes (Stepper 1/4, 2/4, 3/4, 4/4) */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 shadow-sm">
          <div className="grid grid-cols-4 gap-2 text-center">
            
            {/* Étape 1 */}
            <div className={`p-2.5 rounded-lg border transition-all ${
              currentStep === 1 
                ? 'bg-[#ebf8ff] border-[#2c5282] text-[#2c5282] font-bold shadow-xs' 
                : currentStep > 1 
                  ? 'bg-gray-50 border-emerald-200 text-emerald-700' 
                  : 'bg-white border-gray-200 text-gray-400'
            }`}>
              <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
                <span>1/4</span>
                <span className="hidden sm:inline">اسم الإدارة</span>
              </div>
            </div>

            {/* Étape 2 */}
            <div className={`p-2.5 rounded-lg border transition-all ${
              currentStep === 2 
                ? 'bg-[#ebf8ff] border-[#2c5282] text-[#2c5282] font-bold shadow-xs' 
                : currentStep > 2 
                  ? 'bg-gray-50 border-emerald-200 text-emerald-700' 
                  : 'bg-white border-gray-200 text-gray-400'
            }`}>
              <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
                <span>2/4</span>
                <span className="hidden sm:inline">الأقسام (3+)</span>
              </div>
            </div>

            {/* Étape 3 */}
            <div className={`p-2.5 rounded-lg border transition-all ${
              currentStep === 3 
                ? 'bg-[#ebf8ff] border-[#2c5282] text-[#2c5282] font-bold shadow-xs' 
                : currentStep > 3 
                  ? 'bg-gray-50 border-emerald-200 text-emerald-700' 
                  : 'bg-white border-gray-200 text-gray-400'
            }`}>
              <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
                <span>3/4</span>
                <span className="hidden sm:inline">الأقسام السيادية</span>
              </div>
            </div>

            {/* Étape 4 */}
            <div className={`p-2.5 rounded-lg border transition-all ${
              currentStep === 4 
                ? 'bg-[#ebf8ff] border-[#2c5282] text-[#2c5282] font-bold shadow-xs' 
                : 'bg-white border-gray-200 text-gray-400'
            }`}>
              <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
                <span>4/4</span>
                <span className="hidden sm:inline">الملخص والتأكيد</span>
              </div>
            </div>

          </div>
        </div>

        {/* Contenu principal de l'étape active */}
        <Card className="border-[#e2e8f0] shadow-sm">
          
          {/* ================= ÉTAPE 1 : Nom et Logo ================= */}
          {currentStep === 1 && (
            <>
              <CardHeader className="border-b border-[#edf2f7] bg-gray-50/50 pb-4">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <Building className="w-5 h-5 text-[#2c5282]" />
                  الخطوة 1 : تحديد اسم وهوية المؤسسة الإدارية
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-1">
                  سيظهر هذا الاسم في أعلى الشريط العلوي (Header)، الهيكل التنظيمي، والتقارير الرسمية لنظام DMS.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nomAdmin" className="text-sm font-semibold text-gray-700">
                    اسم الإدارة أو المؤسسة <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nomAdmin"
                    value={nomAdministration}
                    onChange={(e) => setNomAdministration(e.target.value)}
                    placeholder="مثال: إدارة التشفير والإعلام الآلي"
                    className="h-11 text-sm border-gray-300 focus:border-[#2c5282] focus:ring-[#2c5282]"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500">
                    حقل إجباري. يُرجى استخدام التسمية الرسمية المعتمدة للمؤسسة.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoAdmin" className="text-sm font-semibold text-gray-700">
                    رابط أو مسار الشعار (اختياري)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="logoAdmin"
                      value={logoAdministration}
                      onChange={(e) => setLogoAdministration(e.target.value)}
                      placeholder="/uploads/logo.png أو رابط صورة"
                      className="h-11 text-sm border-gray-300"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    يمكن تحديث أو رفع شعار المؤسسة لاحقاً من صفحة الإعدادات العامة.
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {/* ================= ÉTAPE 2 : Départements ================= */}
          {currentStep === 2 && (
            <>
              <CardHeader className="border-b border-[#edf2f7] bg-gray-50/50 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[#2c5282]" />
                      الخطوة 2 : تأسيس الأقسام الإدارية (3 أقسام على الأقل)
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-1">
                      يجب تسجيل ما لا يقل عن 3 أقسام (الإدارة العامة، مكتب الضبط، والموارد البشرية RH).
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setIsAddDeptOpen(true)}
                    className="bg-[#2c5282] hover:bg-[#2b6cb0] text-white h-10 px-4 text-xs font-semibold gap-1.5 self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة قسم جديد
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-600 bg-blue-50/60 p-3 rounded-md border border-blue-100">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#2c5282]" />
                    <span>عدد الأقسام المسجلة حالياً : <strong>{departments.length}</strong></span>
                  </div>
                  {departments.length >= 3 ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      الشرط مستوفى (3 أقسام على الأقل)
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold">
                      يتبقى إضافة {3 - departments.length} قسم/أقسام إضافية
                    </span>
                  )}
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-gray-100/75 border-b border-gray-200 text-gray-700 font-bold">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">اسم القسم</th>
                        <th className="p-3">الوصف</th>
                        <th className="p-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {departments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-gray-400">
                            لا توجد أقسام مسجلة حتى الآن. انقر على "إضافة قسم جديد" للمتابعة.
                          </td>
                        </tr>
                      ) : (
                        departments.map((dept, index) => (
                          <tr key={dept._id} className="hover:bg-gray-50/50">
                            <td className="p-3 font-mono text-gray-400">{index + 1}</td>
                            <td className="p-3 font-semibold text-gray-900">{dept.name}</td>
                            <td className="p-3 text-gray-500">{dept.description || '-'}</td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                نشط
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </>
          )}

          {/* ================= ÉTAPE 3 : Affectation des fonctions régaliennes ================= */}
          {currentStep === 3 && (
            <>
              <CardHeader className="border-b border-[#edf2f7] bg-gray-50/50 pb-4">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#2c5282]" />
                  الخطوة 3 : تخصيص الأقسام السيادية والوظيفية (OrganizationSettings)
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-1">
                  تحديد الأقسام المسؤولة عن الموارد البشرية، مكتب الضبط، وإدارة المؤسسة. يمنع اختيار نفس القسم لأكثر من وظيفة.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                
                {/* 1. RH */}
                <div className="space-y-1.5 p-4 rounded-lg border border-gray-200 bg-white">
                  <Label htmlFor="rhDeptSelect" className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    قسم الموارد البشرية (rhDepartmentId) <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-[11px] text-gray-500">
                    القسم المخول بإدارة شؤون الموظفين، الحضور والانصراف، والمسار المهني.
                  </p>
                  <select
                    id="rhDeptSelect"
                    value={rhDepartmentId}
                    onChange={(e) => setRhDepartmentIdState(e.target.value)}
                    className="w-full h-11 px-3 text-xs border border-gray-300 rounded-md focus:border-[#2c5282] focus:ring-[#2c5282] bg-white text-gray-900"
                  >
                    <option value="">-- اختر قسم الموارد البشرية --</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Bureau d'Ordre */}
                <div className="space-y-1.5 p-4 rounded-lg border border-gray-200 bg-white">
                  <Label htmlFor="boDeptSelect" className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    مكتب الضبط (bureauOrdreDepartmentId) <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-[11px] text-gray-500">
                    القسم المسؤول عن تسجيل وتوزيع البريد والمراسلات الصادرة والواردة.
                  </p>
                  <select
                    id="boDeptSelect"
                    value={bureauOrdreDepartmentId}
                    onChange={(e) => setBureauOrdreDepartmentIdState(e.target.value)}
                    className="w-full h-11 px-3 text-xs border border-gray-300 rounded-md focus:border-[#2c5282] focus:ring-[#2c5282] bg-white text-gray-900"
                  >
                    <option value="">-- اختر مكتب الضبط --</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Direction */}
                <div className="space-y-1.5 p-4 rounded-lg border border-gray-200 bg-white">
                  <Label htmlFor="dirDeptSelect" className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    الإدارة العامة / مكتب المدير (bureauDirecteurDepartmentId) <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-[11px] text-gray-500">
                    مكتب المدير العام المشرف على كامل المراسلات والمصالح الإدارية.
                  </p>
                  <select
                    id="dirDeptSelect"
                    value={bureauDirecteurDepartmentId}
                    onChange={(e) => setBureauDirecteurDepartmentIdState(e.target.value)}
                    className="w-full h-11 px-3 text-xs border border-gray-300 rounded-md focus:border-[#2c5282] focus:ring-[#2c5282] bg-white text-gray-900"
                  >
                    <option value="">-- اختر قسم الإدارة العامة --</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Avertissement de doublon éventuel */}
                {Boolean(
                  (rhDepartmentId && bureauOrdreDepartmentId && rhDepartmentId === bureauOrdreDepartmentId) ||
                  (rhDepartmentId && bureauDirecteurDepartmentId && rhDepartmentId === bureauDirecteurDepartmentId) ||
                  (bureauOrdreDepartmentId && bureauDirecteurDepartmentId && bureauOrdreDepartmentId === bureauDirecteurDepartmentId)
                ) && (
                  <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 p-3 rounded-md border border-red-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>تنبيه: لا يمكن اختيار نفس القسم لأكثر من وظيفة سيادية. يرجى اختيار أقسام متباينة.</span>
                  </div>
                )}
              </CardContent>
            </>
          )}

          {/* ================= ÉTAPE 4 : Récapitulatif et validation finale ================= */}
          {currentStep === 4 && (
            <>
              <CardHeader className="border-b border-[#edf2f7] bg-gray-50/50 pb-4">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  الخطوة 4 : مراجعة الملخص النهائي واعتماد التهيئة
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-1">
                  يرجى التأكد من صحة البيانات أدناه قبل الضغط على "إنهاء وحفظ الإعدادات".
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Carte 1 : Nom et Logo */}
                  <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                    <h3 className="text-xs font-bold text-[#2c5282] border-b border-gray-200 pb-2">
                      الهوية الرسمية للمؤسسة
                    </h3>
                    <div className="space-y-1 text-xs">
                      <p className="text-gray-500">اسم الإدارة :</p>
                      <p className="font-bold text-gray-900 text-sm">{nomAdministration}</p>
                    </div>
                    {logoAdministration && (
                      <div className="space-y-1 text-xs pt-1">
                        <p className="text-gray-500">رابط الشعار :</p>
                        <p className="font-mono text-gray-700 truncate">{logoAdministration}</p>
                      </div>
                    )}
                  </div>

                  {/* Carte 2 : الأقسام السيادية */}
                  <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
                    <h3 className="text-xs font-bold text-[#2c5282] border-b border-gray-200 pb-2">
                      توزيع الصلاحيات الإدارية
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-gray-500">الموارد البشرية (RH) : </span>
                        <strong className="text-gray-900">{getDeptName(rhDepartmentId)}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500">مكتب الضبط (BO) : </span>
                        <strong className="text-gray-900">{getDeptName(bureauOrdreDepartmentId)}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500">الإدارة العامة (Direction) : </span>
                        <strong className="text-gray-900">{getDeptName(bureauDirecteurDepartmentId)}</strong>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/60 text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">جاهزية النظام للتشغيل الفعلي</p>
                    <p className="mt-0.5 text-emerald-700 leading-relaxed">
                      عند النقر على "إنهاء وحفظ الإعدادات"، سيتم حفظ هذه الإعدادات وتفعيل تسمية المؤسسة على كافة واجهات النظام ولوحة التحكم.
                    </p>
                  </div>
                </div>

              </CardContent>
            </>
          )}

          {/* Boutons de navigation (Suivant / Précédent / Terminer) */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={saving}
                className="h-10 text-xs gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                الخطوة السابقة
              </Button>
            ) : (
              <div></div>
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canGoNext()}
                className="bg-[#2c5282] hover:bg-[#2b6cb0] text-white h-10 px-6 text-xs font-semibold gap-1.5"
              >
                الخطوة التالية
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinalSubmit}
                disabled={saving || !canGoNext()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-6 text-xs font-semibold gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري حفظ الإعدادات...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    إنهاء وحفظ الإعدادات
                  </>
                )}
              </Button>
            )}
          </div>

        </Card>

      </div>

      {/* Boîte de dialogue pour ajouter un nouveau département */}
      <Dialog open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen}>
        <DialogContent className="sm:max-w-[425px] text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-800">
              إضافة قسم إداري جديد
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              أدخل اسم القسم ووصفه لإنشائه وإدراجه في الهيكل الإداري.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="dialogDeptName" className="text-xs font-semibold">
                اسم القسم <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dialogDeptName"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="مثال: الموارد البشرية"
                className="h-10 text-xs"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialogDeptDesc" className="text-xs font-semibold">
                وصف القسم (اختياري)
              </Label>
              <Input
                id="dialogDeptDesc"
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
                placeholder="مثال: إدارة شؤون الموظفين والمسار المهني"
                className="h-10 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddDeptOpen(false)}
              disabled={creatingDept}
              className="h-9 text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleCreateDepartment}
              disabled={creatingDept || !newDeptName.trim()}
              className="bg-[#2c5282] hover:bg-[#2b6cb0] text-white h-9 text-xs font-semibold"
            >
              {creatingDept ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />
                  جاري الإنشاء...
                </>
              ) : (
                'حفظ القسم'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default SetupWizardPage;
