import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUser, updateUser, uploadUserPhoto } from '@/services/userService';
import { getDepartments } from '@/services/departmentService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AlertCircle, Upload, ArrowRight, User as UserIcon, Info, Shield } from 'lucide-react';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import UserForm, { UserFormData } from '@/components/users/UserForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Department } from '@/types';

const EditUser: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['users', id],
    queryFn: () => id ? getUser(id) : Promise.reject('No user ID provided'),
    enabled: !!id,
    refetchInterval: 30000,
  });
  
  const { data: departments, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    refetchInterval: 60000,
  });
  
  const updateMutation = useMutation({
    mutationFn: (data: UserFormData) => id ? updateUser(id, data) : Promise.reject('No user ID provided'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      toast.success('تم تحديث المستخدم بنجاح');
      navigate('/dashboard/users');
    },
    onError: (error: unknown) => {
      console.error('Error updating user:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { error?: string } } }).response?.data?.error
        ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : 'فشل في تحديث المستخدم';
      toast.error(errorMsg);
    }
  });
  
  const uploadPhotoMutation = useMutation({
    mutationFn: () => id && photoFile ? uploadUserPhoto(id, photoFile) : Promise.reject('Missing ID or photo'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('تم رفع وتحديث الصورة الشخصية بنجاح');
      setPhotoFile(null);
    },
    onError: (error: unknown) => {
      console.error('Error uploading photo:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { error?: string } } }).response?.data?.error
        ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : 'فشل في رفع الصورة';
      toast.error(errorMsg);
    }
  });
  
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('يرجى اختيار ملف صورة صحيح (JPG, PNG, GIF)');
        return;
      }
      setPhotoFile(file);
    }
  };
  
  const handlePhotoUpload = () => {
    if (photoFile) {
      uploadPhotoMutation.mutate();
    }
  };
  
  const handleSubmit = (data: UserFormData) => {
    updateMutation.mutate(data);
  };

  const canEditUser = () => {
    if (!currentUser || !user) return false;
    
    if (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin') {
      return true;
    }
    
    if (currentUser.role === 'AdminDepartment') {
      const currentUserDeptId = currentUser.activeDepartment?._id;
      const userDeptIds = user.departments?.map((dept: Department) => dept._id) || [];
      return currentUserDeptId && userDeptIds.includes(currentUserDeptId);
    }
    
    return false;
  };

  const getPhotoUrl = (photoPath: string) => {
    if (!photoPath) return '';
    if (photoPath.startsWith('http')) return photoPath;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
    return `${baseUrl}${cleanPath}`;
  };
  
  if (userLoading || departmentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full" dir="rtl">
        <div className="flex flex-col items-center gap-4 p-8 bg-white border border-[#e2e8f0] rounded">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2c5282]"></div>
          <p className="text-base text-gray-600 font-medium">جاري تحميل بيانات المستخدم...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="w-full max-w-[1200px] mx-auto p-6" dir="rtl">
        <div className="bg-red-50 border border-red-200 text-red-800 p-5 rounded flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
          <div>
            <h3 className="font-bold text-base">المستخدم غير موجود</h3>
            <p className="text-sm mt-1">تعذر العثور على الحساب المطلوب في قاعدة البيانات.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!canEditUser()) {
    return (
      <div className="w-full max-w-[1200px] mx-auto p-6" dir="rtl">
        <div className="bg-red-50 border border-red-200 text-red-800 p-5 rounded flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
          <div>
            <h3 className="font-bold text-base">غير مصرح لك بالوصول</h3>
            <p className="text-sm mt-1">ليس لديك الصلاحيات الكافية لتعديل بيانات هذا المستخدم.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
            <UserIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">
              تعديل بيانات المستخدم: <span className="text-[#2c5282]">{user.username}</span>
            </h1>
            <p className="text-base text-gray-600 mt-1">تحديث الدور والصلاحيات والأقسام التابعة للحساب</p>
          </div>
        </div>

        <Link 
          to="/dashboard/users" 
          className="inline-flex items-center gap-2 h-11 px-5 bg-white border border-[#cbd5e1] hover:bg-gray-100 text-[#1a202c] text-base font-medium rounded transition-colors w-fit"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة للمستخدمين</span>
        </Link>
      </div>

      {/* User Photo Section */}
      <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
        <CardHeader className="pb-4 border-b border-[#e2e8f0]">
          <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#1a202c]">
            <div className="w-9 h-9 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
              <Upload className="h-5 w-5" />
            </div>
            <span>الصورة الشخصية للحساب</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-24 w-24 border-2 border-[#cbd5e1] rounded-full overflow-hidden bg-gray-50 shrink-0">
              {user.photo ? (
                <AvatarImage src={getPhotoUrl(user.photo)} alt={user.username} className="object-cover" />
              ) : (
                <AvatarFallback className="text-xl font-bold bg-[#2c5282]/10 text-[#2c5282]">
                  {user.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  id="edit-user-photo"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <label htmlFor="edit-user-photo" className="cursor-pointer">
                  <div className="inline-flex items-center gap-2 h-11 px-5 bg-white hover:bg-amber-50/40 border border-[#cbd5e1] hover:border-[#FFCB56] text-[#1a202c] font-medium text-base rounded transition-colors">
                    <Upload className="h-4 w-4 text-[#2c5282]" />
                    <span>{photoFile ? 'تغيير الصورة المحددة' : 'اختيار صورة جديدة'}</span>
                  </div>
                </label>

                {photoFile && (
                  <Button 
                    type="button" 
                    onClick={handlePhotoUpload} 
                    disabled={uploadPhotoMutation.isPending}
                    className="h-11 px-6 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold rounded shadow-none"
                  >
                    {uploadPhotoMutation.isPending ? 'جاري رفع الصورة...' : 'حفظ الصورة الجديدة'}
                  </Button>
                )}
              </div>

              {photoFile && (
                <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded text-sm text-gray-700">
                  <p className="font-semibold text-[#1a202c]">الصورة المختارة: {photoFile.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">الحجم: {(photoFile.size / 1024 / 1024).toFixed(2)} ميجابايت</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Information Summary Card */}
      <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
        <CardHeader className="pb-4 border-b border-[#e2e8f0]">
          <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#1a202c]">
            <div className="w-9 h-9 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <span>معلومات الحساب الإضافية</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-base">
            <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-1.5">
              <span className="text-sm font-semibold text-gray-500 block">تاريخ الإنشاء</span>
              <p className="font-medium text-[#1a202c]">{formatArabicDate(user.createdAt)}</p>
            </div>
            
            <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-1.5">
              <span className="text-sm font-semibold text-gray-500 block">الحالة الحالية</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                user.isActive 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {user.isActive ? 'حساب نشط' : 'حساب معطل'}
              </span>
            </div>

            <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-1.5">
              <span className="text-sm font-semibold text-gray-500 block">الدور المسجل</span>
              <div>
                {user.role === 'SuperAdmin' || user.role === 'Admin' ? (
                  <Badge className="bg-[#FFD758] text-[#1a202c] border border-[#e2be40] font-bold text-xs px-2.5 py-0.5">
                    {user.role === 'SuperAdmin' ? 'مدير أعلى' : 'مدير'}
                  </Badge>
                ) : user.role === 'AdminDepartment' ? (
                  <Badge className="bg-[#2c5282] text-white font-medium text-xs px-2.5 py-0.5">
                    مدير قسم
                  </Badge>
                ) : user.role === 'AdminTuningDesk' ? (
                  <Badge className="bg-purple-100 text-purple-900 border border-purple-200 font-semibold text-xs px-2.5 py-0.5">
                    مدير المكتب
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800 border border-gray-200 font-medium text-xs px-2.5 py-0.5">
                    مستخدم
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-1.5">
              <span className="text-sm font-semibold text-gray-500 block">الأقسام المرتبطة</span>
              <p className="font-medium text-[#1a202c] truncate">
                {user.departments && user.departments.length > 0 
                  ? user.departments.map((d: Department) => d.name).join('، ')
                  : 'لا يوجد قسم محدد'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* User Form */}
      <UserForm 
        user={user}
        onSubmit={handleSubmit} 
        isSubmitting={updateMutation.isPending} 
        departments={departments || []}
        currentUserRole={currentUser?.role || ''}
        currentUserDepartment={
          typeof currentUser?.activeDepartment === 'object' && currentUser?.activeDepartment
            ? currentUser.activeDepartment._id
            : (currentUser?.activeDepartment as string) || ''
        }
      />
    </div>
  );
};

export default EditUser;
