
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUserWithPhoto } from '@/services/userService';
import { getDepartments } from '@/services/departmentService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Upload, ArrowLeft, UserPlus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UserForm from '@/components/users/UserForm';

const CreateUser = () => {
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
    mutationFn: (data: any) => createUserWithPhoto(data, photoFile || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('تم إنشاء المستخدم بنجاح');
      navigate('/dashboard/users');
    },
    onError: (error: any) => {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.error || 'فشل في إنشاء المستخدم');
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
        toast.error('يرجى اختيار ملف صورة صحيح');
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
  
  const handleSubmit = (data: any) => {
    createMutation.mutate(data);
  };
  
  if (departmentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/dashboard/users" 
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors bg-white rounded-lg px-4 py-2 shadow-sm border hover:shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-medium">العودة للمستخدمين</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">إضافة مستخدم جديد</h1>
              <p className="text-muted-foreground mt-1">قم بإنشاء حساب مستخدم جديد في النظام</p>
            </div>
          </div>
        </div>

        {/* Photo Upload Section */}
        <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 hover:border-primary/30 transition-colors">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <span>صورة المستخدم</span>
              <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">اختيارية</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-28 w-28 border-4 border-white shadow-lg">
                  {previewUrl ? (
                    <img src={previewUrl} alt="معاينة" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-primary/20 to-primary/30 text-primary border-primary/20">
                      <Upload className="h-8 w-8 text-primary/60" />
                    </AvatarFallback>
                  )}
                </Avatar>
                {previewUrl && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-lg"
                    onClick={handleRemovePhoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex-1 space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  id="photo"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                
                <label htmlFor="photo">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="bg-white hover:bg-primary/5 border-primary/20 hover:border-primary/40 transition-all duration-200" 
                    asChild
                  >
                    <span className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      {photoFile ? 'تغيير الصورة' : 'اختيار صورة'}
                    </span>
                  </Button>
                </label>
                
                {photoFile && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-primary/10 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Upload className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{photoFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            الحجم: {(photoFile.size / 1024 / 1024).toFixed(2)} ميجابايت
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-blue-700 flex items-center gap-2">
                    <div className="h-1 w-1 bg-blue-500 rounded-full"></div>
                    الحد الأقصى للحجم: 5 ميجابايت
                  </p>
                  <p className="text-xs text-blue-700 flex items-center gap-2 mt-1">
                    <div className="h-1 w-1 bg-blue-500 rounded-full"></div>
                    الصيغ المدعومة: JPG, PNG, GIF
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* User Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <UserForm 
            onSubmit={handleSubmit} 
            isSubmitting={createMutation.isPending} 
            departments={departments || []}
            currentUserRole={currentUser?.role || ''}
            currentUserDepartment={currentUser?.activeDepartment?._id || ''}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateUser;
