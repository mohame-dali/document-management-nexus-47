import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadUserPhoto } from '@/services/userService';
import { updatePassword } from '@/services/authService';
import { User } from '@/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Key, User as UserIcon, Camera, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProfileSettingsDialog: React.FC<ProfileSettingsDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { currentUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const updatePasswordMutation = useMutation({
    mutationFn: () => updatePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('تم تحديث كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      console.error('Error updating password:', error);
      toast.error(error.response?.data?.error || 'فشل في تحديث كلمة المرور');
    }
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (photoFile: File) => uploadUserPhoto(currentUser!._id, photoFile),
    onSuccess: () => {
      toast.success('تم تحديث الصورة الشخصية بنجاح');
      setSelectedPhoto(null);
      setPhotoPreview(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Refresh the page to update the sidebar photo
      window.location.reload();
    },
    onError: (error: any) => {
      console.error('Error uploading photo:', error);
      toast.error(error.response?.data?.error || 'فشل في تحديث الصورة الشخصية');
    }
  });

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setSelectedPhoto(null);
    setPhotoPreview(null);
    onOpenChange(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword.trim()) {
      toast.error('يرجى إدخال كلمة المرور الحالية');
      return;
    }
    
    if (!newPassword.trim()) {
      toast.error('يرجى إدخال كلمة المرور الجديدة');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور وتأكيدها غير متطابقين');
      return;
    }
    
    updatePasswordMutation.mutate();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('يرجى اختيار ملف صورة صالح');
        return;
      }

      setSelectedPhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPhoto) {
      toast.error('يرجى اختيار صورة');
      return;
    }
    
    uploadPhotoMutation.mutate(selectedPhoto);
  };

  const getUserPhotoUrl = (user: User) => {
    if (user?.photo) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const photoPath = user.photo.startsWith('/') ? user.photo.slice(1) : user.photo;
      return `${API_URL}/${photoPath}`;
    }
    return null;
  };

  const getUserInitials = (username: string) => {
    return username ? username.charAt(0).toUpperCase() : 'U';
  };

  if (!currentUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] p-6 sm:p-7 bg-white border border-[#e2e8f0] rounded shadow-xl" dir="rtl">
        <DialogHeader className="pb-4 border-b border-[#e2e8f0] text-right">
          <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-[#2c5282]">
            <div className="w-10 h-10 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
              <UserIcon className="h-5 w-5" />
            </div>
            إعدادات الملف الشخصي
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 text-right mt-1.5">
            تحديث كلمة المرور والصورة الشخصية للمستخدم <strong className="text-[#1a202c] font-bold">{currentUser.username}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="photo" className="w-full pt-2">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-gray-100 p-1 rounded">
            <TabsTrigger value="photo" className="flex items-center justify-center gap-2 text-base font-bold data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm">
              <Camera className="h-5 w-5" />
              الصورة الشخصية
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center justify-center gap-2 text-base font-bold data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm">
              <Key className="h-5 w-5" />
              كلمة المرور
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="photo" className="space-y-6 pt-4">
            <form onSubmit={handlePhotoSubmit} className="space-y-6">
              <div className="flex flex-col items-center space-y-5 p-6 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                <div className="relative">
                  <Avatar className="h-28 w-28 ring-4 ring-white shadow-md">
                    <AvatarImage 
                      src={photoPreview || getUserPhotoUrl(currentUser) || undefined} 
                      alt={currentUser.username}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-[#2c5282]/10 text-[#2c5282] font-bold text-2xl">
                      {getUserInitials(currentUser.username)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedPhoto && (
                    <div className="absolute -top-1 -right-1 bg-emerald-600 text-white rounded-full p-1.5 shadow">
                      <Upload className="h-4 w-4" />
                    </div>
                  )}
                </div>
                
                <div className="w-full text-center">
                  <Label htmlFor="photo-upload" className="sr-only">
                    اختيار صورة جديدة
                  </Label>
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="h-12 text-base file:ml-4 file:py-2.5 file:px-4 file:rounded file:border-0 file:text-sm file:font-bold file:bg-[#2c5282] file:text-white hover:file:bg-[#234269] bg-white border-[#cbd5e1]"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    JPG, PNG, GIF (الحد الأقصى المسموح به 2 ميجابايت)
                  </p>
                </div>
              </div>

              <div className="flex flex-row-reverse justify-start gap-3 pt-4 border-t border-[#e2e8f0]">
                <Button 
                  type="submit" 
                  disabled={uploadPhotoMutation.isPending || !selectedPhoto}
                  className="h-11 px-7 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold rounded shadow-none"
                >
                  {uploadPhotoMutation.isPending ? 'جاري التحديث...' : 'تحديث الصورة'}
                </Button>
                <Button type="button" variant="outline" onClick={handleClose} className="h-11 px-6 border-[#cbd5e1] hover:bg-gray-100 text-base font-medium rounded text-gray-700">
                  إلغاء
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="password" className="space-y-5 pt-4">
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-base font-bold text-[#1a202c]">كلمة المرور الحالية</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الحالية"
                    className="h-12 text-base pl-12 bg-white border-[#cbd5e1] rounded focus:border-[#2c5282]"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-1 top-1 bottom-1 px-3 hover:bg-gray-100 rounded text-gray-500"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-base font-bold text-[#1a202c]">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة"
                    className="h-12 text-base pl-12 bg-white border-[#cbd5e1] rounded focus:border-[#2c5282]"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-1 top-1 bottom-1 px-3 hover:bg-gray-100 rounded text-gray-500"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-base font-bold text-[#1a202c]">تأكيد كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور الجديدة للتأكيد"
                    className="h-12 text-base pl-12 bg-white border-[#cbd5e1] rounded focus:border-[#2c5282]"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-1 top-1 bottom-1 px-3 hover:bg-gray-100 rounded text-gray-500"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-gray-700 bg-[#f8fafc] p-4 rounded border border-[#e2e8f0] space-y-1">
                <p className="flex items-center gap-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2c5282] inline-block"></span>
                  كلمة المرور يجب أن تكون 6 أحرف على الأقل
                </p>
                <p className="flex items-center gap-2 font-medium text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
                  استخدم مزيجاً من الأحرف والأرقام لكلمة مرور قوية
                </p>
              </div>

              <div className="flex flex-row-reverse justify-start gap-3 pt-4 border-t border-[#e2e8f0]">
                <Button 
                  type="submit" 
                  disabled={updatePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                  className="h-11 px-7 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold rounded shadow-none"
                >
                  {updatePasswordMutation.isPending ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                </Button>
                <Button type="button" variant="outline" onClick={handleClose} className="h-11 px-6 border-[#cbd5e1] hover:bg-gray-100 text-base font-medium rounded text-gray-700">
                  إلغاء
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSettingsDialog;