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
  RHPoste,
  RHPosteFormData,
  createPoste,
  updatePoste,
} from '@/services/rhPersonnelHistoryService';
import { toast } from 'sonner';
import { Briefcase, Save, X, AlertCircle } from 'lucide-react';

interface PosteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poste?: RHPoste | null;
  personnelId: string;
  onSuccess?: () => void;
}

export const PosteFormDialog: React.FC<PosteFormDialogProps> = ({
  open,
  onOpenChange,
  poste,
  personnelId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const isEditing = Boolean(poste);

  const [posteName, setPosteName] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [reference, setReference] = useState('');
  const [lieu, setLieu] = useState('');
  const [observations, setObservations] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (poste) {
        setPosteName(poste.poste || '');
        setDateDebut(poste.dateDebut ? poste.dateDebut.substring(0, 10) : '');
        setDateFin(poste.dateFin ? poste.dateFin.substring(0, 10) : '');
        setReference(poste.reference || '');
        setLieu(poste.lieu || '');
        setObservations(poste.observations || '');
      } else {
        setPosteName('');
        setDateDebut(new Date().toISOString().substring(0, 10));
        setDateFin('');
        setReference('');
        setLieu('');
        setObservations('');
      }
      setErrors({});
    }
  }, [open, poste]);

  const mutation = useMutation({
    mutationFn: (data: RHPosteFormData) => {
      if (isEditing && poste) {
        return updatePoste(poste._id, data);
      }
      return createPoste(personnelId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel-full-history', personnelId] });
      queryClient.invalidateQueries({ queryKey: ['personnel-postes', personnelId] });
      toast.success(isEditing ? 'تم تعديل الخطة بنجاح' : 'تمت إضافة الخطة بنجاح');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (err: unknown) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(msg || 'حدث خطأ أثناء حفظ الخطة');
    },
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!posteName.trim()) {
      errs.poste = 'اسم الخطة الوظيفية مطلوب';
    }
    if (!dateDebut) {
      errs.dateDebut = 'تاريخ التعيين أو المباشرة مطلوب';
    }
    if (dateDebut && dateFin && new Date(dateFin) < new Date(dateDebut)) {
      errs.dateFin = 'تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ البداية';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    mutation.mutate({
      poste: posteName.trim(),
      dateDebut,
      dateFin: dateFin ? dateFin : null,
      reference: reference.trim(),
      lieu: lieu.trim(),
      observations: observations.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto text-right" dir="rtl">
        <DialogHeader className="border-b border-[#e2e8f0] pb-3">
          <DialogTitle className="text-lg font-bold text-[#1a202c] flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#2c5282]" />
            <span>{isEditing ? 'تعديل بيانات الخطة الوظيفية' : 'إضافة خطة وظيفية جديدة'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            سجل الخطط الوظيفية والتكليفات الإدارية الخاصة بالموظف
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div>
            <Label className="text-xs font-bold text-gray-700 block mb-1">
              الخطة الوظيفية / التكليف <span className="text-red-500">*</span>
            </Label>
            <Input
              value={posteName}
              onChange={(e) => {
                setPosteName(e.target.value);
                if (errors.poste) setErrors((prev) => ({ ...prev, poste: '' }));
              }}
              placeholder="مثال: رئيس مصلحة الموارد البشرية / كاتب تصرف"
              className={`h-10 text-sm bg-white rounded ${
                errors.poste ? 'border-red-500' : 'border-[#cbd5e1]'
              }`}
            />
            {errors.poste && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.poste}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                تاريخ المباشرة / البداية <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={dateDebut}
                onChange={(e) => {
                  setDateDebut(e.target.value);
                  if (errors.dateDebut) setErrors((prev) => ({ ...prev, dateDebut: '' }));
                }}
                className={`h-10 text-sm bg-white rounded ${
                  errors.dateDebut ? 'border-red-500' : 'border-[#cbd5e1]'
                }`}
              />
              {errors.dateDebut && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.dateDebut}</span>
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                تاريخ الانتهاء (اختياري)
              </Label>
              <Input
                type="date"
                value={dateFin}
                onChange={(e) => {
                  setDateFin(e.target.value);
                  if (errors.dateFin) setErrors((prev) => ({ ...prev, dateFin: '' }));
                }}
                className={`h-10 text-sm bg-white rounded ${
                  errors.dateFin ? 'border-red-500' : 'border-[#cbd5e1]'
                }`}
              />
              {errors.dateFin && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.dateFin}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                المرجع / التكليف
              </Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="مثال: مذكرة تعيين عدد 12/2024"
                className="h-10 text-sm bg-white border-[#cbd5e1] rounded"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                مكان العمل / الإدارة
              </Label>
              <Input
                value={lieu}
                onChange={(e) => setLieu(e.target.value)}
                placeholder="مثال: الإدارة العامة للشؤون الإدارية"
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
              placeholder="أي تفاصيل أو ملاحظات حول الخطة الوظيفية..."
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
              <span>{mutation.isPending ? 'جاري الحفظ...' : 'حفظ الخطة'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
