
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
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] p-6 sm:p-7 bg-white border border-[#e2e8f0] rounded shadow-xl" dir="rtl">
        <DialogHeader className="pb-4 border-b border-[#e2e8f0] text-right">
          <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-[#2c5282]">
            <div className="w-10 h-10 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
              <Key className="h-5 w-5" />
            </div>
            تغيير كلمة المرور
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 text-right mt-1.5">
            تغيير كلمة المرور للمستخدم: <strong className="text-[#1a202c] font-bold">{user.username}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-base font-bold text-[#1a202c]">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
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
            <Label htmlFor="confirmPassword" className="text-base font-bold text-[#1a202c]">تأكيد كلمة المرور</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور للتأكيد"
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
              كلمة المرور يجب أن تتكون من 6 خانات على الأقل
            </p>
            <p className="flex items-center gap-2 font-medium text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
              يُفضل استخدام مزيج متوازن من الحروف والأرقام لضمان حماية أفضل
            </p>
          </div>

          <DialogFooter className="pt-4 border-t border-[#e2e8f0] flex-row-reverse justify-start gap-3">
            <Button 
              type="submit" 
              disabled={updatePasswordMutation.isPending || !newPassword || !confirmPassword}
              className="h-11 px-7 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold rounded shadow-none"
            >
              {updatePasswordMutation.isPending ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="h-11 px-6 border-[#cbd5e1] hover:bg-gray-100 text-base font-medium rounded text-gray-700"
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
