import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Edit3, Loader2, X } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { PersonnelDocument } from '@/types/hr';
import { getTypesAssociation, updateAssociation } from '@/services/hr/personnelDocumentApi';

interface UpdateAssociationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  association: PersonnelDocument | null;
  onSuccess?: () => void;
}

export const UpdateAssociationDialog: React.FC<UpdateAssociationDialogProps> = ({
  open,
  onOpenChange,
  association,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [typeAssociation, setTypeAssociation] = useState<string>('');
  const [commentaire, setCommentaire] = useState<string>('');

  // Charger les types d'association configurés
  const { data: typesList = ['Stage', 'Formation', 'Diplôme', 'Autre'] } = useQuery({
    queryKey: ['hr', 'typesAssociation'],
    queryFn: getTypesAssociation,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (association) {
      setTypeAssociation(association.typeAssociation || '');
      setCommentaire(association.commentaire || '');
    }
  }, [association]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!association?._id) return;
      return await updateAssociation(association._id, {
        typeAssociation: typeAssociation.trim(),
        commentaire: commentaire.trim(),
      });
    },
    onSuccess: () => {
      toast.success('تم تعديل بيانات الربط بنجاح');
      queryClient.invalidateQueries({ queryKey: ['hr', 'personnelDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'documentPersonnel'] });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تعديل بيانات الربط');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeAssociation) {
      toast.error('يرجى اختيار طبيعة الوثيقة / نوع الربط');
      return;
    }
    updateMutation.mutate();
  };

  if (!association) return null;

  const doc = association.document;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-6 bg-white text-right border border-[#e2e8f0] shadow-sm" dir="rtl">
        <DialogHeader className="text-right space-y-1.5 border-b border-[#e2e8f0] pb-3">
          <DialogTitle className="text-lg font-bold text-[#1a202c] flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-[#2c5282]" />
            <span>تعديل بيانات ربط الوثيقة</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            تعديل طبيعة العلاقة الإدارية أو الملاحظات التوضيحية المرفقة بالوثيقة
          </DialogDescription>
        </DialogHeader>

        {doc && (
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-3 text-sm text-gray-700">
            <div className="font-bold text-[#1a202c] mb-1">
              {association.documentType === 'IncomingDocument' ? 'وارد' : 'صادر'} رقم #{doc.serialNumber || '—'} / {doc.year || '—'}
            </div>
            <div className="text-xs text-gray-600 truncate">{doc.subject || 'بدون موضوع'}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5 text-right">
            <Label htmlFor="update-type-association" className="text-sm font-semibold text-gray-700">
              طبيعة الوثيقة / نوع الربط <span className="text-red-500">*</span>
            </Label>
            <select
              id="update-type-association"
              value={typeAssociation}
              onChange={(e) => setTypeAssociation(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-[#cbd5e1] rounded text-base text-[#1a202c] focus:outline-none focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
              required
            >
              <option value="">-- اختر طبيعة الوثيقة --</option>
              {typesList.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 text-right">
            <Label htmlFor="update-commentaire" className="text-sm font-semibold text-gray-700">
              ملاحظات أو تفاصيل إضافية (اختياري)
            </Label>
            <Textarea
              id="update-commentaire"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="أدخل أي إيضاحات أو مرجعيات تكميلية..."
              rows={3}
              className="border-[#cbd5e1] focus-visible:ring-[#2c5282] text-base"
            />
          </div>

          <DialogFooter className="flex-row-reverse gap-2 sm:justify-start pt-3 border-t border-[#e2e8f0]">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="h-11 px-6 bg-[#2c5282] hover:bg-[#1a365d] text-white font-bold text-base rounded shadow-none"
            >
              {updateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحفظ...
                </span>
              ) : (
                'حفظ التعديلات'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => onOpenChange(false)}
              className="h-11 px-5 border-[#cbd5e1] text-gray-700 hover:bg-gray-50 text-base rounded"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateAssociationDialog;
