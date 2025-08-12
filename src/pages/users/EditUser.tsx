
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUser, updateUser, uploadUserPhoto } from '@/services/userService';
import { getDepartments } from '@/services/departmentService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AlertCircle, Upload, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import UserForm from '@/components/users/UserForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EditUser = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['users', id],
    queryFn: () => id ? getUser(id) : Promise.reject('No user ID provided'),
    enabled: !!id,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
  
  const { data: departments, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    refetchInterval: 60000, // Auto-refresh every minute
  });
  
  const updateMutation = useMutation({
    mutationFn: (data: any) => id ? updateUser(id, data) : Promise.reject('No user ID provided'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      toast.success('تم تحديث المستخدم بنجاح');
      navigate('/dashboard/users');
    },
    onError: (error: any) => {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.error || 'فشل في تحديث المستخدم');
    }
  });
  
  const uploadPhotoMutation = useMutation({
    mutationFn: () => id && photoFile ? uploadUserPhoto(id, photoFile) : Promise.reject('Missing ID or photo'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('تم رفع الصورة بنجاح');
      setPhotoFile(null);
    },
    onError: (error: any) => {
      console.error('Error uploading photo:', error);
      toast.error(error.response?.data?.error || 'فشل في رفع الصورة');
    }
  });
  
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت');
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
  
  const handleSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  // Check if current user can edit this user
  const canEditUser = () => {
    if (!currentUser || !user) return false;
    
    if (currentUser.role === 'Admin') {
      return true; // Admin can edit any user
    }
    
    if (currentUser.role === 'AdminDepartment') {
      // AdminDepartment can edit users in their active department
      const currentUserDeptId = currentUser.activeDepartment?._id;
      const userDeptIds = user.departments.map((dept: any) => dept._id);
      return currentUserDeptId && userDeptIds.includes(currentUserDeptId);
    }
    
    return false;
  };
  
  if (userLoading || departmentsLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <div className="flex">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>المستخدم غير موجود</span>
          </div>
        </div>
      </div>
    );
  }

  if (!canEditUser()) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <div className="flex">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>غير مخول لتعديل هذا المستخدم</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center mb-6">
        <Link to="/dashboard/users" className="inline-flex items-center text-primary hover:text-primary/80 transition-colors ml-4">
          <ArrowLeft className="h-4 w-4 ml-2" />
          العودة للمستخدمين
        </Link>
        <h1 className="text-2xl font-bold">تعديل المستخدم: {user.username}</h1>
      </div>

      {/* User Photo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            صورة المستخدم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 space-x-reverse">
            <Avatar className="h-24 w-24">
              {user.photo ? (
                <AvatarImage src={`${import.meta.env.VITE_API_URL}/${user.photo}`} alt={user.username} />
              ) : (
                <AvatarFallback className="text-lg font-semibold">
                  {user.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                id="photo"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <label htmlFor="photo">
                <Button type="button" variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 ml-2" />
                    اختيار صورة جديدة
                  </span>
                </Button>
              </label>
              {photoFile && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700 mb-2">الصورة المختارة: {photoFile.name}</p>
                  <p className="text-xs text-gray-500 mb-2">الحجم: {(photoFile.size / 1024 / 1024).toFixed(2)} ميجابايت</p>
                  <Button 
                    type="button" 
                    onClick={handlePhotoUpload} 
                    disabled={uploadPhotoMutation.isPending}
                    size="sm"
                  >
                    {uploadPhotoMutation.isPending ? 'جاري الرفع...' : 'رفع الصورة'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Information Section */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات إضافية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="font-medium text-gray-600">تاريخ الإنشاء:</span>
              <p>{formatArabicDate(user.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <span className="font-medium text-gray-600">الحالة:</span>
              <p>
                <span className={`px-2 py-1 rounded-full text-xs ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {user.isActive ? 'نشط' : 'غير نشط'}
                </span>
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-medium text-gray-600">الدور:</span>
              <p>
                {user.role === 'Admin' ? 'مدير' :
                 user.role === 'AdminDepartment' ? 'مدير قسم' :
                 user.role === 'AdminTuningDesk' ? 'مدير المكتب' :
                 'مستخدم'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-medium text-gray-600">الأقسام:</span>
              <p>{user.departments.map((dept: any) => dept.name).join('، ') || 'لا يوجد'}</p>
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
        currentUserDepartment={currentUser?.activeDepartment?._id || ''}
      />
    </div>
  );
};

export default EditUser;
