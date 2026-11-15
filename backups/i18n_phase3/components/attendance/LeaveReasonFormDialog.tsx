import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LeaveReason,
  LeaveReasonFormData,
  createLeaveReason,
  updateLeaveReason,
} from '@/services/leaveReasonService';
import { toast } from 'sonner';
import { Loader2, Sparkles, Tag, Settings2, Palette, ToggleLeft } from 'lucide-react';

interface LeaveReasonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: LeaveReason | null;
  onSuccess: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'conge', label: 'عطلة (Congé)' },
  { value: 'mission', label: 'مهمة (Mission)' },
  { value: 'formation', label: 'تكوين (Formation)' },
  { value: 'service', label: 'خدمة (Service)' },
  { value: 'autre', label: 'أخرى (Autre)' },
];

export const LeaveReasonFormDialog: React.FC<LeaveReasonFormDialogProps> = ({
  open,
  onOpenChange,
  reason,
  onSuccess,
}) => {
  const isEditing = Boolean(reason);

  const [formData, setFormData] = useState<LeaveReasonFormData>({
    code: '',
    labelAr: '',
    labelFr: '',
    category: 'conge',
    impacteSolde: false,
    description: '',
    requiresDocument: false,
    requiresServiceName: false,
    requiresLieu: false,
    requiresFormationDetails: false,
    color: '#ebf8f1',
    icon: 'Calendar',
    order: 100,
    isActive: true,
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (reason) {
      setFormData({
        code: reason.code,
        labelAr: reason.labelAr,
        labelFr: reason.labelFr || '',
        category: reason.category,
        impacteSolde: reason.impacteSolde,
        description: reason.description || '',
        requiresDocument: Boolean(reason.requiresDocument),
        requiresServiceName: Boolean(reason.requiresServiceName),
        requiresLieu: Boolean(reason.requiresLieu),
        requiresFormationDetails: Boolean(reason.requiresFormationDetails),
        color: reason.color || '#ebf8f1',
        icon: reason.icon || 'Calendar',
        order: reason.order ?? 100,
        isActive: reason.isActive,
      });
    } else {
      setFormData({
        code: '',
        labelAr: '',
        labelFr: '',
        category: 'conge',
        impacteSolde: false,
        description: '',
        requiresDocument: false,
        requiresServiceName: false,
        requiresLieu: false,
        requiresFormationDetails: false,
        color: '#ebf8f1',
        icon: 'Calendar',
        order: 100,
        isActive: true,
      });
    }
  }, [reason, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing && !formData.code?.trim()) {
      toast.error('الرمز التعريفي (Code) إجباري');
      return;
    }

    if (!formData.labelAr?.trim()) {
      toast.error('الاسم بالعربية إجباري');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing && reason) {
        await updateLeaveReason(reason._id, {
          labelAr: formData.labelAr.trim(),
          labelFr: formData.labelFr?.trim(),
          category: formData.category,
          impacteSolde: formData.impacteSolde,
          description: formData.description?.trim(),
          requiresDocument: formData.requiresDocument,
          requiresServiceName: formData.requiresServiceName,
          requiresLieu: formData.requiresLieu,
          requiresFormationDetails: formData.requiresFormationDetails,
          color: formData.color,
          icon: formData.icon?.trim() || null,
          order: Number(formData.order),
          isActive: formData.isActive,
        });
        toast.success('تم تحديث نوع الغياب بنجاح');
      } else {
        await createLeaveReason({
          ...formData,
          code: formData.code?.trim().toLowerCase(),
          labelAr: formData.labelAr.trim(),
          labelFr: formData.labelFr?.trim(),
          description: formData.description?.trim(),
          icon: formData.icon?.trim() || null,
          order: Number(formData.order) || 100,
        });
        toast.success('تم إنشاء نوع الغياب الجديد بنجاح');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'حدث خطأ أثناء حفظ نوع الغياب';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded border border-[#e2e8f0]" dir="rtl">
        <DialogHeader className="p-5 bg-[#f8fafc] border-b border-[#e2e8f0] text-right">
          <DialogTitle className="text-lg font-bold text-[#1a202c] flex items-center gap-2">
            <div className="w-1.5 h-5 bg-[#2c5282] rounded" />
            {isEditing ? 'تعديل نوع الغياب' : 'إضافة نوع غياب جديد'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section 1 — Identification */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#2c5282] border-b border-[#e2e8f0] pb-2">
              <Tag className="h-4 w-4" />
              <h4 className="font-bold text-sm text-[#1a202c]">1. التعريف والبيانات الأساسية</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-semibold text-[#4a5568]">
                  الرمز البرمجي (Code) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={isEditing}
                  placeholder="ex: conge_annuel"
                  className="bg-white border-[#e2e8f0] rounded text-left font-mono text-sm"
                  dir="ltr"
                  required
                />
                {isEditing && (
                  <p className="text-[11px] text-gray-500">لا يمكن تعديل الرمز التعريفي بعد إنشائه.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-semibold text-[#4a5568]">
                  التصنيف (Category) <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(val: any) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger id="category" className="bg-white border-[#e2e8f0] rounded text-right">
                    <SelectValue placeholder="اختر التصنيف" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="labelAr" className="text-xs font-semibold text-[#4a5568]">
                  التسمية بالعربية <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="labelAr"
                  value={formData.labelAr}
                  onChange={(e) => setFormData({ ...formData, labelAr: e.target.value })}
                  placeholder="مثال: عطلة سنوية"
                  className="bg-white border-[#e2e8f0] rounded text-right"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="labelFr" className="text-xs font-semibold text-[#4a5568]">
                  التسمية بالفرنسية (اختياري)
                </Label>
                <Input
                  id="labelFr"
                  value={formData.labelFr}
                  onChange={(e) => setFormData({ ...formData, labelFr: e.target.value })}
                  placeholder="Ex: Congé annuel"
                  className="bg-white border-[#e2e8f0] rounded text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-[#4a5568]">
                الوصف والملاحظات
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="تفاصيل إضافية حول شروط وطبيعة هذا الغياب..."
                className="bg-white border-[#e2e8f0] rounded text-right min-h-[70px]"
              />
            </div>
          </div>

          {/* Section 2 — Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#2c5282] border-b border-[#e2e8f0] pb-2">
              <Settings2 className="h-4 w-4" />
              <h4 className="font-bold text-sm text-[#1a202c]">2. الإعدادات والخصم</h4>
            </div>

            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="impacteSolde" className="text-sm font-bold text-[#1a202c] cursor-pointer">
                    يخصم من رصيد العطل السنوي (Déduit du solde)
                  </Label>
                  <p className="text-xs text-[#718096]">
                    إذا تم التفعيل، سيتم استقطاع أيام هذا الغياب تلقائياً من رصيد العطل السنوية للموظف.
                  </p>
                </div>
                <Switch
                  id="impacteSolde"
                  checked={formData.impacteSolde}
                  onCheckedChange={(checked) => setFormData({ ...formData, impacteSolde: checked })}
                />
              </div>

              <div className="border-t border-[#e2e8f0] pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between bg-white p-2.5 rounded border border-[#e2e8f0]">
                  <Label htmlFor="requiresDoc" className="text-xs font-medium text-[#4a5568] cursor-pointer">
                    يتطلب وثيقة تبرير (شهادة/تقرير)
                  </Label>
                  <Switch
                    id="requiresDoc"
                    checked={formData.requiresDocument}
                    onCheckedChange={(checked) => setFormData({ ...formData, requiresDocument: checked })}
                  />
                </div>

                <div className="flex items-center justify-between bg-white p-2.5 rounded border border-[#e2e8f0]">
                  <Label htmlFor="requiresLieu" className="text-xs font-medium text-[#4a5568] cursor-pointer">
                    يتطلب تحديد المكان (خاص بالمهمات)
                  </Label>
                  <Switch
                    id="requiresLieu"
                    checked={formData.requiresLieu}
                    onCheckedChange={(checked) => setFormData({ ...formData, requiresLieu: checked })}
                  />
                </div>

                <div className="flex items-center justify-between bg-white p-2.5 rounded border border-[#e2e8f0]">
                  <Label htmlFor="requiresService" className="text-xs font-medium text-[#4a5568] cursor-pointer">
                    يتطلب اسم المصلحة (خاص بالخدمة)
                  </Label>
                  <Switch
                    id="requiresService"
                    checked={formData.requiresServiceName}
                    onCheckedChange={(checked) => setFormData({ ...formData, requiresServiceName: checked })}
                  />
                </div>

                <div className="flex items-center justify-between bg-white p-2.5 rounded border border-[#e2e8f0]">
                  <Label htmlFor="requiresFormation" className="text-xs font-medium text-[#4a5568] cursor-pointer">
                    يتطلب تفاصيل التكوين
                  </Label>
                  <Switch
                    id="requiresFormation"
                    checked={formData.requiresFormationDetails}
                    onCheckedChange={(checked) => setFormData({ ...formData, requiresFormationDetails: checked })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 — Appearance */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#2c5282] border-b border-[#e2e8f0] pb-2">
              <Palette className="h-4 w-4" />
              <h4 className="font-bold text-sm text-[#1a202c]">3. المظهر والعرض</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="color" className="text-xs font-semibold text-[#4a5568]">
                  لون الشارة (Couleur)
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="colorPicker"
                    value={formData.color?.startsWith('#') ? formData.color : '#ebf8f1'}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-10 rounded border border-[#e2e8f0] cursor-pointer p-0.5 bg-white"
                  />
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#ebf8f1"
                    className="bg-white border-[#e2e8f0] rounded text-left font-mono text-sm"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="icon" className="text-xs font-semibold text-[#4a5568]">
                  أيقونة Lucide (اختياري)
                </Label>
                <Input
                  id="icon"
                  value={formData.icon || ''}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="Calendar, Briefcase..."
                  className="bg-white border-[#e2e8f0] rounded text-left text-sm"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="order" className="text-xs font-semibold text-[#4a5568]">
                  ترتيب العرض (Ordre)
                </Label>
                <Input
                  id="order"
                  type="number"
                  min="1"
                  max="999"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 100 })}
                  className="bg-white border-[#e2e8f0] rounded text-center"
                />
              </div>
            </div>
          </div>

          {/* Section 4 — Status */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#2c5282] border-b border-[#e2e8f0] pb-2">
              <ToggleLeft className="h-4 w-4" />
              <h4 className="font-bold text-sm text-[#1a202c]">4. الحالة</h4>
            </div>

            <div className="flex items-center justify-between bg-[#f8fafc] border border-[#e2e8f0] rounded p-4">
              <div>
                <Label htmlFor="isActive" className="text-sm font-bold text-[#1a202c] cursor-pointer">
                  حالة النوع : {formData.isActive ? 'مفعل (نشط)' : 'معطل'}
                </Label>
                <p className="text-xs text-[#718096]">
                  عند التعطيل، لن يظهر هذا النوع في قوائم تسجيل الغياب الجديدة مع بقاء البيانات القديمة سليمة.
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter className="p-0 pt-4 border-t border-[#e2e8f0] flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#e2e8f0] rounded text-[#4a5568] hover:bg-[#f8fafc]"
              disabled={submitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              className="bg-[#2c5282] hover:bg-[#2a4365] text-white rounded px-6"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : isEditing ? (
                'حفظ التعديلات'
              ) : (
                'إضافة النوع'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
