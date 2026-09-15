import React from 'react';
import { Link } from 'react-router-dom';
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
import { RefreshCw, ArrowRight, User, Shield, Building, Check, AlertCircle, UserCheck, UserPlus, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Department, User as UserType } from '@/types';
import { getPersonnelEnAttente, getOrganizationSettings } from '@/services/hr/personnelApi';
import { Personnel } from '@/types/hr';

export interface UserFormData {
  username: string;
  password?: string;
  role: 'SuperAdmin' | 'Admin' | 'AdminDepartment' | 'AdminTuningDesk' | 'User';
  departments: string[];
  isActive?: boolean;
  personnelId?: string | null;
}

interface UserFormProps {
  user?: UserType | null;
  onSubmit: (data: UserFormData) => void;
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

  // LOT 7: Récupération des fiches Personnel en attente d'association
  const { data: personnelEnAttente = [], isLoading: loadingPersonnel } = useQuery({
    queryKey: ['personnel-en-attente'],
    queryFn: getPersonnelEnAttente,
    enabled: !isEditMode,
    staleTime: 1000 * 30,
  });

  // LOT B: Charger OrganizationSettings via React Query
  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: 60000,
  });

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
  
  const availableRoles = () => {
    if (currentUserRole === 'Admin') {
      return [
        { value: 'SuperAdmin', label: 'مدير أعلى', icon: Shield, badgeClass: 'bg-[#FFD758] text-[#1a202c] border border-[#e2be40] font-bold' },
        { value: 'Admin', label: 'مدير', icon: Shield, badgeClass: 'bg-[#FFCB56] text-[#1a202c] border border-[#e2be40] font-bold' },
        { value: 'AdminDepartment', label: 'مدير قسم', icon: Building, badgeClass: 'bg-[#2c5282] text-white font-medium' },
        { value: 'AdminTuningDesk', label: 'مدير المكتب', icon: Building, badgeClass: 'bg-purple-100 text-purple-900 border border-purple-200 font-semibold' },
        { value: 'User', label: 'مستخدم', icon: User, badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold' }
      ];
    } else if (currentUserRole === 'SuperAdmin') {
      return [
        { value: 'SuperAdmin', label: 'مدير أعلى', icon: Shield, badgeClass: 'bg-[#FFD758] text-[#1a202c] border border-[#e2be40] font-bold' },
        { value: 'Admin', label: 'مدير', icon: Shield, badgeClass: 'bg-[#FFCB56] text-[#1a202c] border border-[#e2be40] font-bold' },
        { value: 'AdminDepartment', label: 'مدير قسم', icon: Building, badgeClass: 'bg-[#2c5282] text-white font-medium' },
        { value: 'AdminTuningDesk', label: 'مدير المكتب', icon: Building, badgeClass: 'bg-purple-100 text-purple-900 border border-purple-200 font-semibold' },
        { value: 'User', label: 'مستخدم', icon: User, badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold' }
      ];
    } else if (currentUserRole === 'AdminDepartment') {
      return [{ value: 'User', label: 'مستخدم', icon: User, badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold' }];
    }
    return [{ value: 'User', label: 'مستخدم', icon: User, badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold' }];
  };
  
  const availableDepartments = () => {
    if (currentUserRole === 'SuperAdmin' || currentUserRole === 'Admin') {
      return departments;
    } else if (currentUserRole === 'AdminDepartment') {
      return departments.filter(dept => dept._id === currentUserDepartment);
    }
    return [];
  };
  
  const selectedRole = form.watch('role');
  const selectedDepartments = form.watch('departments') || [];
  const selectedPersonnelId = form.watch('personnelId');
  const selectedPersonnel = personnelEnAttente.find((p: Personnel) => p._id === selectedPersonnelId);

  // LOT 7 : obligatoire pour AdminDepartment, AdminTuningDesk, User ; optionnel pour SuperAdmin
  const isPersonnelRequired = ['AdminDepartment', 'AdminTuningDesk', 'User'].includes(selectedRole);
  const isTechnicalSuperAdmin = selectedRole === 'SuperAdmin';

  // LOT B : Détection si la fiche Personnel sélectionnée appartient à une unité fonctionnelle
  const isSelectedPersonnelFunctional = selectedPersonnel?.activeDepartment
    ? isFunctionalDepartment(selectedPersonnel.activeDepartment)
    : false;

  // LOT B: Gestion du choix de fiche Personnel avec détection d'unité fonctionnelle
  const handlePersonnelChange = (personnelId: string) => {
    form.setValue('personnelId', personnelId || '', { shouldValidate: true, shouldDirty: true });
    form.clearErrors('personnelId');
    
    if (personnelId) {
      const found = personnelEnAttente.find((p: Personnel) => p._id === personnelId);
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
  
  const handleSubmit = (data: UserFormData) => {
    if (data.role === 'AdminTuningDesk' || data.role === 'SuperAdmin') {
      data.departments = [];
    } else if (currentUserRole === 'AdminDepartment' && data.role === 'User') {
      data.departments = [currentUserDepartment];
    }

    // Validation du champ personnelId obligatoire pour AdminDepartment, AdminTuningDesk, User
    const isRequired = ['AdminDepartment', 'AdminTuningDesk', 'User'].includes(data.role);
    if (!isEditMode && isRequired && !data.personnelId) {
      form.setError('personnelId', {
        type: 'manual',
        message: 'بطاقة الموظف إلزامية لهذا الدور. يرجى اختيار بطاقة من القائمة.'
      });
      return;
    }

    // Nettoyage de l'ID si vide pour les comptes techniques / optionnels
    if (!data.personnelId) {
      delete data.personnelId;
    }
    
    onSubmit(data);
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
                        placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                        required 
                        className="h-11 text-base px-4 bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
                      />
                    </FormControl>
                    <p className="text-sm text-gray-500">يُفضل استخدام مزيج من الأحرف والأرقام لضمان حماية الحساب</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Fiche Personnel Associée Section (LOT 7) */}
        {!isEditMode && (
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="pb-4 border-b border-[#e2e8f0]">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#1a202c]">
                  <div className="w-9 h-9 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <span>بطاقة الموظف المرتبطة (Fiche Personnel associée)</span>
                </div>
                {isPersonnelRequired ? (
                  <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs px-2.5 py-0.5">
                    إلزامي لهذا الدور *
                  </Badge>
                ) : isTechnicalSuperAdmin ? (
                  <Badge className="bg-gray-100 text-gray-700 border border-gray-300 text-xs px-2.5 py-0.5">
                    حساب تقني (اختياري)
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-700 border border-gray-300 text-xs px-2.5 py-0.5">
                    اختياري
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-gray-600">
                اختر ملف الموظف في طور الانتظار لربطه بهذا الحساب وتعبئة القسم الإداري تلقائياً.
              </p>

              {loadingPersonnel ? (
                <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded text-sm text-gray-600 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#2c5282]" />
                  <span>جاري تحميل بطاقات الموظفين في الانتظار...</span>
                </div>
              ) : personnelEnAttente.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-[#FFCB56] rounded text-[#1a202c] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#1a202c]">
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                    <span>Aucune fiche Personnel en attente. Créez d'abord une fiche via le module RH.</span>
                  </div>
                  <p className="text-xs text-gray-700">
                    لا توجد أي بطاقة موظف بانتظار تفعيل حساب مستخدم حالياً. يرجى إنشاء ملف موظف جديد أولاً عبر وحدة الموارد البشرية.
                  </p>
                  <div className="pt-1">
                    <Link
                      to="/dashboard/hr/personnel/new"
                      className="inline-flex items-center gap-1.5 h-11 px-5 bg-[#2c5282] hover:bg-[#1a365d] text-white text-sm font-bold rounded transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>إنشاء بطاقة موظف جديدة (Créer une fiche Personnel)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
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
                          {personnelEnAttente.length} بطاقة متاحة للربط
                        </span>
                      </FormLabel>
                      <FormControl>
                        <select
                          value={field.value || ''}
                          onChange={(e) => handlePersonnelChange(e.target.value)}
                          className="w-full h-11 px-4 text-base bg-white border border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] text-[#1a202c]"
                        >
                          <option value="">
                            {isPersonnelRequired 
                              ? '-- اختر بطاقة الموظف من القائمة (إلزامي) --' 
                              : '-- بدون ربط بملف موظف (اختياري) --'}
                          </option>
                          {personnelEnAttente.map((p: Personnel) => {
                            const label = `${p.nom} ${p.prenom}${p.cin ? ` — ${p.cin}` : ''}${p.poste ? ` — ${p.poste}` : ''}`;
                            return (
                              <option key={p._id} value={p._id}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Selected Personnel Details Banner */}
              {selectedPersonnel && (
                <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8f0] pb-2">
                    <span className="text-xs font-bold text-gray-600">
                      تفاصيل البطاقة المختارة:
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-[#FFCB56] text-[#1a202c] border border-[#e2be40]">
                      بطاقة في الانتظار (En attente)
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
                        <span className="text-xs text-gray-500 block">القسم الإداري الأصلي:</span>
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
                    defaultValue={field.value}
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
              <div className="flex items-center gap-3 p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                <span className="text-base font-medium text-gray-700">الدور الحالي المحدد:</span>
                <Badge className={`${availableRoles().find(r => r.value === selectedRole)?.badgeClass || 'bg-gray-100 text-gray-800'} text-sm px-3 py-1`}>
                  {availableRoles().find(r => r.value === selectedRole)?.label}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Departments Section */}
        {selectedRole !== 'AdminTuningDesk' && selectedRole !== 'SuperAdmin' && availableDepartments().length > 0 && (
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
