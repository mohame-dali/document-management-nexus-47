import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Personnel } from '@/types/hr';
import { Department } from '@/types';
import { createUser } from '@/services/userService';
import { linkUserToPersonnel } from '@/services/hr/personnelApi';
import {
  generateUsername,
  generatePassword,
  suggestRole,
  getRoleArabicLabel,
} from '@/utils/credentialsGenerator';
import { generateUserAccessPdf } from '@/utils/userAccessPdfGenerator';
import {
  Key,
  Copy,
  RefreshCw,
  FileDown,
  UserCheck,
  Shield,
  Building2,
  Check,
} from 'lucide-react';

interface InlineCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnel: Personnel | null;
  departments: Department[];
  orgSettings: {
    nomAdministration?: string;
    bureauDirecteurDepartmentId?: string | { _id?: string } | { toString(): string } | null;
    bureauOrdreDepartmentId?: string | { _id?: string } | { toString(): string } | null;
    rhDepartmentId?: string | { _id?: string } | { toString(): string } | null;
  } | null;
}

export const InlineCreateUserModal: React.FC<InlineCreateUserModalProps> = ({
  isOpen,
  onClose,
  personnel,
  departments,
  orgSettings,
}) => {
  const queryClient = useQueryClient();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Director' | 'AdminTuningDesk' | 'AdminDepartment' | 'User'>('User');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [generatePdf, setGeneratePdf] = useState(true);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

  // Initialize and auto-suggest credentials when modal opens with selected personnel
  useEffect(() => {
    if (isOpen && personnel) {
      const generatedUser = generateUsername(personnel.prenom, personnel.nom);
      const generatedPass = generatePassword(10);
      setUsername(generatedUser);
      setPassword(generatedPass);

      const deptRaw = personnel.activeDepartment;
      const deptId = typeof deptRaw === 'object' && deptRaw !== null
        ? deptRaw._id?.toString()
        : deptRaw?.toString() || '';
      setDepartmentId(deptId);

      const suggested = suggestRole(deptId, orgSettings);
      setRole(suggested);
      setGeneratePdf(true);
      setCopiedField(null);
    }
  }, [isOpen, personnel, orgSettings]);

  const handleRegeneratePassword = () => {
    setPassword(generatePassword(10));
    toast.info('تم إنشاء كلمة مرور جديدة');
  };

  const handleCopy = (text: string, field: 'username' | 'password') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`تم نسخ ${field === 'username' ? 'اسم المستخدم' : 'كلمة المرور'}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Mutation for creating user and linking
  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!personnel) throw new Error('Aucun personnel sélectionné');
      if (!username.trim()) throw new Error('اسم المستخدم مطلوب');
      if (!password.trim()) throw new Error('كلمة المرور مطلوبة');

      // 1. Prepare user creation payload
      const userPayload = {
        username: username.trim(),
        password: password.trim(),
        role,
        departments: departmentId ? [departmentId] : [],
        activeDepartment: departmentId || undefined,
        isActive: true,
      };

      // 2. Call POST /api/users
      const newUser = await createUser(userPayload as any);

      // 3. Call POST /api/hr/personnel/:id/link-user
      if (newUser?._id) {
        await linkUserToPersonnel(personnel._id, newUser._id);
      }

      return newUser;
    },
    onSuccess: async (newUser) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['personnel-list'] });
      queryClient.invalidateQueries({ queryKey: ['personnels-for-user-form'] });
      queryClient.invalidateQueries({ queryKey: ['personnel-en-attente'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });

      toast.success(`تم إنشاء حساب المستخدم (${username}) وربطه بنجاح`);

      // 4. Generate & download PDF badge if requested
      if (generatePdf && personnel) {
        try {
          const dept = departments.find((d) => d._id === departmentId);
          await generateUserAccessPdf([
            {
              prenom: personnel.prenom,
              nom: personnel.nom,
              departmentName: dept?.name || '',
              roleArabicLabel: getRoleArabicLabel(role),
              username: username.trim(),
              password: password.trim(),
              systemUrl: window.location.origin,
              nomAdministration: orgSettings?.nomAdministration || 'الإدارة العامة للتشفير',
            },
          ]);
          toast.success('تم تحميل بطاقة الاتصال بالنظام (PDF)');
        } catch (pdfErr) {
          console.error('Erreur génération PDF:', pdfErr);
          toast.error('تعذر توليد ملف PDF للبطاقة، لكن تم إنشاء الحساب بنجاح');
        }
      }

      onClose();
    },
    onError: (error: any) => {
      console.error('Erreur création utilisateur:', error);
      const msg = error?.response?.data?.message || error?.message || 'فشل في إنشاء حساب المستخدم';
      toast.error(msg);
    },
  });

  if (!personnel) return null;

  const resolvedDept = departments.find((d) => d._id === departmentId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px] text-right" dir="rtl">
        <DialogHeader className="text-right sm:text-right border-b border-[#e2e8f0] pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-[#1a202c]">
            <div className="w-9 h-9 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <span>إنشاء حساب مستخدم سريع للبطاقة</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-[#4a5568] mt-1">
            سيتم إنشاء حساب مستخدم للنظام وربطه تلقائياً ببطاقة الموظف:
            {' '}
            <strong className="text-[#1a202c] font-bold">{personnel.prenom} {personnel.nom}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Personnel Quick Info Banner */}
          <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#2c5282]" />
              <span className="text-gray-600">القسم:</span>
              <span className="font-semibold text-[#1a202c]">
                {resolvedDept?.name || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#2c5282]" />
              <span className="text-gray-600">الرتبة / الخطة:</span>
              <span className="font-semibold text-[#1a202c]">{personnel.poste || '—'}</span>
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="quick-username" className="text-sm font-bold text-[#1a202c]">
              اسم المستخدم (Nom d'utilisateur)
            </Label>
            <div className="relative">
              <Input
                id="quick-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="prenom.nom"
                dir="ltr"
                className="h-10 pl-10 pr-3 font-mono text-sm bg-white border-[#cbd5e1] text-left"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleCopy(username, 'username')}
                className="absolute left-1 top-1 h-8 w-8 text-gray-500 hover:text-[#2c5282]"
                title="نسخ اسم المستخدم"
              >
                {copiedField === 'username' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="quick-password" className="text-sm font-bold text-[#1a202c]">
                كلمة المرور المؤقتة (Mot de passe)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRegeneratePassword}
                className="h-7 px-2 text-xs text-[#2c5282] hover:bg-blue-50 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة توليد</span>
              </Button>
            </div>
            <div className="relative">
              <Input
                id="quick-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="h-10 pl-10 pr-3 font-mono text-sm bg-amber-50/50 border-[#cbd5e1] text-left font-bold text-[#1a202c]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleCopy(password, 'password')}
                className="absolute left-1 top-1 h-8 w-8 text-gray-500 hover:text-[#2c5282]"
                title="نسخ كلمة المرور"
              >
                {copiedField === 'password' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="quick-role" className="text-sm font-bold text-[#1a202c]">
              الدور الوظيفي في النظام (Rôle)
            </Label>
            <Select
              value={role}
              onValueChange={(val: any) => setRole(val)}
            >
              <SelectTrigger id="quick-role" className="h-10 bg-white border-[#cbd5e1] text-right">
                <SelectValue placeholder="اختر الدور" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="Director">مدير الإدارة (Director)</SelectItem>
                <SelectItem value="AdminTuningDesk">مكتب الضبط (AdminTuningDesk)</SelectItem>
                <SelectItem value="AdminDepartment">مدير قسم (AdminDepartment)</SelectItem>
                <SelectItem value="User">موظف عادي (User)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              * تم اقتراح الدور تلقائياً بناءً على تبعية القسم الإداري.
            </p>
          </div>

          {/* Department Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="quick-dept" className="text-sm font-bold text-[#1a202c]">
              القسم الإداري المرتبط
            </Label>
            <Select
              value={departmentId || 'none'}
              onValueChange={(val) => setDepartmentId(val === 'none' ? '' : val)}
            >
              <SelectTrigger id="quick-dept" className="h-10 bg-white border-[#cbd5e1] text-right">
                <SelectValue placeholder="اختر القسم" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="none">بدون قسم محدد (تنسيق عام)</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d._id} value={d._id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Option PDF Checkbox */}
          <div className="pt-2 border-t border-[#e2e8f0]">
            <div className="flex items-center gap-2.5 p-3 bg-blue-50/60 border border-blue-200/80 rounded cursor-pointer">
              <Checkbox
                id="generate-pdf"
                checked={generatePdf}
                onCheckedChange={(checked) => setGeneratePdf(Boolean(checked))}
                className="data-[state=checked]:bg-[#2c5282] data-[state=checked]:border-[#2c5282]"
              />
              <label
                htmlFor="generate-pdf"
                className="text-sm font-medium text-[#1a202c] cursor-pointer flex items-center gap-2 select-none"
              >
                <FileDown className="w-4 h-4 text-[#2c5282]" />
                <span>تحميل بطاقة بيانات الدخول بصيغة PDF فور الحفظ (نصف صفحة A4)</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-[#e2e8f0] pt-4 flex flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createUserMutation.isPending}
            className="h-10 px-5 text-gray-700 border-[#cbd5e1] hover:bg-gray-100"
          >
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={() => createUserMutation.mutate()}
            disabled={createUserMutation.isPending}
            className="h-10 px-6 bg-[#2c5282] hover:bg-[#234269] text-white font-bold gap-2"
          >
            {createUserMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري الإنشاء والربط...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>تأكيد وإنشاء الحساب</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
