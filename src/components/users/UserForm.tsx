
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
import { RefreshCw, ArrowLeft, User, Shield, Building, Check, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Department {
  _id: string;
  name: string;
}

interface UserFormProps {
  user?: any;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  departments: Department[];
  currentUserRole: string;
  currentUserDepartment: string;
  onResetPassword?: () => void;
  isResettingPassword?: boolean;
}

const UserForm = ({ 
  user, 
  onSubmit, 
  isSubmitting, 
  departments, 
  currentUserRole, 
  currentUserDepartment,
  onResetPassword,
  isResettingPassword
}: UserFormProps) => {
  const isEditMode = !!user;
  
  const form = useForm({
    defaultValues: {
      username: user?.username || '',
      password: '',
      role: user?.role || 'User',
      departments: user?.departments?.map((d: any) => d._id) || [],
      isActive: user?.isActive !== undefined ? user.isActive : true
    }
  });
  
  const availableRoles = () => {
    if (currentUserRole === 'Admin') {
      return [
        { value: 'SuperAdmin', label: 'مدير أعلى', icon: Shield, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
        { value: 'Admin', label: 'مدير', icon: Shield, color: 'bg-red-100 text-red-800 border-red-200' },
        { value: 'AdminDepartment', label: 'مدير قسم', icon: Building, color: 'bg-blue-100 text-blue-800 border-blue-200' },
        { value: 'AdminTuningDesk', label: 'مدير المكتب', icon: Building, color: 'bg-purple-100 text-purple-800 border-purple-200' },
        { value: 'User', label: 'مستخدم', icon: User, color: 'bg-green-100 text-green-800 border-green-200' }
      ];
    } else if (currentUserRole === 'SuperAdmin') {
      return [
        { value: 'SuperAdmin', label: 'مدير أعلى', icon: Shield, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
        { value: 'Admin', label: 'مدير', icon: Shield, color: 'bg-red-100 text-red-800 border-red-200' },
        { value: 'AdminDepartment', label: 'مدير قسم', icon: Building, color: 'bg-blue-100 text-blue-800 border-blue-200' },
        { value: 'AdminTuningDesk', label: 'مدير المكتب', icon: Building, color: 'bg-purple-100 text-purple-800 border-purple-200' },
        { value: 'User', label: 'مستخدم', icon: User, color: 'bg-green-100 text-green-800 border-green-200' }
      ];
    } else if (currentUserRole === 'AdminDepartment') {
      return [{ value: 'User', label: 'مستخدم', icon: User, color: 'bg-green-100 text-green-800 border-green-200' }];
    }
    return [{ value: 'User', label: 'مستخدم', icon: User, color: 'bg-green-100 text-green-800 border-green-200' }];
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
  const selectedDepartments = form.watch('departments');
  
  const handleSubmit = (data: any) => {
    if (data.role === 'AdminTuningDesk' || data.role === 'SuperAdmin') {
      data.departments = [];
    } else if (currentUserRole === 'AdminDepartment' && data.role === 'User') {
      data.departments = [currentUserDepartment];
    }
    
    onSubmit(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information Section */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Username */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    اسم المستخدم
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="أدخل اسم المستخدم"
                      required
                      className="text-right bg-white border-slate-300 focus:border-primary focus:ring-primary/20 transition-all duration-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Password (only required in create mode) */}
            {!isEditMode && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      كلمة المرور
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        {...field} 
                        placeholder="أدخل كلمة المرور"
                        required 
                        className="text-right bg-white border-slate-300 focus:border-primary focus:ring-primary/20 transition-all duration-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Role & Permissions Section */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              الدور والصلاحيات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Role */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">الدور</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={currentUserRole === 'AdminDepartment'}
                  >
                    <FormControl>
                      <SelectTrigger className="text-right bg-white border-slate-300 focus:border-primary focus:ring-primary/20 transition-all duration-200">
                        <SelectValue placeholder="اختر الدور" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableRoles().map(role => {
                        const IconComponent = role.icon;
                        return (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              <span>{role.label}</span>
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">الدور المحدد:</span>
                <Badge className={availableRoles().find(r => r.value === selectedRole)?.color}>
                  {availableRoles().find(r => r.value === selectedRole)?.label}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Departments Section */}
        {selectedRole !== 'AdminTuningDesk' && selectedRole !== 'SuperAdmin' && availableDepartments().length > 0 && (
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building className="h-5 w-5 text-green-600" />
                </div>
                <span>الأقسام</span>
                {currentUserRole === 'AdminDepartment' && (
                  <Badge variant="outline" className="text-xs">
                    محدود لقسمك
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="departments"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableDepartments().map(department => (
                        <div 
                          key={department._id} 
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                            field.value.includes(department._id)
                              ? 'bg-primary/5 border-primary/30 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Checkbox 
                            id={`department-${department._id}`}
                            checked={field.value.includes(department._id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, department._id]);
                              } else {
                                field.onChange(field.value.filter((id: string) => id !== department._id));
                              }
                            }}
                            disabled={currentUserRole === 'AdminDepartment'}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <label 
                            htmlFor={`department-${department._id}`}
                            className="flex-1 text-sm font-medium cursor-pointer"
                          >
                            {department.name}
                          </label>
                          {field.value.includes(department._id) && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {selectedDepartments.length > 0 && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 flex items-center gap-2">
                          <Check className="h-4 w-4" />
                          تم تحديد {selectedDepartments.length} قسم
                        </p>
                      </div>
                    )}
                    
                    {currentUserRole === 'AdminDepartment' && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          المستخدمون المنشؤون من قبل مدير القسم يتم تعيينهم تلقائياً لقسمك النشط.
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

        {/* Active Status - Only in edit mode for Admin */}
        {isEditMode && currentUserRole === 'Admin' && (
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </FormControl>
                    <div className="flex-1">
                      <FormLabel className="text-sm font-medium cursor-pointer">
                        حساب نشط
                      </FormLabel>
                      <p className="text-xs text-muted-foreground mt-1">
                        يمكن للمستخدم النشط تسجيل الدخول واستخدام النظام
                      </p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Form Actions */}
        <CardFooter className="flex justify-between bg-slate-50 rounded-lg p-6 border" dir="ltr">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            إلغاء
          </Button>
          <div className="flex space-x-3">
            {isEditMode && onResetPassword && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onResetPassword}
                disabled={isResettingPassword}
                className="flex items-center gap-2"
              >
                {isResettingPassword ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                إعادة تعيين كلمة المرور
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {isEditMode ? 'حفظ التغييرات' : 'إنشاء مستخدم'}
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
