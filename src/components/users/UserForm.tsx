import React from 'react';
import { useForm } from 'react-hook-form';
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
import { RefreshCw, ArrowRight, User, Shield, Building, Check, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Department, User as UserType } from '@/types';

export interface UserFormData {
  username: string;
  password?: string;
  role: 'SuperAdmin' | 'Admin' | 'AdminDepartment' | 'AdminTuningDesk' | 'User';
  departments: string[];
  isActive?: boolean;
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
      isActive: user?.isActive !== undefined ? user.isActive : true
    }
  });
  
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
  
  const handleSubmit = (data: UserFormData) => {
    if (data.role === 'AdminTuningDesk' || data.role === 'SuperAdmin') {
      data.departments = [];
    } else if (currentUserRole === 'AdminDepartment' && data.role === 'User') {
      data.departments = [currentUserDepartment];
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
