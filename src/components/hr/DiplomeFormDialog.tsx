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
  RHDiplome,
  RHDiplomeFormData,
  createDiplome,
  updateDiplome,
} from '@/services/rhPersonnelHistoryService';
import { toast } from 'sonner';
import { GraduationCap, Save, X, AlertCircle } from 'lucide-react';

interface DiplomeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diplome?: RHDiplome | null;
  personnelId: string;
  onSuccess?: () => void;
}

export const DiplomeFormDialog: React.FC<DiplomeFormDialogProps> = ({
  open,
  onOpenChange,
  diplome,
  personnelId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const isEditing = Boolean(diplome);

  const [typeDiplome, setTypeDiplome] = useState('');
  const [sujetDiplome, setSujetDiplome] = useState('');
  const [dateObtention, setDateObtention] = useState('');
  const [etablissement, setEtablissement] = useState('');
  const [reference, setReference] = useState('');
  const [niveau, setNiveau] = useState('');
  const [observations, setObservations] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (diplome) {
        setTypeDiplome(diplome.typeDiplome || '');
        setSujetDiplome(diplome.sujetDiplome || '');
        setDateObtention(
          diplome.dateObtention ? diplome.dateObtention.substring(0, 10) : ''
        );
        setEtablissement(diplome.etablissement || '');
        setReference(diplome.reference || '');
        setNiveau(diplome.niveau || '');
        setObservations(diplome.observations || '');
      } else {
        setTypeDiplome('');
        setSujetDiplome('');
        setDateObtention(new Date().toISOString().substring(0, 10));
        setEtablissement('');
        setReference('');
        setNiveau('');
        setObservations('');
      }
      setErrors({});
    }
  }, [open, diplome]);

  const mutation = useMutation({
    mutationFn: (data: RHDiplomeFormData) => {
      if (isEditing && diplome) {
        return updateDiplome(diplome._id, data);
      }
      return createDiplome(personnelId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel-full-history', personnelId] });
      queryClient.invalidateQueries({ queryKey: ['personnel-diplomes', personnelId] });
      toast.success(isEditing ? 'تم تعديل الشهادة بنجاح' : 'تمت إضافة الشهادة بنجاح');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (err: unknown) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(msg || 'حدث خطأ أثناء حفظ الشهادة');
    },
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!typeDiplome.trim()) {
      errs.typeDiplome = 'نوع الشهادة مطلوب';
    }
    if (!sujetDiplome.trim()) {
      errs.sujetDiplome = 'موضوع / اختصاص الشهادة مطلوب';
    }
    if (!dateObtention) {
      errs.dateObtention = 'تاريخ الحصول على الشهادة مطلوب';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    mutation.mutate({
      typeDiplome: typeDiplome.trim(),
      sujetDiplome: sujetDiplome.trim(),
      dateObtention,
      etablissement: etablissement.trim(),
      reference: reference.trim(),
      niveau: niveau.trim(),
      observations: observations.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto text-right" dir="rtl">
        <DialogHeader className="border-b border-[#e2e8f0] pb-3">
          <DialogTitle className="text-lg font-bold text-[#1a202c] flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#2c5282]" />
            <span>{isEditing ? 'تعديل بيانات الشهادة' : 'إضافة شهادة علمية / مهنية جديدة'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            سجل الشهادات الأكاديمية والمهنية والتكوينية المحرزة
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                نوع الشهادة <span className="text-red-500">*</span>
              </Label>
              <Input
                value={typeDiplome}
                onChange={(e) => {
                  setTypeDiplome(e.target.value);
                  if (errors.typeDiplome) setErrors((prev) => ({ ...prev, typeDiplome: '' }));
                }}
                placeholder="مثال: الإجازة / الماجستير / شهادة ختم تكوين"
                className={`h-10 text-sm bg-white rounded ${
                  errors.typeDiplome ? 'border-red-500' : 'border-[#cbd5e1]'
                }`}
              />
              {errors.typeDiplome && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.typeDiplome}</span>
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                موضوع / اختصاص الشهادة <span className="text-red-500">*</span>
              </Label>
              <Input
                value={sujetDiplome}
                onChange={(e) => {
                  setSujetDiplome(e.target.value);
                  if (errors.sujetDiplome) setErrors((prev) => ({ ...prev, sujetDiplome: '' }));
                }}
                placeholder="مثال: علوم التصرف / حقوق / هندسة الإعلامية"
                className={`h-10 text-sm bg-white rounded ${
                  errors.sujetDiplome ? 'border-red-500' : 'border-[#cbd5e1]'
                }`}
              />
              {errors.sujetDiplome && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.sujetDiplome}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                تاريخ الحصول على الشهادة <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={dateObtention}
                onChange={(e) => {
                  setDateObtention(e.target.value);
                  if (errors.dateObtention) setErrors((prev) => ({ ...prev, dateObtention: '' }));
                }}
                className={`h-10 text-sm bg-white rounded ${
                  errors.dateObtention ? 'border-red-500' : 'border-[#cbd5e1]'
                }`}
              />
              {errors.dateObtention && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.dateObtention}</span>
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                المستوى التعليمي / الصنف
              </Label>
              <Input
                value={niveau}
                onChange={(e) => setNiveau(e.target.value)}
                placeholder="مثال: صنف أ2 / بكالوريا + 3"
                className="h-10 text-sm bg-white border-[#cbd5e1] rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                المؤسسة المانحة / الجامعة
              </Label>
              <Input
                value={etablissement}
                onChange={(e) => setEtablissement(e.target.value)}
                placeholder="مثال: جامعة تونس المنار / معهد التكوين المستمر"
                className="h-10 text-sm bg-white border-[#cbd5e1] rounded"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                المرجع / رقم التسجيل
              </Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="مثال: رقم الشهادة أو المرجع 9874/2021"
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
              placeholder="أي ملاحظات حول الشهادة أو المعادلة..."
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
              <span>{mutation.isPending ? 'جاري الحفظ...' : 'حفظ الشهادة'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
