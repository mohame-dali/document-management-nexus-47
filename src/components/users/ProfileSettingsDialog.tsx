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
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            إعدادات الملف الشخصي
          </DialogTitle>
          <DialogDescription className="text-right">
            تحديث كلمة المرور والصورة الشخصية
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="photo" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="photo" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              الصورة الشخصية
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              كلمة المرور
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="photo" className="space-y-4">
            <form onSubmit={handlePhotoSubmit} className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 ring-2 ring-primary/20 shadow-lg">
                    <AvatarImage 
                      src={photoPreview || getUserPhotoUrl(currentUser)} 
                      alt={currentUser.username}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-medium text-lg">
                      {getUserInitials(currentUser.username)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedPhoto && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                      <Upload className="h-3 w-3" />
                    </div>
                  )}
                </div>
                
                <div className="w-full">
                  <Label htmlFor="photo-upload" className="sr-only">
                    اختيار صورة جديدة
                  </Label>
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="file:ml-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG, GIF (حد أقصى 2 ميجابايت)
                  </p>
                </div>
              </div>

              <div className="flex gap-2" dir="ltr">
                <Button type="button" variant="outline" onClick={handleClose}>
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploadPhotoMutation.isPending || !selectedPhoto}
                >
                  {uploadPhotoMutation.isPending ? 'جاري التحديث...' : 'تحديث الصورة'}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="password" className="space-y-4">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الحالية"
                    className="pl-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة"
                    className="pl-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    className="pl-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
                <p>• كلمة المرور يجب أن تكون 6 أحرف على الأقل</p>
                <p>• استخدم مزيج من الأحرف والأرقام لكلمة مرور قوية</p>
              </div>

              <div className="flex gap-2" dir="ltr">
                <Button type="button" variant="outline" onClick={handleClose}>
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  disabled={updatePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                >
                  {updatePasswordMutation.isPending ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
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