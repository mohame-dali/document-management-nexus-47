import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUserWithPhoto } from '@/services/userService';
import { getDepartments } from '@/services/departmentService';
import { linkUserToPersonnel } from '@/services/hr/personnelApi';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Upload, ArrowRight, UserPlus, X, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UserForm, { UserFormData } from '@/components/users/UserForm';

const CreateUser: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const { data: departments, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    refetchInterval: 60000,
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      // 1. Extraire personnelId pour l'envoyer via link-user uniquement
      const { personnelId, ...userData } = data;

      // 2. Création du compte utilisateur
      const newUser = await createUserWithPhoto(userData, photoFile || undefined);

      // 3. Si un personnelId a été envoyé, lier le User à la fiche Personnel
      let linkSuccess = true;
      if (personnelId && newUser?._id) {
        try {
          await linkUserToPersonnel(personnelId, newUser._id);
        } catch (linkError) {
          console.error('Error linking user to personnel:', linkError);
          linkSuccess = false;
        }
      }

      return {
        newUser,
        hasPersonnel: Boolean(personnelId),
        linkSuccess,
      };
    },
    onSuccess: (result) => {
      // Invalider les caches requis
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['personnels-for-user-form'] });
      queryClient.invalidateQueries({ queryKey: ['personnel-en-attente'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'personnel'] });

      if (result.hasPersonnel && !result.linkSuccess) {
        toast.warning(
          "Compte créé, mais l'association à la fiche Personnel a échoué. Veuillez réessayer depuis le module RH."
        );
      } else if (result.hasPersonnel && result.linkSuccess) {
        toast.success('Compte créé et fiche Personnel associée avec succès.');
      } else {
        toast.success('تم إنشاء المستخدم بنجاح');
      }

      navigate('/dashboard/users');
    },
    onError: (error: unknown) => {
      console.error('Error creating user:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { error?: string } } }).response?.data?.error
        ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : 'فشل في إنشاء المستخدم';
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
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPreviewUrl('');
  };
  
  const handleSubmit = (data: UserFormData) => {
    createMutation.mutate(data);
  };
  
  if (departmentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full" dir="rtl">
        <div className="flex flex-col items-center gap-4 p-8 bg-white border border-[#e2e8f0] rounded">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2c5282]"></div>
          <p className="text-base text-gray-600 font-medium">جاري تحميل بيانات الأقسام والصلاحيات...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
            <UserPlus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">إضافة مستخدم جديد</h1>
            <p className="text-base text-gray-600 mt-1">إنشاء حساب مستخدم جديد وتحديد دوره والأقسام التابع لها</p>
          </div>
        </div>

        <Link 
          to="/dashboard/users" 
          className="inline-flex items-center gap-2 h-11 px-5 bg-white border border-[#cbd5e1] hover:bg-gray-100 text-[#1a202c] text-base font-medium rounded transition-colors w-fit"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة لقائمة المستخدمين</span>
        </Link>
      </div>

      {/* Photo Upload Section */}
      <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
        <CardHeader className="pb-4 border-b border-[#e2e8f0]">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#1a202c]">
              <div className="w-9 h-9 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
                <ImageIcon className="h-5 w-5" />
              </div>
              <span>الصورة الشخصية</span>
            </div>
            <span className="text-sm font-semibold bg-gray-100 text-gray-700 px-3 py-1 rounded border border-gray-200">
              اختيارية
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative shrink-0">
              <Avatar className="h-24 w-24 border-2 border-[#cbd5e1] rounded-full overflow-hidden bg-gray-50">
                {previewUrl ? (
                  <img src={previewUrl} alt="معاينة الصورة" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <AvatarFallback className="bg-gray-100 text-gray-500 text-lg font-bold flex flex-col items-center justify-center">
                    <Upload className="h-6 w-6 text-gray-400" />
                  </AvatarFallback>
                )}
              </Avatar>
              {previewUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-11 w-11 rounded-full shadow"
                  onClick={handleRemovePhoto}
                  aria-label="حذف الصورة"
                  title="حذف الصورة"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  id="user-photo-input"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                
                <label htmlFor="user-photo-input" className="cursor-pointer">
                  <div className="inline-flex items-center gap-2 h-11 px-5 bg-white hover:bg-amber-50/40 border border-[#cbd5e1] hover:border-[#FFCB56] text-[#1a202c] font-medium text-base rounded transition-colors">
                    <Upload className="h-4 w-4 text-[#2c5282]" />
                    <span>{photoFile ? 'تغيير الصورة المحددة' : 'اختيار صورة من الجهاز'}</span>
                  </div>
                </label>

                {photoFile && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemovePhoto}
                    className="h-11 px-4 border-[#cbd5e1] text-red-600 hover:bg-red-50 text-base rounded"
                  >
                    إلغاء التحديد
                  </Button>
                )}
              </div>

              {photoFile && (
                <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded text-sm text-gray-700">
                  <p className="font-semibold text-[#1a202c]">{photoFile.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">الحجم: {(photoFile.size / 1024 / 1024).toFixed(2)} ميجابايت</p>
                </div>
              )}
              
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded text-sm text-blue-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2c5282] shrink-0"></span>
                <span>الحد الأقصى المسموح به لحجم الصورة 5 ميجابايت • الصيغ المدعومة: JPG, PNG, GIF</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* User Form Container */}
      <UserForm 
        onSubmit={handleSubmit} 
        isSubmitting={createMutation.isPending} 
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

export default CreateUser;
