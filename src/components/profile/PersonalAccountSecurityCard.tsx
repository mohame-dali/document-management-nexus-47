import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, Eye, EyeOff, Key, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { uploadUserPhoto } from '@/services/userService';
import { updatePassword } from '@/services/authService';
import { formatLongDate } from '@/utils/formatDate';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PersonalAccountSecurityCardProps {
  openPasswordOnMount?: boolean;
}

export const PersonalAccountSecurityCard: React.FC<PersonalAccountSecurityCardProps> = ({
  openPasswordOnMount = false,
}) => {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const { dir } = useDirection();
  const isRTL = language !== 'fr';
  const queryClient = useQueryClient();

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(openPasswordOnMount);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (openPasswordOnMount) {
      setIsPasswordModalOpen(true);
    }
  }, [openPasswordOnMount]);

  const uploadPhotoMutation = useMutation({
    mutationFn: (file: File) => {
      if (!currentUser?._id) {
        throw new Error(isRTL ? 'لا يوجد مستخدم مسجل' : 'Aucun utilisateur connecté');
      }
      return uploadUserPhoto(currentUser._id, file);
    },
    onSuccess: () => {
      toast.success(
        isRTL ? 'تم تحديث الصورة الشخصية بنجاح' : 'Photo de profil mise à jour avec succès'
      );
      setSelectedPhoto(null);
      setPhotoPreview(null);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'my-profile'] });
    },
    onError: (err: unknown) => {
      const errResp = err as { response?: { data?: { error?: string } } };
      toast.error(
        errResp?.response?.data?.error ||
          (isRTL ? 'فشل في تحديث الصورة الشخصية' : 'Échec de la mise à jour de la photo')
      );
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: () => updatePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success(
        isRTL ? 'تم تحديث كلمة المرور بنجاح' : 'Mot de passe mis à jour avec succès'
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordModalOpen(false);
    },
    onError: (err: unknown) => {
      const errResp = err as { response?: { data?: { error?: string } } };
      toast.error(
        errResp?.response?.data?.error ||
          (isRTL ? 'فشل في تغيير كلمة المرور' : 'Échec de la modification du mot de passe')
      );
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        isRTL
          ? 'حجم الصورة يجب أن لا يتجاوز 5 ميغابايت'
          : 'La taille de la photo ne doit pas dépasser 5 Mo'
      );
      return;
    }
    setSelectedPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error(
        isRTL ? 'يرجى إدخال كلمة المرور الحالية' : 'Veuillez saisir votre mot de passe actuel'
      );
      return;
    }
    if (newPassword.length < 6) {
      toast.error(
        isRTL
          ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'
          : 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(
        isRTL
          ? 'كلمة المرور الجديدة غير متطابقة مع تأكيد كلمة المرور'
          : 'Les nouveaux mots de passe ne correspondent pas'
      );
      return;
    }
    updatePasswordMutation.mutate();
  };

  if (!currentUser) return null;

  const roleLabelKey = `roles.${currentUser.role}`;
  const translatedRole = t(roleLabelKey);
  const roleDisplay = translatedRole !== roleLabelKey ? translatedRole : currentUser.role;

  const resolvePhotoUrl = () => {
    if (photoPreview) return photoPreview;
    if (!currentUser.photo) return undefined;
    if (currentUser.photo.startsWith('http') || currentUser.photo.startsWith('data:')) {
      return currentUser.photo;
    }
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
    const cleanPath = currentUser.photo.startsWith('/')
      ? currentUser.photo
      : `/${currentUser.photo}`;
    return `${apiBase}${cleanPath}`;
  };

  return (
    <section
      id="account-security"
      dir={dir}
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-[#2c5282] dark:text-blue-400 shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isRTL ? 'حساب الدخول والأمان الشخصي' : 'Compte utilisateur et sécurité personnelle'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {isRTL
                ? 'تحديث الصورة الشخصية ومراجعة بيانات الدخول وتغيير كلمة المرور'
                : 'Gérer votre photo de profil, vos informations de connexion et votre mot de passe'}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setIsPasswordModalOpen(true)}
          className="h-10 px-4 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg shrink-0 gap-2 whitespace-nowrap self-start sm:self-center"
        >
          <Key className="h-4 w-4" />
          <span>{isRTL ? 'تغيير كلمة المرور' : 'Changer le mot de passe'}</span>
        </Button>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Avatar & Photo Upload */}
        <div className="flex flex-col items-center text-center gap-4 p-5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <Avatar className="h-24 w-24 border-2 border-[#2c5282] dark:border-blue-500">
            <AvatarImage src={resolvePhotoUrl()} alt={currentUser.username} />
            <AvatarFallback className="bg-[#2c5282] text-white text-xl font-bold">
              {currentUser.username ? currentUser.username.slice(0, 2).toUpperCase() : 'US'}
            </AvatarFallback>
          </Avatar>

          <div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
              {currentUser.username}
            </p>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
              {roleDisplay}
            </p>
          </div>

          <div className="w-full space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
            <input
              type="file"
              id="profile-user-photo-input"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('profile-user-photo-input')?.click()}
              className="w-full h-10 text-sm font-semibold border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-lg gap-2"
            >
              <Camera className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
              <span>{isRTL ? 'تغيير الصورة الشخصية' : 'Changer la photo'}</span>
            </Button>

            {selectedPhoto && (
              <Button
                type="button"
                onClick={() => uploadPhotoMutation.mutate(selectedPhoto)}
                disabled={uploadPhotoMutation.isPending}
                className="w-full h-10 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg"
              >
                {uploadPhotoMutation.isPending
                  ? isRTL
                    ? 'جاري الحفظ...'
                    : 'Enregistrement...'
                  : isRTL
                    ? 'حفظ الصورة الجديدة'
                    : 'Enregistrer la photo'}
              </Button>
            )}
          </div>
        </div>

        {/* Account Details Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-account-username" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-[#2c5282] dark:text-blue-400" />
              <span>{isRTL ? 'اسم المستخدم' : "Nom d'utilisateur"}</span>
            </Label>
            <Input
              id="profile-account-username"
              value={currentUser.username || ''}
              disabled
              className="h-10 text-sm bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-account-role" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {isRTL ? 'الدور والصلاحية' : 'Rôle et permissions'}
            </Label>
            <Input
              id="profile-account-role"
              value={roleDisplay}
              disabled
              className="h-10 text-sm bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-account-dept" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {isRTL ? 'القسم الحالي النشط' : 'Département actif'}
            </Label>
            <Input
              id="profile-account-dept"
              value={currentUser.activeDepartment?.name || (isRTL ? 'غير محدد' : 'Non spécifié')}
              disabled
              className="h-10 text-sm bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-account-created" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {isRTL ? 'تاريخ إنشاء الحساب' : 'Date de création du compte'}
            </Label>
            <Input
              id="profile-account-created"
              value={
                currentUser.createdAt
                  ? formatLongDate(currentUser.createdAt, isRTL ? 'ar' : 'fr')
                  : isRTL
                    ? 'غير متوفر'
                    : 'Non disponible'
              }
              disabled
              className="h-10 text-sm bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium tabular-nums"
            />
          </div>

          <div className="sm:col-span-2 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span>
              {isRTL
                ? 'ينصح بتغيير كلمة المرور دورياً كل 90 يوماً للحفاظ على سرية حسابك.'
                : 'Il est recommandé de renouveler votre mot de passe tous les 90 jours.'}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent
          dir={dir}
          className="w-[95vw] sm:w-[90vw] sm:max-w-[560px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-lg"
        >
          <DialogHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 text-start">
            <DialogTitle className="text-lg sm:text-xl font-bold text-[#2c5282] dark:text-blue-400 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#2c5282]/10 dark:bg-blue-950/60 flex items-center justify-center text-[#2c5282] dark:text-blue-400 shrink-0">
                <Key className="h-4 w-4" />
              </div>
              <span>{isRTL ? 'تغيير كلمة المرور' : 'Changer le mot de passe'}</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {isRTL
                ? 'أدخل كلمة المرور الحالية ثم كلمة المرور الجديدة مع تأكيدها'
                : 'Saisissez votre mot de passe actuel puis confirmez le nouveau mot de passe'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-current-password" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isRTL ? 'كلمة المرور الحالية' : 'Mot de passe actuel'}{' '}
                <span className="text-red-600">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="profile-current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={isRTL ? 'أدخل كلمة المرور الحالية' : 'Mot de passe actuel'}
                  className="h-10 text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg pe-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-300 hover:text-[#2c5282]"
                  aria-label={isRTL ? 'إظهار/إخفاء كلمة المرور' : 'Afficher/masquer'}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-new-password" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isRTL ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'}{' '}
                <span className="text-red-600">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="profile-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={isRTL ? '6 أحرف على الأقل' : 'Minimum 6 caractères'}
                  className="h-10 text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg pe-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-300 hover:text-[#2c5282]"
                  aria-label={isRTL ? 'إظهار/إخفاء كلمة المرور' : 'Afficher/masquer'}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-confirm-password" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isRTL ? 'تأكيد كلمة المرور الجديدة' : 'Confirmer le nouveau mot de passe'}{' '}
                <span className="text-red-600">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="profile-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={
                    isRTL ? 'أعد كتابة كلمة المرور الجديدة' : 'Saisissez à nouveau le mot de passe'
                  }
                  className="h-10 text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg pe-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-300 hover:text-[#2c5282]"
                  aria-label={isRTL ? 'إظهار/إخفاء كلمة المرور' : 'Afficher/masquer'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordModalOpen(false)}
                className="h-10 px-5 rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium"
              >
                {isRTL ? 'إلغاء' : 'Annuler'}
              </Button>
              <Button
                type="submit"
                disabled={updatePasswordMutation.isPending}
                className="h-10 px-6 rounded-lg bg-[#2c5282] hover:bg-[#234269] text-white text-sm font-semibold"
              >
                {updatePasswordMutation.isPending
                  ? isRTL
                    ? 'جاري التحديث...'
                    : 'Mise à jour...'
                  : isRTL
                    ? 'تأكيد التغيير'
                    : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PersonalAccountSecurityCard;
