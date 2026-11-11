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
  RHSanction,
  RHSanctionFormData,
  createSanction,
  updateSanction,
} from '@/services/rhPersonnelHistoryService';
import { toast } from 'sonner';
import { AlertTriangle, Save, X, AlertCircle } from 'lucide-react';

interface SanctionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sanction?: RHSanction | null;
  personnelId: string;
  onSuccess?: () => void;
}

export const SanctionFormDialog: React.FC<SanctionFormDialogProps> = ({
  open,
  onOpenChange,
  sanction,
  personnelId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const isEditing = Boolean(sanction);

  const [dateSanction, setDateSanction] = useState('');
  const [nombreJours, setNombreJours] = useState<number | string>(0);
  const [raison, setRaison] = useState('');
  const [typeSanction, setTypeSanction] = useState('');
  const [reference, setReference] = useState('');
  const [observations, setObservations] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (sanction) {
        setDateSanction(
          sanction.dateSanction ? sanction.dateSanction.substring(0, 10) : ''
        );
        setNombreJours(sanction.nombreJours !== undefined ? sanction.nombreJours : 0);
        setRaison(sanction.raison || '');
        setTypeSanction(sanction.typeSanction || '');
        setReference(sanction.reference || '');
        setObservations(sanction.observations || '');
      } else {
        setDateSanction(new Date().toISOString().substring(0, 10));
        setNombreJours(0);
        setRaison('');
        setTypeSanction('');
        setReference('');
        setObservations('');
      }
      setErrors({});
    }
  }, [open, sanction]);

  const mutation = useMutation({
    mutationFn: (data: RHSanctionFormData) => {
      if (isEditing && sanction) {
        return updateSanction(sanction._id, data);
      }
      return createSanction(personnelId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel-full-history', personnelId] });
      queryClient.invalidateQueries({ queryKey: ['personnel-sanctions', personnelId] });
      toast.success(isEditing ? 'تم تعديل العقوبة بنجاح' : 'تمت إضافة العقوبة بنجاح');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (err: unknown) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(msg || 'حدث خطأ أثناء حفظ العقوبة');
    },
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!dateSanction) {
      errs.dateSanction = 'تاريخ العقوبة مطلوب';
    }
    if (!raison.trim()) {
      errs.raison = 'سبب العقوبة مطلوب';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    mutation.mutate({
      dateSanction,
      nombreJours: Number(nombreJours) || 0,
      raison: raison.trim(),
      typeSanction: typeSanction.trim(),
      reference: reference.trim(),
      observations: observations.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto text-right" dir="rtl">
        <DialogHeader className="border-b border-[#e2e8f0] pb-3">
          <DialogTitle className="text-lg font-bold text-[#1a202c] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>{isEditing ? 'تعديل بيانات العقوبة' : 'إضافة عقوبة تأديبية جديدة'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            سجل العقوبات والإجراءات التأديبية الخاصة بالموظف
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                تاريخ العقوبة <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={dateSanction}
                onChange={(e) => {
                  setDateSanction(e.target.value);
                  if (errors.dateSanction) setErrors((prev) => ({ ...prev, dateSanction: '' }));
                }}
                className={`h-10 text-sm bg-white rounded ${
                  errors.dateSanction ? 'border-red-500' : 'border-[#cbd5e1]'
                }`}
              />
              {errors.dateSanction && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.dateSanction}</span>
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                عدد الأيام (إن وجد)
              </Label>
              <Input
                type="number"
                min="0"
                value={nombreJours}
                onChange={(e) => setNombreJours(e.target.value)}
                placeholder="مثال: 3"
                className="h-10 text-sm bg-white border-[#cbd5e1] rounded"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-gray-700 block mb-1">
              سبب العقوبة <span className="text-red-500">*</span>
            </Label>
            <Input
              value={raison}
              onChange={(e) => {
                setRaison(e.target.value);
                if (errors.raison) setErrors((prev) => ({ ...prev, raison: '' }));
              }}
              placeholder="مثال: غياب غير مبرر / إخلال بالواجب المهني"
              className={`h-10 text-sm bg-white rounded ${
                errors.raison ? 'border-red-500' : 'border-[#cbd5e1]'
              }`}
            />
            {errors.raison && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.raison}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                نوع أو درجة العقوبة
              </Label>
              <Input
                value={typeSanction}
                onChange={(e) => setTypeSanction(e.target.value)}
                placeholder="مثال: إنذار / توبيخ / إيقاف مؤقت"
                className="h-10 text-sm bg-white border-[#cbd5e1] rounded"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                المرجع / القرار التأديبي
              </Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="مثال: قرار مجلس التأديب عدد 44"
                className="h-10 text-sm bg-white border-[#cbd5e1] rounded"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-gray-700 block mb-1">
              ملاحظات إضافية
            </Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="أي تفاصيل أو ملاحظات حول العقوبة..."
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
              className="h-10 px-5 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-bold"
            >
              <Save className="w-4 h-4 ml-1" />
              <span>{mutation.isPending ? 'جاري الحفظ...' : 'حفظ العقوبة'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
