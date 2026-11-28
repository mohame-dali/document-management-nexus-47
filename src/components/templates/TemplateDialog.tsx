import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  createTemplate,
  updateTemplate,
  Template,
  CreateTemplateData,
  UpdateTemplateData,
} from '@/services/templateService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { formatTemplateFileSize } from '@/utils/organizationTemplatesUtils';

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
  onSuccess: () => void;
}

const TemplateDialog: React.FC<TemplateDialogProps> = ({
  open,
  onOpenChange,
  template,
  onSuccess,
}) => {
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isFr = language === 'fr';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const isEditing = !!template;

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
      });
    }
    setSelectedFile(null);
  }, [template, open]);

  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      toast.success(isFr ? 'Modèle créé avec succès' : 'تم إنشاء النموذج بنجاح');
      onSuccess();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(
        (isFr ? 'Échec de création : ' : 'فشل في إنشاء النموذج: ') +
          (err.response?.data?.message || err.message || '')
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateData }) =>
      updateTemplate(id, data),
    onSuccess: () => {
      toast.success(isFr ? 'Modèle mis à jour avec succès' : 'تم تحديث النموذج بنجاح');
      onSuccess();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(
        (isFr ? 'Échec de mise à jour : ' : 'فشل في تحديث النموذج: ') +
          (err.response?.data?.message || err.message || '')
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error(isFr ? 'Veuillez saisir le nom du modèle' : 'يرجى إدخال اسم النموذج');
      return;
    }

    if (!isEditing && !selectedFile) {
      toast.error(isFr ? 'Veuillez sélectionner un fichier' : 'يرجى اختيار ملف النموذج');
      return;
    }

    if (isEditing && template) {
      const updateData: UpdateTemplateData = {
        name: formData.name,
        description: formData.description || undefined,
        template: selectedFile || undefined,
      };
      updateMutation.mutate({ id: template._id, data: updateData });
    } else if (selectedFile) {
      const createData: CreateTemplateData = {
        name: formData.name,
        description: formData.description || undefined,
        template: selectedFile,
      };
      createMutation.mutate(createData);
    }
  };

  const validateAndSelectFile = (file?: File) => {
    if (!file) return;
    if (!file.name.match(/\.(doc|docx)$/i)) {
      toast.error(
        isFr
          ? 'Seuls les fichiers Word (.doc ou .docx) sont acceptés'
          : 'يرجى اختيار ملف Word فقط (.doc أو .docx)'
      );
      return;
    }
    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndSelectFile(e.target.files?.[0]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    validateAndSelectFile(e.dataTransfer.files?.[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] sm:w-[90vw] sm:max-w-[640px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-lg"
        dir={dir}
      >
        <DialogHeader className="pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <DialogTitle className="text-xl font-bold text-[#2c5282] dark:text-sky-300">
            {isEditing
              ? isFr
                ? 'Modifier le modèle'
                : 'تعديل النموذج'
              : isFr
                ? 'Importer un nouveau modèle'
                : 'رفع نموذج جديد'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="template-name" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isFr ? 'Nom du modèle' : 'اسم النموذج'}{' '}
              <span className="text-red-600 dark:text-red-400">*</span>
            </Label>
            <Input
              id="template-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={isFr ? 'Ex : Attestation de travail' : 'أدخل اسم النموذج...'}
              className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="template-description" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isFr ? 'Description' : 'الوصف'}
            </Label>
            <Textarea
              id="template-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={
                isFr
                  ? 'Description courte ou service concerné (optionnel)...'
                  : 'أدخل وصف النموذج أو الجهة المعنية (اختياري)...'
              }
              className="text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-[84px] p-3"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isFr ? 'Fichier du modèle' : 'ملف النموذج'}{' '}
              {!isEditing && <span className="text-red-600 dark:text-red-400">*</span>}
              {isEditing && (
                <span className="text-xs font-normal text-slate-600 dark:text-slate-300">
                  {isFr
                    ? ' (optionnel — laisser vide pour conserver le fichier actuel)'
                    : ' (اختياري — اتركه فارغاً للاحتفاظ بالملف الحالي)'}
                </span>
              )}
            </Label>

            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-[#2c5282] dark:border-sky-400 bg-[#2c5282]/5 dark:bg-sky-950/30'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 hover:border-[#2c5282] dark:hover:border-sky-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('template-file')?.click()}
            >
              <input
                id="template-file"
                type="file"
                accept=".doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-1.5">
                  <FileText className="h-9 w-9 mx-auto text-emerald-600 dark:text-emerald-400" />
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                    {formatTemplateFileSize(selectedFile.size)}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Upload className="h-9 w-9 mx-auto text-[#2c5282] dark:text-sky-400" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {isFr
                      ? 'Glissez-déposez un fichier Word ici ou cliquez pour parcourir'
                      : 'اسحب وأفلت ملف Word هنا أو انقر للاختيار'}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {isFr ? 'Formats acceptés : .doc, .docx' : 'يدعم ملفات .doc و .docx'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 px-5 rounded-md border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            >
              {isFr ? 'Annuler' : 'إلغاء'}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="h-10 px-6 rounded-md bg-[#2c5282] hover:bg-[#1e3a5f] text-white font-semibold"
            >
              {createMutation.isPending || updateMutation.isPending
                ? isFr
                  ? 'Enregistrement...'
                  : 'جاري الحفظ...'
                : isEditing
                  ? isFr
                    ? 'Enregistrer'
                    : 'حفظ التغييرات'
                  : isFr
                    ? 'Importer'
                    : 'رفع النموذج'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateDialog;
