import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  RHPromotion,
  RHPromotionFormData,
  createPromotion,
  updatePromotion,
} from '@/services/rhPersonnelHistoryService';
import { toast } from 'sonner';
import { Award, Save, X, AlertCircle } from 'lucide-react';

interface PromotionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion?: RHPromotion | null;
  personnelId: string;
  onSuccess?: () => void;
}

export const PromotionFormDialog: React.FC<PromotionFormDialogProps> = ({
  open,
  onOpenChange,
  promotion,
  personnelId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const isEditing = Boolean(promotion);

  const [gradePrecedent, setGradePrecedent] = useState('');
  const [gradeNouveau, setGradeNouveau] = useState('');
  const [datePromotion, setDatePromotion] = useState('');
  const [reference, setReference] = useState('');
  const [motif, setMotif] = useState('');
  const [observations, setObservations] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (promotion) {
        setGradePrecedent(promotion.gradePrecedent || '');
        setGradeNouveau(promotion.gradeNouveau || '');
        setDatePromotion(
          promotion.datePromotion ? promotion.datePromotion.substring(0, 10) : ''
        );
        setReference(promotion.reference || '');
        setMotif(promotion.motif || '');
        setObservations(promotion.observations || '');
      } else {
        setGradePrecedent('');
        setGradeNouveau('');
        setDatePromotion(new Date().toISOString().substring(0, 10));
        setReference('');
        setMotif('');
        setObservations('');
      }
      setErrors({});
    }
  }, [open, promotion]);

  const mutation = useMutation({
    mutationFn: (data: RHPromotionFormData) => {
      if (isEditing && promotion) {
        return updatePromotion(promotion._id, data);
      }
      return createPromotion(personnelId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel-full-history', personnelId] });
      queryClient.invalidateQueries({ queryKey: ['personnel-promotions', personnelId] });
      toast.success(isEditing ? 'تم تعديل الترقية بنجاح' : 'تمت إضافة الترقية بنجاح');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (err: unknown) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(msg || 'حدث خطأ أثناء حفظ الترقية');
    },
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!gradeNouveau.trim()) {
      errs.gradeNouveau = 'الرتبة الجديدة مطلوبة';
    }
    if (!datePromotion) {
      errs.datePromotion = 'تاريخ الترقية مطلوب';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    mutation.mutate({
      gradePrecedent: gradePrecedent.trim(),
      gradeNouveau: gradeNouveau.trim(),
      datePromotion,
      reference: reference.trim(),
      motif: motif.trim(),
      observations: observations.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto text-right" dir="rtl">
        <DialogHeader className="border-b border-[#e2e8f0] pb-3">
          <DialogTitle className="text-lg font-bold text-[#1a202c] flex items-center gap-2">
            <Award className="w-5 h-5 text-[#2c5282]" />
            <span>{isEditing ? 'تعديل بيانات الترقية' : 'إضافة ترقية جديدة'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            سجل الترقيات الإدارية وتغييرات الرتب الخاصة بالموظف
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                الرتبة السابقة
              </Label>
              <Input
                value={gradePrecedent}
                onChange={(e) => setGradePrecedent(e.target.value)}
                placeholder="مثال: متصرف مساعد"
                className="h-10 text-sm bg-white border-[#cbd5e1] rounded"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                الرتبة الجديدة <span className="text-red-500">*</span>
              </Label>
              <Input
                value={gradeNouveau}
                onChange={(e) => {
                  setGradeNouveau(e.target.value);
                  if (errors.gradeNouveau) setErrors((prev) => ({ ...prev, gradeNouveau: '' }));
                }}
                placeholder="مثال: متصرف"
                className={`h-10 text-sm bg-white rounded ${
                  errors.gradeNouveau ? 'border-red-500' : 'border-[#cbd5e1]'
                }`}
              />
              {errors.gradeNouveau && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.gradeNouveau}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                تاريخ الترقية <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={datePromotion}
                onChange={(e) => {
                  setDatePromotion(e.target.value);
                  if (errors.datePromotion) setErrors((prev) => ({ ...prev, datePromotion: '' }));
                }}
                className={`h-10 text-sm bg-white rounded ${
                  errors.datePromotion ? 'border-red-500' : 'border-[#cbd5e1]'
                }`}
              />
              {errors.datePromotion && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.datePromotion}</span>
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                المرجع / القرار
              </Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="مثال: قرار وزاري عدد 550"
                className="h-10 text-sm bg-white border-[#cbd5e1] rounded"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-gray-700 block mb-1">
              سبب أو نمط الترقية
            </Label>
            <Input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="مثال: بالمناظرة الداخلية / بالاختيار / بالامتحان المهني"
              className="h-10 text-sm bg-white border-[#cbd5e1] rounded"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-gray-700 block mb-1">
              ملاحظات إضافية
            </Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="أي ملاحظات تخص هذه الترقية..."
              rows={3}
              className="text-sm bg-white border-[#cbd5e1] rounded resize-none"
            />
          </div>

          <DialogFooter className="flex flex-row justify-end gap-3 pt-3 border-t border-[#e2e8f0]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 text-xs border-[#cbd5e1] rounded hover:bg-gray-100"
            >
              <X className="w-4 h-4 ml-1" />
              <span>إلغاء</span>
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="h-10 px-5 text-xs bg-[#2c5282] hover:bg-[#234269] text-white rounded font-bold"
            >
              <Save className="w-4 h-4 ml-1" />
              <span>{mutation.isPending ? 'جاري الحفظ...' : 'حفظ الترقية'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
