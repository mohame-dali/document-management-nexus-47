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
  Loader2,
  UserCheck,
  UserPlus,
  Info,
  Lock,
  User as UserIcon,
  Check
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
import { createPersonnel, linkUserToPersonnel } from '@/services/hr/personnelApi';
import { createUser, getUsers } from '@/services/userService';
import { useQueryClient } from '@tanstack/react-query';

interface AccountCreatedInfo {
  userId?: string;
  personnelId?: string;
  nom: string;
  prenom: string;
  username: string;
}

interface UserRecord extends Partial<User> {
  _id: string;
  username: string;
  role: 'Director' | 'Admin' | 'AdminDepartment' | 'AdminTuningDesk' | 'User';
  isDeleted?: boolean;
  personnelId?: string | { _id: string; nom?: string; prenom?: string } | null;
}

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

  // Étape 4 : Directeur
  const [directorNom, setDirectorNom] = useState<string>('');
  const [directorPrenom, setDirectorPrenom] = useState<string>('');
  const [directorUsername, setDirectorUsername] = useState<string>('directeur');
  const [directorPassword, setDirectorPassword] = useState<string>('');
  const [directorConfirmPassword, setDirectorConfirmPassword] = useState<string>('');
  const [directorCreated, setDirectorCreated] = useState<AccountCreatedInfo | null>(null);

  // Étape 5 : RH Manager
  const [rhNom, setRhNom] = useState<string>('');
  const [rhPrenom, setRhPrenom] = useState<string>('');
  const [rhUsername, setRhUsername] = useState<string>('rh_manager');
  const [rhPassword, setRhPassword] = useState<string>('');
  const [rhConfirmPassword, setRhConfirmPassword] = useState<string>('');
  const [rhManagerCreated, setRhManagerCreated] = useState<AccountCreatedInfo | null>(null);

  // Charger les données initiales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [settingsRes, deptsRes, usersRes] = await Promise.allSettled([
          getOrganizationSettings(),
          getDepartments(),
          getUsers()
        ]);

        let currentRhDept = '';
        let currentDirDept = '';

        if (settingsRes.status === 'fulfilled' && settingsRes.value) {
          const s = settingsRes.value;
          if (s.nomAdministration) setNomAdministration(s.nomAdministration);
          if (s.logoAdministration) setLogoAdministration(s.logoAdministration);
          
          const getRawId = (val: unknown) => {
            if (!val) return '';
            if (typeof val === 'string') return val;
            if (typeof val === 'object' && '_id' in (val as { _id: string })) return (val as { _id: string })._id;
            return '';
          };

          currentRhDept = getRawId(s.rhDepartmentId);
          currentDirDept = getRawId(s.bureauDirecteurDepartmentId);

          setRhDepartmentIdState(currentRhDept);
          setBureauOrdreDepartmentIdState(getRawId(s.bureauOrdreDepartmentId));
          setBureauDirecteurDepartmentIdState(currentDirDept);
        }

        if (deptsRes.status === 'fulfilled' && Array.isArray(deptsRes.value)) {
          setDepartments(deptsRes.value);
        }

        // Vérifier si des comptes Director ou RH Manager existent déjà
        if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
          const usersList = usersRes.value as unknown as UserRecord[];
          
          // Recherche Director
          const existingDir = usersList.find((u) => u.role === 'Director' && !u.isDeleted);
          if (existingDir) {
            setDirectorUsername(existingDir.username);
            const p = typeof existingDir.personnelId === 'object' ? existingDir.personnelId : null;
            if (p?.nom) setDirectorNom(p.nom);
            if (p?.prenom) setDirectorPrenom(p.prenom);
            setDirectorCreated({
              userId: existingDir._id,
              personnelId: p?._id || (typeof existingDir.personnelId === 'string' ? existingDir.personnelId : undefined),
              nom: p?.nom || existingDir.username,
              prenom: p?.prenom || '',
              username: existingDir.username,
            });
          }

          // Recherche RH Manager
          const existingRh = usersList.find((u) => 
            !u.isDeleted && (
              (u.role === 'AdminDepartment' && currentRhDept && (
                (u.activeDepartment?._id && u.activeDepartment._id === currentRhDept) ||
                (u.activeDepartment as unknown as string) === currentRhDept
              )) ||
              u.username === 'rh_manager'
            )
          );
          if (existingRh) {
            setRhUsername(existingRh.username);
            const p = typeof existingRh.personnelId === 'object' ? existingRh.personnelId : null;
            if (p?.nom) setRhNom(p.nom);
            if (p?.prenom) setRhPrenom(p.prenom);
            setRhManagerCreated({
              userId: existingRh._id,
              personnelId: p?._id || (typeof existingRh.personnelId === 'string' ? existingRh.personnelId : undefined),
              nom: p?.nom || existingRh.username,
              prenom: p?.prenom || '',
              username: existingRh.username,
            });
          }
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

  // Passage de l'étape 3 à l'étape 4 : sauvegarde des fonctions régaliennes
  const handleSaveStep3 = async () => {
    if (!rhDepartmentId || !bureauOrdreDepartmentId || !bureauDirecteurDepartmentId) {
      toast.error('يرجى تعيين كافة الأقسام الرئيسية قبل المتابعة');
      return;
    }

    if (
      rhDepartmentId === bureauOrdreDepartmentId ||
      rhDepartmentId === bureauDirecteurDepartmentId ||
      bureauOrdreDepartmentId === bureauDirecteurDepartmentId
    ) {
      toast.error('لا يمكن اختيار نفس القسم لأكثر من وظيفة سيادية');
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

      await queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      toast.success('تم حفظ الأقسام السيادية بنجاح');
      setCurrentStep(4);
    } catch (err: unknown) {
      console.error('Erreur sauvegarde organisation:', err);
      toast.error('حدث خطأ أثناء حفظ الأقسام السيادية');
    } finally {
      setSaving(false);
    }
  };

  // Traitement étape 4 : Création du compte Directeur
  const handleCreateDirector = async () => {
    if (directorCreated) {
      setCurrentStep(5);
      return;
    }

    if (!directorNom.trim() || !directorPrenom.trim()) {
      toast.error('الاسم واللقب لمدير الإدارة مطلوبان');
      return;
    }

    if (!directorUsername.trim()) {
      toast.error('اسم المستخدم مطلوب');
      return;
    }

    if (!directorPassword || directorPassword.length < 6) {
      toast.error('كلمة المرور يجب ألا تقل عن 6 أحرف');
      return;
    }

    if (directorPassword !== directorConfirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }

    if (!bureauDirecteurDepartmentId) {
      toast.error('Département Direction non configuré / قسم الإدارة غير محدد');
      return;
    }

    try {
      setSaving(true);

      // Étape A — Créer le Personnel partiel (statut='en_attente')
      const personnel = await createPersonnel({
        nom: directorNom.trim(),
        prenom: directorPrenom.trim(),
        activeDepartment: bureauDirecteurDepartmentId
      });

      const personnelId = (personnel as unknown as { _id?: string })?._id;
      if (!personnelId) {
        throw new Error('Impossible de récupérer l\'identifiant de la fiche Personnel');
      }

      // Étape B — Créer le User Director
      const user = await createUser({
        username: directorUsername.trim(),
        password: directorPassword,
        role: 'Director',
        departments: [bureauDirecteurDepartmentId],
        activeDepartment: bureauDirecteurDepartmentId,
        personnelId: personnelId
      });

      const userId = (user as unknown as { _id?: string })?._id;

      // Étape C — Lier explicitement User et Personnel (active le statut à 'actif')
      if (userId) {
        try {
          await linkUserToPersonnel(personnelId, userId);
        } catch (linkErr) {
          console.warn('Lien automatique partiel:', linkErr);
        }
      }

      setDirectorCreated({
        userId,
        personnelId,
        nom: directorNom.trim(),
        prenom: directorPrenom.trim(),
        username: directorUsername.trim()
      });

      toast.success('تم إنشاء حساب مدير الإدارة بنجاح');
      setCurrentStep(5);
    } catch (err: unknown) {
      console.error('Erreur création Directeur:', err);
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj.response?.data?.message || errorObj.message || '';
      if (msg.includes('déjà') || msg.includes('exists') || msg.includes('11000')) {
        toast.error('Nom d\'utilisateur déjà utilisé / اسم المستخدم مستخدم بالفعل');
      } else if (msg.includes('Directeur') || msg.includes('director') || msg.includes('autorisé')) {
        toast.error('Un seul Directeur est autorisé / يسمح بمدير واحد فقط في النظام');
      } else {
        toast.error(msg || 'فشل في إنشاء حساب المدير');
      }
    } finally {
      setSaving(false);
    }
  };

  // Traitement étape 5 : Création du compte RH Manager
  const handleCreateRhManager = async () => {
    if (rhManagerCreated) {
      setCurrentStep(6);
      return;
    }

    if (!rhNom.trim() || !rhPrenom.trim()) {
      toast.error('الاسم واللقب لمسؤول الموارد البشرية مطلوبان');
      return;
    }

    if (!rhUsername.trim()) {
      toast.error('اسم المستخدم مطلوب');
      return;
    }

    if (!rhPassword || rhPassword.length < 6) {
      toast.error('كلمة المرور يجب ألا تقل عن 6 أحرف');
      return;
    }

    if (rhPassword !== rhConfirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }

    if (!rhDepartmentId) {
      toast.error('Département RH non configuré / قسم الموارد البشرية غير محدد');
      return;
    }

    try {
      setSaving(true);

      // Étape A — Créer le Personnel partiel (statut='en_attente')
      const personnel = await createPersonnel({
        nom: rhNom.trim(),
        prenom: rhPrenom.trim(),
        activeDepartment: rhDepartmentId
      });

      const personnelId = (personnel as unknown as { _id?: string })?._id;
      if (!personnelId) {
        throw new Error('Impossible de récupérer l\'identifiant de la fiche Personnel');
      }

      // Étape B — Créer le User RH Manager (AdminDepartment)
      const user = await createUser({
        username: rhUsername.trim(),
        password: rhPassword,
        role: 'AdminDepartment',
        departments: [rhDepartmentId],
        activeDepartment: rhDepartmentId,
        personnelId: personnelId
      });

      const userId = (user as unknown as { _id?: string })?._id;

      // Étape C — Lier User et Personnel
      if (userId) {
        try {
          await linkUserToPersonnel(personnelId, userId);
        } catch (linkErr) {
          console.warn('Lien automatique partiel:', linkErr);
        }
      }

      setRhManagerCreated({
        userId,
        personnelId,
        nom: rhNom.trim(),
        prenom: rhPrenom.trim(),
        username: rhUsername.trim()
      });

      toast.success('تم إنشاء حساب مسؤول الموارد البشرية بنجاح');
      setCurrentStep(6);
    } catch (err: unknown) {
      console.error('Erreur création RH Manager:', err);
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj.response?.data?.message || errorObj.message || '';
      if (msg.includes('déjà') || msg.includes('exists') || msg.includes('11000')) {
        toast.error('Nom d\'utilisateur déjà utilisé / اسم المستخدم مستخدم بالفعل');
      } else {
        toast.error(msg || 'فشل في إنشاء حساب مسؤول الموارد البشرية');
      }
    } finally {
      setSaving(false);
    }
  };

  // Traitement final (Étape 6) : Finalisation
  const handleFinalSubmit = async () => {
    try {
      setSaving(true);

      // Invalider les caches
      await queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['hr', 'personnel'] });

      toast.success('تم اكتمال الإعداد الأولي للنظام بنجاح!');
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('Erreur finalisation configuration:', err);
      toast.error('حدث خطأ أثناء إنهاء الإعداد');
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
    if (currentStep === 4) {
      if (directorCreated) return true;
      return (
        directorNom.trim().length > 0 &&
        directorPrenom.trim().length > 0 &&
        directorUsername.trim().length > 0 &&
        directorPassword.length >= 6 &&
        directorPassword === directorConfirmPassword
      );
    }
    if (currentStep === 5) {
      if (rhManagerCreated) return true;
      return (
        rhNom.trim().length > 0 &&
        rhPrenom.trim().length > 0 &&
        rhUsername.trim().length > 0 &&
        rhPassword.length >= 6 &&
        rhPassword === rhConfirmPassword
      );
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      handleSaveStep3();
    } else if (currentStep === 4) {
      handleCreateDirector();
    } else if (currentStep === 5) {
      handleCreateRhManager();
    } else if (currentStep === 6) {
      handleFinalSubmit();
    }
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
                تهيئة الهيكلية الإدارية والتعريفية وحسابات الإدارة في خطوات موجهة وبسيطة
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

        {/* Indicateur visuel d'étapes (Stepper 1/6 à 6/6) */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 shadow-sm">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            
            {/* Étape 1 */}
            <div className={`p-2 rounded-lg border transition-all ${
              currentStep === 1 
                ? 'bg-[#ebf8ff] border-[#2c5282] text-[#2c5282] font-bold shadow-xs' 
                : currentStep > 1 
                  ? 'bg-gray-50 border-emerald-200 text-emerald-700' 
                  : 'bg-white border-gray-200 text-gray-400'
            }`}>
              <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs">
                <span>1/6</span>
                <span className="hidden sm:inline">اسم الإدارة</span>
              </div>
            </div>

            {/* Étape 2 */}
            <div className={`p-2 rounded-lg border transition-all ${
              currentStep === 2 
                ? 'bg-[#ebf8ff] border-[#2c5282] text-[#2c5282] font-bold shadow-xs' 
                : currentStep > 2 
                  ? 'bg-gray-50 border-emerald-200 text-emerald-700' 
                  : 'bg-white border-gray-200 text-gray-400'
            }`}>
              <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs">
                <span>2/6</span>
                <span className="hidden sm:inline">الأقسام</span>
              </div>
            </div>

            {/* Étape 3 */}
            <div className={`p-2 rounded-lg border transition-all ${
              currentStep === 3 
                ? 'bg-[#ebf8ff] border-[#2c5282] text-[#2c5282] font-bold shadow-xs' 
                : currentStep > 3 
                  ? 'bg-gray-50 border-emerald-200 text-emerald-700' 
                  : 'bg-white border-gray-200 text-gray-400'
            }`}>
              <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs">
                <span>3/6</span>
                <span className="hidden sm:inline">الأقسام السيادية</span>
              </div>
            </div>

            {/* Étape 4 */}
            <div className={`p-2 rounded-lg border transition-all ${
              currentStep === 4 
                ? 'bg-[#ebf8ff] border-[#2c5282] text-[#2c5282] font-bold shadow-xs' 
                : currentStep > 4 
                  ? 'bg-gray-50 border-emerald-200 text-emerald-700' 
                  : 'bg-white border-gray-200 text-gray-400'
            }`}>
              <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs">
                <span>4/6</span>
                <span className="hidden sm:inline">مدير الإدارة</span>
              </div>
            </div>

            {/* Étape 5 */}
            <div className={`p-2 rounded-lg border transition-all ${
              currentStep === 5 
                ? 'bg-[#ebf8ff] border-[#2c5282] text-[#2c5282] font-bold shadow-xs' 
                : currentStep > 5 
                  ? 'bg-gray-50 border-emerald-200 text-emerald-700' 
                  : 'bg-white border-gray-200 text-gray-400'
            }`}>
              <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs">
                <span>5/6</span>
                <span className="hidden sm:inline">مسؤول RH</span>
              </div>
            </div>

            {/* Étape 6 */}
            <div className={`p-2 rounded-lg border transition-all ${
              currentStep === 6 
                ? 'bg-[#ebf8ff] border-[#2c5282] text-[#2c5282] font-bold shadow-xs' 
                : 'bg-white border-gray-200 text-gray-400'
            }`}>
              <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs">
                <span>6/6</span>
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

          {/* ================= ÉTAPE 4 : Compte Directeur ================= */}
          {currentStep === 4 && (
            <>
              <CardHeader className="border-b border-[#edf2f7] bg-gray-50/50 pb-4">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#2c5282]" />
                  الخطوة 4 : إنشاء حساب مدير الإدارة
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-1">
                  Le Directeur de l'administration — accès en lecture seule
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">

                {/* Info Panel */}
                <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-200 text-blue-900 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-blue-800">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>صلاحيات وطبيعة حساب المدير العام :</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-blue-800/90 pr-2">
                    <li>Le Directeur aura un accès en lecture seule à tous les documents et au personnel. (صلاحية قراءة واطلاع شاملة على كافة الوثائق والملفات).</li>
                    <li>Le RH Manager complétera sa fiche (CIN, poste, etc.) ultérieurement. (سيقوم مسؤول الموارد البشرية باستكمال بطاقة الموظف لاحقاً).</li>
                  </ul>
                </div>

                {directorCreated && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>تم تأسيس حساب المدير بنجاح: <strong>{directorCreated.nom} {directorCreated.prenom}</strong> (@{directorCreated.username})</span>
                  </div>
                )}

                {/* Section Identité (minimale) */}
                <div className="p-4 rounded-lg border border-gray-200 bg-white space-y-4">
                  <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <UserIcon className="w-4 h-4 text-[#2c5282]" />
                    الهوية الإدارية الأساسية (Personnel partiel)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="dirNom" className="text-xs font-semibold text-gray-700">
                        اللقب (Nom) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="dirNom"
                        value={directorNom}
                        onChange={(e) => setDirectorNom(e.target.value)}
                        placeholder="لقب المدير"
                        disabled={!!directorCreated || saving}
                        className="h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dirPrenom" className="text-xs font-semibold text-gray-700">
                        الاسم (Prénom) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="dirPrenom"
                        value={directorPrenom}
                        onChange={(e) => setDirectorPrenom(e.target.value)}
                        placeholder="اسم المدير"
                        disabled={!!directorCreated || saving}
                        className="h-10 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Section Compte de connexion */}
                <div className="p-4 rounded-lg border border-gray-200 bg-white space-y-4">
                  <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <Lock className="w-4 h-4 text-[#2c5282]" />
                    بيانات تسجيل الدخول (User Account)
                  </h3>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="dirUsername" className="text-xs font-semibold text-gray-700">
                      اسم المستخدم (Username) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="dirUsername"
                      value={directorUsername}
                      onChange={(e) => setDirectorUsername(e.target.value)}
                      placeholder="directeur"
                      disabled={!!directorCreated || saving}
                      className="h-10 text-xs"
                      dir="ltr"
                    />
                    <p className="text-[11px] text-gray-500">
                      الاسم الافتراضي المقترح: <code className="bg-gray-100 px-1 py-0.5 rounded">directeur</code>
                    </p>
                  </div>

                  {!directorCreated && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="dirPassword" className="text-xs font-semibold text-gray-700">
                          كلمة المرور (6 أحرف على الأقل) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="dirPassword"
                          type="password"
                          value={directorPassword}
                          onChange={(e) => setDirectorPassword(e.target.value)}
                          placeholder="••••••••"
                          disabled={saving}
                          className="h-10 text-xs"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="dirConfirmPassword" className="text-xs font-semibold text-gray-700">
                          تأكيد كلمة المرور <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="dirConfirmPassword"
                          type="password"
                          value={directorConfirmPassword}
                          onChange={(e) => setDirectorConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          disabled={saving}
                          className="h-10 text-xs"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </>
          )}

          {/* ================= ÉTAPE 5 : Compte RH Manager ================= */}
          {currentStep === 5 && (
            <>
              <CardHeader className="border-b border-[#edf2f7] bg-gray-50/50 pb-4">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#2c5282]" />
                  الخطوة 5 : إنشاء حساب مسؤول الموارد البشرية
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-1">
                  Ce compte permettra de créer et compléter les fiches du personnel
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">

                {/* Info Panel */}
                <div className="p-4 rounded-lg bg-indigo-50/70 border border-indigo-200 text-indigo-900 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-indigo-800">
                    <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>صلاحيات ومسؤوليات مسؤول الموارد البشرية :</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-indigo-800/90 pr-2">
                    <li>Le RH Manager créera ensuite les autres fiches (BO, LABO, QT). (إنشاء بطاقات موظفي المصالح والأقسام الأخرى).</li>
                    <li>Il pourra également compléter sa propre fiche et celle du Directeur (CIN, poste, etc.). (استكمال كافة البيانات الإدارية والمهنية لاحقاً).</li>
                  </ul>
                </div>

                {rhManagerCreated && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>تم تأسيس حساب مسؤول الموارد البشرية بنجاح: <strong>{rhManagerCreated.nom} {rhManagerCreated.prenom}</strong> (@{rhManagerCreated.username})</span>
                  </div>
                )}

                {/* Section Identité (minimale) */}
                <div className="p-4 rounded-lg border border-gray-200 bg-white space-y-4">
                  <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <UserIcon className="w-4 h-4 text-[#2c5282]" />
                    الهوية الإدارية الأساسية (Personnel partiel)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="rhNom" className="text-xs font-semibold text-gray-700">
                        اللقب (Nom) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="rhNom"
                        value={rhNom}
                        onChange={(e) => setRhNom(e.target.value)}
                        placeholder="لقب مسؤول RH"
                        disabled={!!rhManagerCreated || saving}
                        className="h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rhPrenom" className="text-xs font-semibold text-gray-700">
                        الاسم (Prénom) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="rhPrenom"
                        value={rhPrenom}
                        onChange={(e) => setRhPrenom(e.target.value)}
                        placeholder="اسم مسؤول RH"
                        disabled={!!rhManagerCreated || saving}
                        className="h-10 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Section Compte de connexion */}
                <div className="p-4 rounded-lg border border-gray-200 bg-white space-y-4">
                  <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <Lock className="w-4 h-4 text-[#2c5282]" />
                    بيانات تسجيل الدخول (User Account)
                  </h3>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="rhUsername" className="text-xs font-semibold text-gray-700">
                      اسم المستخدم (Username) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="rhUsername"
                      value={rhUsername}
                      onChange={(e) => setRhUsername(e.target.value)}
                      placeholder="rh_manager"
                      disabled={!!rhManagerCreated || saving}
                      className="h-10 text-xs"
                      dir="ltr"
                    />
                    <p className="text-[11px] text-gray-500">
                      الاسم الافتراضي المقترح: <code className="bg-gray-100 px-1 py-0.5 rounded">rh_manager</code>
                    </p>
                  </div>

                  {!rhManagerCreated && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="rhPassword" className="text-xs font-semibold text-gray-700">
                          كلمة المرور (6 أحرف على الأقل) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="rhPassword"
                          type="password"
                          value={rhPassword}
                          onChange={(e) => setRhPassword(e.target.value)}
                          placeholder="••••••••"
                          disabled={saving}
                          className="h-10 text-xs"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="rhConfirmPassword" className="text-xs font-semibold text-gray-700">
                          تأكيد كلمة المرور <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="rhConfirmPassword"
                          type="password"
                          value={rhConfirmPassword}
                          onChange={(e) => setRhConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          disabled={saving}
                          className="h-10 text-xs"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </>
          )}

          {/* ================= ÉTAPE 6 : Récapitulatif et validation finale ================= */}
          {currentStep === 6 && (
            <>
              <CardHeader className="border-b border-[#edf2f7] bg-gray-50/50 pb-4">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  الخطوة 6 : مراجعة الملخص النهائي واعتماد التهيئة
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-1">
                  الملخص الشامل للهيكلية الإدارية، الحسابات المنشأة، والخطوات التالية
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Carte 1 : Nom et Logo */}
                  <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                    <h3 className="text-xs font-bold text-[#2c5282] border-b border-gray-200 pb-2 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-[#2c5282]" />
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

                  {/* Carte 2 : الأقسام المسجلة */}
                  <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                    <h3 className="text-xs font-bold text-[#2c5282] border-b border-gray-200 pb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#2c5282]" />
                        الأقسام الإدارية المؤسسة
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {departments.length} أقسام
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {departments.map(d => (
                        <span key={d._id} className="px-2 py-1 bg-white border border-gray-200 text-gray-700 rounded text-[11px]">
                          {d.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Carte 3 : الأقسام السيادية */}
                  <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
                    <h3 className="text-xs font-bold text-[#2c5282] border-b border-gray-200 pb-2 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-[#2c5282]" />
                      توزيع الصلاحيات الإدارية (Functions)
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

                  {/* Carte 4 : الحسابات المنشأة */}
                  <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
                    <h3 className="text-xs font-bold text-[#2c5282] border-b border-gray-200 pb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#2c5282]" />
                      الحسابات والبطاقات الإدارية المنشأة
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded bg-white border border-gray-200">
                        <div className="font-semibold text-gray-900">
                          مدير الإدارة (Directeur) : {directorNom} {directorPrenom}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center justify-between mt-1">
                          <span>اسم الدخول: <code className="font-mono text-gray-700">{directorUsername}</code></span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                            Fiche Personnel : créée (statut: actif)
                          </span>
                        </div>
                      </div>

                      <div className="p-2 rounded bg-white border border-gray-200">
                        <div className="font-semibold text-gray-900">
                          مسؤول الموارد البشرية (RH Manager) : {rhNom} {rhPrenom}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center justify-between mt-1">
                          <span>اسم الدخول: <code className="font-mono text-gray-700">{rhUsername}</code></span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                            Fiche Personnel : créée (statut: actif)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Info Box (Amber) - Prochaines étapes */}
                <div className="p-4 rounded-lg border border-amber-300 bg-amber-50/90 text-amber-900 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>⚠️ Prochaines étapes / الخطوات الموالية المقترحة :</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-amber-800 pr-2 leading-relaxed">
                    <li>
                      <strong>Déconnectez-vous et connectez-vous avec le compte RH Manager</strong>
                      <span className="block text-[11px] text-amber-700 mr-5">تسجيل الخروج من حساب المشرف الحالي، ثم الدخول بحساب مسؤول الموارد البشرية.</span>
                    </li>
                    <li>
                      <strong>Complétez votre fiche Personnel (CIN, poste, etc.)</strong>
                      <span className="block text-[11px] text-amber-700 mr-5">استكمال البيانات الشخصية والمهنية لبطاقة مسؤول الموارد البشرية.</span>
                    </li>
                    <li>
                      <strong>Complétez la fiche du Directeur</strong>
                      <span className="block text-[11px] text-amber-700 mr-5">استكمال ملف مدير الإدارة بالمعلومات الرسمية (رقم بطاقة التعريف، المنصب، إلخ).</span>
                    </li>
                    <li>
                      <strong>Créez les fiches du personnel des autres départements</strong>
                      <span className="block text-[11px] text-amber-700 mr-5">إنشاء بطاقات الموظفين لباقي الأقسام (مكتب الضبط BO، المخبر LABO، الجودة QT...).</span>
                    </li>
                    <li>
                      <strong>Créez leurs comptes utilisateurs</strong>
                      <span className="block text-[11px] text-amber-700 mr-5">إنشاء حسابات المستخدمين وربطها بالبطاقات المهنية المنشأة.</span>
                    </li>
                  </ol>
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

            {currentStep < 6 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                disabled={saving || !canGoNext()}
                className="bg-[#2c5282] hover:bg-[#2b6cb0] text-white h-10 px-6 text-xs font-semibold gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    الخطوة التالية
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinalSubmit}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-6 text-xs font-semibold gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري إنهاء التهيئة...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    إنهاء الإعداد والبدء (Terminer la configuration)
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
