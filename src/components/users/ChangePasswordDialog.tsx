
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserPassword } from '@/services/userService';
import { User } from '@/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Key } from 'lucide-react';

interface ChangePasswordDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  user,
  open,
  onOpenChange
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const queryClient = useQueryClient();

  const updatePasswordMutation = useMutation({
    mutationFn: () => updateUserPassword(user._id, newPassword),
    onSuccess: () => {
      toast.success('تم تحديث كلمة المرور بنجاح');
      handleClose();
    },
    onError: (error: unknown) => {
      console.error('Error updating password:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { error?: string } } }).response?.data?.error
        ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : 'فشل في تحديث كلمة المرور';
      toast.error(errorMsg);
    }
  });

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] p-6 sm:p-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-lg">
        <DialogHeader className="pb-4 border-b border-slate-200/80 dark:border-slate-800 text-right">
          <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-[#2c5282] dark:text-sky-300">
            <div className="w-10 h-10 rounded-lg bg-[#2c5282]/10 dark:bg-sky-950/60 text-[#2c5282] dark:text-sky-400 border border-[#2c5282]/20 dark:border-sky-800/70 flex items-center justify-center shrink-0">
              <Key className="h-5 w-5" />
            </div>
            تغيير كلمة المرور
          </DialogTitle>
          <DialogDescription className="text-base text-slate-700 dark:text-slate-300 text-right mt-1.5">
            تغيير كلمة المرور للمستخدم: <strong className="text-[#1a202c] dark:text-slate-100 font-bold">{user.username}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-base font-bold text-[#1a202c] dark:text-slate-100">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
                className="h-12 text-base pl-12 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:border-[#2c5282] dark:focus:border-sky-400"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-1 top-1 bottom-1 px-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-base font-bold text-[#1a202c] dark:text-slate-100">تأكيد كلمة المرور</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور للتأكيد"
                className="h-12 text-base pl-12 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:border-[#2c5282] dark:focus:border-sky-400"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-1 top-1 bottom-1 px-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
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

          <div className="text-sm text-slate-700 dark:text-slate-200 bg-slate-50/90 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1">
            <p className="flex items-center gap-2 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2c5282] dark:bg-sky-400 inline-block"></span>
              كلمة المرور يجب أن تتكون من 6 خانات على الأقل
            </p>
            <p className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 inline-block"></span>
              يُفضل استخدام مزيج متوازن من الحروف والأرقام لضمان حماية أفضل
            </p>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex-row-reverse justify-start gap-3">
            <Button 
              type="submit" 
              disabled={updatePasswordMutation.isPending || !newPassword || !confirmPassword}
              className="h-11 px-7 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold rounded-lg shadow-none"
            >
              {updatePasswordMutation.isPending ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="h-11 px-6 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-base font-medium rounded-lg text-slate-700 dark:text-slate-200"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
