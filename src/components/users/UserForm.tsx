import React, { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Card, 
  CardContent, 
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, ArrowRight, User, Shield, Building, Check, AlertCircle, UserCheck, UserPlus, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Department, User as UserType } from '@/types';
import { getPersonnelList, getOrganizationSettings } from '@/services/hr/personnelApi';
import { getUsers } from '@/services/userService';
import { Personnel } from '@/types/hr';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UserFormData {
  username: string;
  password?: string;
  role: 'Director' | 'Admin' | 'AdminDepartment' | 'AdminTuningDesk' | 'User';
  departments: string[];
  isActive?: boolean;
  personnelId?: string | null;
}

interface UserFormProps {
  user?: UserType | null;
  onSubmit: (data: UserFormData) => void | Promise<unknown>;
  isSubmitting: boolean;
  departments: Department[];
  currentUserRole: string;
  currentUserDepartment: string;
  onResetPassword?: () => void;
  isResettingPassword?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({ 
  user, 
  onSubmit, 
  isSubmitting, 
  departments, 
  currentUserRole, 
  currentUserDepartment,
  onResetPassword,
  isResettingPassword
}) => {
  const isEditMode = !!user;
  const navigate = useNavigate();
  
  const form = useForm<UserFormData>({
    defaultValues: {
      username: user?.username || '',
      password: '',
      role: (user?.role as UserFormData['role']) || 'User',
      departments: user?.departments?.map((d: Department) => d._id) || [],
      isActive: user?.isActive !== undefined ? user.isActive : true,
      personnelId: user?.personnelId || '',
    }
  });

  const { currentUser } = useAuth();

  // LOT B: Charger OrganizationSettings via React Query
  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: 60000,
  });

  // Déterminer le rôle effectif et le département actif de l'utilisateur connecté
  const effectiveUserRole = currentUser?.role || currentUserRole;
  const effectiveDeptId = String(
    currentUserDepartment ||
    (typeof currentUser?.activeDepartment === 'object' && currentUser?.activeDepartment
      ? currentUser.activeDepartment._id
      : typeof currentUser?.activeDepartment === 'string'
        ? currentUser.activeDepartment
        : '')
  );

  // Recherche des informations du département actif (nom / code)
  const activeDept = departments.find(d => String(d._id) === effectiveDeptId) ||
    (typeof currentUser?.activeDepartment === 'object' ? currentUser?.activeDepartment : null);
  const activeDeptName = (activeDept?.name || '').trim().toLowerCase();
  const activeDeptCode = ((activeDept as { code?: string } | null)?.code || '').trim().toUpperCase();

  // ID du département RH configuré dans OrganizationSettings
  const rhDeptId = typeof orgSettings?.rhDepartmentId === 'object' && orgSettings?.rhDepartmentId
    ? String(orgSettings.rhDepartmentId._id || '')
    : String(orgSettings?.rhDepartmentId || '');

  // Déterminer si l'utilisateur connecté appartient au département RH :
  // 1. Concordance explicite avec l'ID du département RH configuré
  // 2. Ou détection sémantique par nom ou code (ex: 'RH', 'Ressources Humaines', 'الموارد البشرية')
  const isRHDepartment = Boolean(
    (rhDeptId && effectiveDeptId && effectiveDeptId === rhDeptId) ||
    (activeDeptCode === 'RH' ||
     activeDeptName === 'rh' ||
     activeDeptName === 'ressources humaines' ||
     activeDeptName === 'الموارد البشرية' ||
     activeDeptName.includes('ressources humaines') ||
     activeDeptName.includes('الموارد البشرية'))
  );

  // Seuls Admin et AdminDepartment du département RH peuvent CRÉER / gérer des fiches personnel
  // Les AdminDepartment NON-RH (ex: QT, LABO) ne peuvent PAS créer de fiche, ils peuvent uniquement en sélectionner une existante
  const isSuperOrAdmin = effectiveUserRole === 'Admin';
  const isAdminDeptRH = effectiveUserRole === 'AdminDepartment' && isRHDepartment;
  const canManagePersonnel = isSuperOrAdmin || isAdminDeptRH;

  // Récupération de toutes les fiches personnel (pagination multi-pages pour dépasser la limite de 100)
  const { data: personnelData, isLoading: isLoadingPersonnel } = useQuery({
    queryKey: ['personnels-for-user-form', currentUserDepartment, canManagePersonnel],
    queryFn: async () => {
      const allPersonnel: Personnel[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const params: Record<string, unknown> = { page, limit: 100 };
        if (!canManagePersonnel && currentUserDepartment) {
          params.activeDepartment = currentUserDepartment;
        }
        const res = await getPersonnelList(params as Parameters<typeof getPersonnelList>[0]);
        if (Array.isArray(res?.data)) {
          allPersonnel.push(...res.data);
        }
        totalPages = res?.pagination?.pages || 1;
        page += 1;
      } while (page <= totalPages && page <= 50);

      return allPersonnel;
    },
    enabled: !isEditMode,
    staleTime: 1000 * 30,
  });

  const personnels: Personnel[] = useMemo(
    () => (Array.isArray(personnelData) ? personnelData : []),
    [personnelData]
  );

  // Récupération des utilisateurs existants pour exclure les personnels déjà liés à un compte
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 1000 * 30,
  });

  const takenPersonnelIds = useMemo(() => {
    const ids = new Set<string>();
    const existingUsers = Array.isArray(usersData) ? usersData : [];
    const currentUserId = user?._id ? String(user._id) : null;

    existingUsers.forEach((existingUser) => {
      if (currentUserId && String(existingUser._id) === currentUserId) {
        return;
      }
      const rawPersonnelId = existingUser.personnelId as
        | string
        | { _id?: string }
        | null
        | undefined;
      const normalizedId =
        typeof rawPersonnelId === 'object' && rawPersonnelId !== null
          ? rawPersonnelId._id
          : rawPersonnelId;
      if (normalizedId) {
        ids.add(String(normalizedId));
      }
    });

    return ids;
  }, [usersData, user?._id]);

  const availablePersonnels: Personnel[] = useMemo(
    () =>
      personnels.filter(
        (p) => !takenPersonnelIds.has(String(p._id)) && !p.userId
      ),
    [personnels, takenPersonnelIds]
  );

  const hiddenPersonnelsCount = personnels.length - availablePersonnels.length;

  // LOT B: Fonction pour détecter si un département est fonctionnel (Bureau Directeur ou Bureau d'Ordre)
  const isFunctionalDepartment = (departmentId?: string | { _id: string; name?: string } | null) => {
    if (!orgSettings || !departmentId) return false;
    const deptId = typeof departmentId === 'object' && departmentId ? String(departmentId._id) : String(departmentId);
    if (!deptId) return false;

    const bureauDirecteurId = typeof orgSettings.bureauDirecteurDepartmentId === 'object' && orgSettings.bureauDirecteurDepartmentId
      ? String(orgSettings.bureauDirecteurDepartmentId._id)
      : String(orgSettings.bureauDirecteurDepartmentId || '');

    const bureauOrdreId = typeof orgSettings.bureauOrdreDepartmentId === 'object' && orgSettings.bureauOrdreDepartmentId
      ? String(orgSettings.bureauOrdreDepartmentId._id)
      : String(orgSettings.bureauOrdreDepartmentId || '');

    return (
      (bureauDirecteurId !== '' && bureauDirecteurId === deptId) ||
      (bureauOrdreId !== '' && bureauOrdreId === deptId)
    );
  };

  type PersonnelDeptCategory = 'BO' | 'DIRECTION' | 'OTHER';

  // Détecter la catégorie du département du personnel sélectionné (BO, Bureau Directeur ou Autre)
  const getPersonnelDepartmentCategory = (person?: Personnel): PersonnelDeptCategory | null => {
    if (!person) return null;

    const personWithDept = person as Personnel & { department?: Department | string | null };
    const rawDept = person.activeDepartment || personWithDept.department || person.departments?.[0];
    if (!rawDept) return 'OTHER';

    const deptId = typeof rawDept === 'object' ? String(rawDept._id || '') : String(rawDept);
    const matchedDept = departments.find((d) => String(d._id) === deptId);
    const deptName = (
      (typeof rawDept === 'object' && rawDept.name) ||
      matchedDept?.name ||
      ''
    ).trim();

    const bureauOrdreId =
      typeof orgSettings?.bureauOrdreDepartmentId === 'object' && orgSettings.bureauOrdreDepartmentId
        ? String(orgSettings.bureauOrdreDepartmentId._id)
        : String(orgSettings?.bureauOrdreDepartmentId || '');

    const bureauDirecteurId =
      typeof orgSettings?.bureauDirecteurDepartmentId === 'object' && orgSettings.bureauDirecteurDepartmentId
        ? String(orgSettings.bureauDirecteurDepartmentId._id)
        : String(orgSettings?.bureauDirecteurDepartmentId || '');

    if (deptId && bureauOrdreId && deptId === bureauOrdreId) {
      return 'BO';
    }
    if (deptId && bureauDirecteurId && deptId === bureauDirecteurId) {
      return 'DIRECTION';
    }

    const normalizedName = deptName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, "'");

    if (
      normalizedName.includes("bureau d'ordre") ||
      normalizedName.includes('bureau ordre') ||
      normalizedName === 'bo' ||
      /\bbo\b/.test(normalizedName) ||
      deptName.includes('مكتب الضبط')
    ) {
      return 'BO';
    }

    if (
      normalizedName.includes('bureau directeur') ||
      normalizedName === 'direction' ||
      normalizedName.includes('direction generale') ||
      deptName.includes('مكتب المدير') ||
      deptName.includes('الإدارة العامة')
    ) {
      return 'DIRECTION';
    }

    return 'OTHER';
  };

  const selectedRole = form.watch('role');
  const selectedDepartments = form.watch('departments') || [];
  const selectedPersonnelId = form.watch('personnelId');
  const selectedPersonnel = useMemo(
    () => personnels.find((p: Personnel) => p._id === selectedPersonnelId),
    [personnels, selectedPersonnelId]
  );

  const selectedPersonnelDeptCategory = getPersonnelDepartmentCategory(selectedPersonnel);
  const lastAutoFilledPersonnelIdRef = useRef<string | null>(null);

  // Auto-sélection du rôle à chaque changement de selectedPersonnel selon son département
  useEffect(() => {
    if (isEditMode || !selectedPersonnel) {
      lastAutoFilledPersonnelIdRef.current = null;
      return;
    }

    const category = getPersonnelDepartmentCategory(selectedPersonnel);
    let targetRole: UserFormData['role'] = 'User';
    let allowedValues: UserFormData['role'][] = ['User', 'AdminDepartment'];

    if (category === 'BO') {
      targetRole = 'AdminTuningDesk';
      allowedValues = ['AdminTuningDesk'];
    } else if (category === 'DIRECTION') {
      targetRole = 'Director';
      allowedValues = ['Director'];
    } else {
      targetRole = 'User';
      allowedValues = ['User', 'AdminDepartment'];
    }

    const currentRole = form.getValues('role');
    const isNewSelection = lastAutoFilledPersonnelIdRef.current !== selectedPersonnel._id;

    if (isNewSelection || !allowedValues.includes(currentRole)) {
      form.setValue('role', targetRole, { shouldValidate: true, shouldDirty: true });
      lastAutoFilledPersonnelIdRef.current = selectedPersonnel._id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersonnel, isEditMode, departments, orgSettings]);

  const availableRoles = () => {
    if (currentUserRole !== 'Admin') {
      return []; // Non-Admin: no roles available
    }

    const allRoles = [
      { value: 'Director', label: 'مدير الإدارة', icon: Shield, badgeClass: 'bg-[#FFD758] text-[#1a202c] border border-[#e2be40] font-bold' },
      { value: 'Admin', label: 'مدير', icon: Shield, badgeClass: 'bg-[#FFCB56] text-[#1a202c] border border-[#e2be40] font-bold' },
      { value: 'AdminDepartment', label: 'مدير قسم', icon: Building, badgeClass: 'bg-[#2c5282] text-white font-medium' },
      { value: 'AdminTuningDesk', label: 'مدير المكتب', icon: Building, badgeClass: 'bg-purple-100 text-purple-900 border border-purple-200 font-semibold' },
      { value: 'User', label: 'مستخدم', icon: User, badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold' }
    ];

    if (!isEditMode && selectedPersonnel) {
      if (selectedPersonnelDeptCategory === 'BO') {
        return allRoles.filter((r) => r.value === 'AdminTuningDesk');
      }
      if (selectedPersonnelDeptCategory === 'DIRECTION') {
        return allRoles.filter((r) => r.value === 'Director');
      }
      return allRoles.filter((r) => r.value === 'User' || r.value === 'AdminDepartment');
    }

    return allRoles;
  };
  
  const availableDepartments = () => {
    if (currentUserRole === 'Admin') {
      return departments;
    } else if (currentUserRole === 'AdminDepartment') {
      return departments.filter(dept => dept._id === currentUserDepartment);
    }
    return [];
  };

  // Obligatoire pour Director, AdminDepartment, AdminTuningDesk, User
  const isPersonnelRequired = ['Director', 'AdminDepartment', 'AdminTuningDesk', 'User'].includes(selectedRole);
  const isTechnicalDirector = selectedRole === 'Director';

  // LOT B : Détection si la fiche Personnel sélectionnée appartient à une unité fonctionnelle
  const isSelectedPersonnelFunctional = selectedPersonnel?.activeDepartment
    ? isFunctionalDepartment(selectedPersonnel.activeDepartment)
    : false;

  // LOT B: Gestion du choix de fiche Personnel avec détection d'unité fonctionnelle
  const handlePersonnelChange = (personnelId: string) => {
    form.setValue('personnelId', personnelId || '', { shouldValidate: true, shouldDirty: true });
    form.clearErrors('personnelId');
    
    if (personnelId) {
      const found = personnels.find((p: Personnel) => p._id === personnelId);
      if (found?.activeDepartment) {
        const deptId = typeof found.activeDepartment === 'object' && found.activeDepartment
          ? (found.activeDepartment as Department)._id
          : String(found.activeDepartment);
        
        // LOT B: Si le département est fonctionnel (Bureau Directeur / Bureau d'Ordre), vider departments. Sinon assigner deptId.
        if (isFunctionalDepartment(found.activeDepartment)) {
          form.setValue('departments', [], { shouldValidate: true, shouldDirty: true });
        } else if (deptId) {
          form.setValue('departments', [deptId], { shouldValidate: true, shouldDirty: true });
        }
      }
    }
  };
  
  const handleSubmit = async (data: UserFormData) => {
    if (data.role === 'AdminTuningDesk') {
      data.departments = [];
    } else if (currentUserRole === 'AdminDepartment' && data.role === 'User') {
      data.departments = [currentUserDepartment];
    }

    if (!isEditMode) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!data.password || !passwordRegex.test(data.password)) {
        form.setError('password', {
          type: 'manual',
          message: 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، تشمل حرفاً كبيراً وحرفاً صغيراً ورقماً.'
        });
        return;
      }
    }

    // Validation du champ personnelId obligatoire pour Director, AdminDepartment, AdminTuningDesk, User
    const isRequired = ['Director', 'AdminDepartment', 'AdminTuningDesk', 'User'].includes(data.role);
    if (!isEditMode && isRequired && !data.personnelId) {
      form.setError('personnelId', {
        type: 'manual',
        message: 'بطاقة الموظف إلزامية لهذا الدور. يرجى اختيار بطاقة من القائمة.'
      });
      return;
    }

    // Vérification préventive d'unicité du compte par personnel
    if (!isEditMode && data.personnelId && takenPersonnelIds.has(String(data.personnelId))) {
      const duplicateMsg = 'Ce personnel possède déjà un compte utilisateur';
      form.setError('personnelId', {
        type: 'manual',
        message: duplicateMsg
      });
      toast.error(duplicateMsg);
      return;
    }

    // Nettoyage de l'ID si vide pour les comptes techniques / optionnels
    if (!data.personnelId) {
      delete data.personnelId;
    }

    try {
      await onSubmit(data);
    } catch (err: unknown) {
      const errorObj = err as {
        response?: {
          status?: number;
          data?: { code?: string; error?: string; message?: string };
        };
      };
      if (
        errorObj?.response?.status === 409 ||
        errorObj?.response?.data?.code === 'PERSONNEL_ALREADY_HAS_ACCOUNT'
      ) {
        const message =
          errorObj?.response?.data?.message ||
          errorObj?.response?.data?.error ||
          'Ce personnel possède déjà un compte utilisateur';
        form.setError('personnelId', {
          type: 'manual',
          message
        });
        toast.error(message);
        return;
      }
      throw err;
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" dir="rtl">
        {/* Basic Information Section */}
        <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
          <CardHeader className="pb-4 border-b border-[#e2e8f0]">
            <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#1a202c]">
              <div className="w-9 h-9 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
                <User className="h-5 w-5" />
              </div>
              <span>المعلومات الأساسية</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Username */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-base font-bold text-[#1a202c] flex items-center gap-2">
                    <User className="h-4 w-4 text-[#2c5282]" />
                    <span>اسم المستخدم</span>
                    <span className="text-red-500 font-bold">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="أدخل اسم المستخدم (مثال: ahmad_ali)"
                      required
                      className="h-11 text-base px-4 bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
                    />
                  </FormControl>
                  <p className="text-sm text-gray-500">اسم فريد يُستخدم لتسجيل الدخول والتعريف في النظام</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Password (only in create mode) */}
            {!isEditMode && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-base font-bold text-[#1a202c] flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#2c5282]" />
                      <span>كلمة المرور</span>
                      <span className="text-red-500 font-bold">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        {...field} 
                        placeholder="أدخل كلمة المرور (8 أحرف على الأقل: كبير، صغير ورقم)"
                        required 
                        className="h-11 text-base px-4 bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
                      />
                    </FormControl>
                    <p className="text-sm text-gray-500">يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، تشمل حرفاً كبيراً وحرفاً صغيراً ورقماً</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Section Fiche Personnel associée */}
        {!isEditMode && (
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="pb-4 border-b border-[#e2e8f0]">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-[#2c5282]" />
                  <span>بطاقة الموظف المرتبطة (Fiche Personnel associée)</span>
                </div>
                {!canManagePersonnel && (
                  <Badge variant="outline" className="bg-[#f7fafc] text-[#5f6b7d] border-[#cbd5e1]">
                    اختيار من قائمة الموظفين
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="pt-6 space-y-4">
              {/* Info : différencier RH vs AdminDepartment */}
              {canManagePersonnel ? (
                <p className="text-sm text-[#4a5568] mb-4">
                  اختر ملف موظف من القائمة أدناه أو أنشئ ملفًا جديدًا
                </p>
              ) : (
                <p className="text-sm text-[#4a5568] mb-4">
                  اختر ملف موظف موجود في قسمك لربطه بهذا الحساب
                </p>
              )}
              
              {/* Sélecteur de personnel (filtré) */}
              <FormField
                control={form.control}
                name="personnelId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-base font-bold text-[#1a202c] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>اختيار ملف الموظف</span>
                        {isPersonnelRequired && <span className="text-red-500 font-bold">*</span>}
                      </span>
                      <span className="text-xs font-normal text-gray-500">
                        {availablePersonnels.length} بطاقة متاحة
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || ''}
                        onValueChange={(val) => handlePersonnelChange(val)}
                      >
                        <SelectTrigger className="h-11 bg-white border-[#cbd5e1] text-right">
                          <SelectValue placeholder="اختر موظفًا" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {isLoadingPersonnel ? (
                            <div className="p-3 text-center text-sm text-[#5f6b7d]">
                              جاري تحميل القائمة...
                            </div>
                          ) : availablePersonnels.length === 0 ? (
                            <div className="p-3 text-center text-sm text-[#5f6b7d]">
                              {personnels.length > 0
                                ? 'جميع الموظفين يمتلكون حسابات مستخدمين مسبقاً'
                                : 'لا يوجد موظفون في قسمك'}
                            </div>
                          ) : (
                            availablePersonnels.map((p) => (
                              <SelectItem key={p._id} value={p._id}>
                                {p.nom} {p.prenom} — {p.cin || 'بدون رقم ب.ت.و'}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    {hiddenPersonnelsCount > 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                        تم إخفاء {hiddenPersonnelsCount} {hiddenPersonnelsCount === 1 ? 'موظف يمتلك' : 'موظفين يمتلكون'} حساب مستخدم مسبقاً (حساب واحد لكل موظف).
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Selected Personnel Details Banner */}
              {selectedPersonnel && (
                <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-3 mt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8f0] pb-2">
                    <span className="text-xs font-bold text-gray-600">
                      تفاصيل البطاقة المختارة:
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-[#ebf4ff] text-[#2c5282] border border-[#bee3f8]">
                      بطاقة محددة للربط
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-gray-500 block">الاسم الكامل:</span>
                      <span className="font-bold text-[#1a202c]">
                        {selectedPersonnel.nom} {selectedPersonnel.prenom}
                      </span>
                    </div>
                    {selectedPersonnel.cin && (
                      <div>
                        <span className="text-xs text-gray-500 block">رقم البطاقة الوطنية (CIN):</span>
                        <span className="font-mono font-bold text-[#1a202c]">
                          {selectedPersonnel.cin}
                        </span>
                      </div>
                    )}
                    {selectedPersonnel.poste && (
                      <div>
                        <span className="text-xs text-gray-500 block">المنصب / الرتبة:</span>
                        <span className="font-semibold text-[#1a202c]">
                          {selectedPersonnel.poste}
                        </span>
                      </div>
                    )}
                    {selectedPersonnel.activeDepartment && (
                      <div className="sm:col-span-2 md:col-span-3 pt-1">
                        <span className="text-xs text-gray-500 block">القسم الإداري:</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-[#2c5282] bg-blue-50 px-2.5 py-1 rounded border border-blue-200 text-xs mt-0.5">
                          <Building className="w-3.5 h-3.5" />
                          {typeof selectedPersonnel.activeDepartment === 'object' 
                            ? selectedPersonnel.activeDepartment.name 
                            : String(selectedPersonnel.activeDepartment)}
                        </span>
                        {isSelectedPersonnelFunctional ? (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                            Cet employé appartient à une unité fonctionnelle transversale (Bureau Directeur / Bureau d'Ordre). Le compte n'aura pas de département assigné.
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 mr-2">
                            (تم تحديد هذا القسم تلقائياً أدناه، ويمكن تعديله من قبل الإدارة)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Bouton CRÉER — Visible uniquement pour RH/Admin */}
              {canManagePersonnel && (
                <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard/hr/personnel/new')}
                    className="h-11 w-full gap-2 border-[#2c5282] text-[#2c5282] 
                               hover:bg-[#ebf4ff]"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>إنشاء بطاقة موظف جديدة</span>
                  </Button>
                </div>
              )}
              
              {/* Message pour AdminDepartment sans personnel */}
              {!canManagePersonnel && personnels.length === 0 && !isLoadingPersonnel && (
                <Alert className="mt-4 bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-900">
                    لا يوجد موظفون في قسمك. يرجى التواصل مع إدارة الموارد البشرية 
                    لإنشاء بطاقات الموظفين.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Role & Permissions Section */}
        <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
          <CardHeader className="pb-4 border-b border-[#e2e8f0]">
            <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#1a202c]">
              <div className="w-9 h-9 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <span>الدور والصلاحيات</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-base font-bold text-[#1a202c]">الدور الوظيفي في النظام</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={currentUserRole === 'AdminDepartment'}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
                        <SelectValue placeholder="اختر الدور" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableRoles().map(role => {
                        const IconComponent = role.icon;
                        return (
                          <SelectItem key={role.value} value={role.value} className="text-base py-2.5">
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4 text-[#2c5282]" />
                              <span className="font-medium">{role.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Display selected role as badge */}
            {selectedRole && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                  <span className="text-base font-medium text-gray-700">الدور الحالي المحدد:</span>
                  <Badge className={`${availableRoles().find(r => r.value === selectedRole)?.badgeClass || 'bg-gray-100 text-gray-800'} text-sm px-3 py-1`}>
                    {availableRoles().find(r => r.value === selectedRole)?.label}
                  </Badge>
                </div>
                {selectedRole === 'Director' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>ملاحظة: يُسمح بمدير إدارة واحد فقط. يرجى التأكد من عدم وجود مدير إدارة آخر. (Un seul Directeur est autorisé. Vérifiez qu'aucun autre Directeur n'existe.)</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Departments Section */}
        {selectedRole !== 'AdminTuningDesk' && availableDepartments().length > 0 && (
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="pb-4 border-b border-[#e2e8f0]">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#1a202c]">
                  <div className="w-9 h-9 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
                    <Building className="h-5 w-5" />
                  </div>
                  <span>الأقسام التابعة</span>
                </div>
                {currentUserRole === 'AdminDepartment' && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-800 border-blue-200">
                    محدد لقسمك الحالي
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="departments"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableDepartments().map(department => {
                        const isChecked = field.value?.includes(department._id);
                        return (
                          <div 
                            key={department._id} 
                            className={`flex items-center gap-3 p-3.5 min-h-[52px] rounded border transition-colors duration-150 ${
                              isChecked
                                ? 'bg-blue-50/60 border-[#2c5282]/40'
                                : 'bg-white border-[#cbd5e1] hover:border-gray-400'
                            }`}
                          >
                            <Checkbox 
                              id={`department-${department._id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...(field.value || []), department._id]);
                                } else {
                                  field.onChange((field.value || []).filter((id: string) => id !== department._id));
                                }
                              }}
                              disabled={currentUserRole === 'AdminDepartment'}
                              className="h-5 w-5 data-[state=checked]:bg-[#2c5282] data-[state=checked]:border-[#2c5282]"
                            />
                            <label 
                              htmlFor={`department-${department._id}`}
                              className="flex-1 text-base font-medium text-[#1a202c] cursor-pointer select-none"
                            >
                              {department.name}
                            </label>
                            {isChecked && (
                              <Check className="h-4 w-4 text-[#2c5282] shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {isSelectedPersonnelFunctional && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                        Cet employé appartient à une unité fonctionnelle transversale (Bureau Directeur / Bureau d'Ordre). Le compte n'aura pas de département assigné.
                      </div>
                    )}

                    {selectedDepartments.length > 0 && (
                      <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded">
                        <p className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-700" />
                          تم تحديد {selectedDepartments.length} {selectedDepartments.length === 1 ? 'قسم' : 'أقسام'} لهذا الحساب
                        </p>
                      </div>
                    )}
                    
                    {currentUserRole === 'AdminDepartment' && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
                          المستخدمون المنشؤون من قبل مدير القسم يتم إسنادهم تلقائياً لقسمك النشط.
                        </p>
                      </div>
                    )}
                    
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Active Status - In edit mode for Admin */}
        {isEditMode && currentUserRole === 'Admin' && (
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0 p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="h-5 w-5 data-[state=checked]:bg-[#2c5282] data-[state=checked]:border-[#2c5282]"
                      />
                    </FormControl>
                    <div className="flex-1">
                      <FormLabel className="text-base font-bold text-[#1a202c] cursor-pointer">
                        حساب نشط ومفعل
                      </FormLabel>
                      <p className="text-sm text-gray-500 mt-0.5">
                        يمكن للمستخدم النشط تسجيل الدخول والوصول لكافة الصلاحيات الممنوحة له
                      </p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Form Actions Footer */}
        <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#f8fafc] border border-[#e2e8f0] rounded p-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => window.history.back()}
            className="h-11 px-6 border-[#cbd5e1] hover:bg-gray-100 text-base font-medium rounded text-gray-700 flex items-center justify-center gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            <span>إلغاء والعودة</span>
          </Button>
          
          <div className="flex flex-wrap items-center gap-3">
            {isEditMode && onResetPassword && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onResetPassword}
                disabled={isResettingPassword}
                className="h-11 px-5 border border-[#FFCB56] bg-[#FFCB56]/15 hover:bg-[#FFCB56]/30 text-[#1a202c] font-semibold text-base rounded flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isResettingPassword ? 'animate-spin' : ''}`} />
                <span>إعادة تعيين كلمة المرور</span>
              </Button>
            )}
            
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="h-11 px-8 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-bold rounded shadow-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{isEditMode ? 'حفظ التعديلات' : 'إنشاء المستخدم'}</span>
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Form>
  );
};

export default UserForm;
