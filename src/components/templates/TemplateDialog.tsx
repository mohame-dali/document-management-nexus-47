
import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createTemplate, updateTemplate, Template, CreateTemplateData, UpdateTemplateData } from '@/services/templateService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

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
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const isEditing = !!template;

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || ''
      });
    } else {
      setFormData({
        name: '',
        description: ''
      });
    }
    setSelectedFile(null);
  }, [template, open]);

  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      toast.success('تم إنشاء النموذج بنجاح');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error('فشل في إنشاء النموذج: ' + (error.response?.data?.message || error.message));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateData }) => updateTemplate(id, data),
    onSuccess: () => {
      toast.success('تم تحديث النموذج بنجاح');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error('فشل في تحديث النموذج: ' + (error.response?.data?.message || error.message));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم النموذج');
      return;
    }

    if (!isEditing && !selectedFile) {
      toast.error('يرجى اختيار ملف النموذج');
      return;
    }

    if (isEditing && template) {
      const updateData: UpdateTemplateData = {
        name: formData.name,
        description: formData.description || undefined,
        template: selectedFile || undefined
      };
      updateMutation.mutate({ id: template._id, data: updateData });
    } else if (selectedFile) {
      const createData: CreateTemplateData = {
        name: formData.name,
        description: formData.description || undefined,
        template: selectedFile
      };
      createMutation.mutate(createData);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(doc|docx)$/i)) {
        toast.error('يرجى اختيار ملف Word فقط (.doc أو .docx)');
        return;
      }
      setSelectedFile(file);
    }
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

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.match(/\.(doc|docx)$/i)) {
        toast.error('يرجى اختيار ملف Word فقط (.doc أو .docx)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6 shadow-xl" dir="rtl">
        <DialogHeader className="pb-4 border-b border-[#e2e8f0]">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-[#2c5282]">
            {isEditing ? 'تعديل النموذج' : 'إضافة نموذج جديد'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-bold text-[#1a202c]">
              اسم النموذج <span className="text-red-600">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="أدخل اسم النموذج..."
              className="h-11 text-base border-[#cbd5e1] rounded bg-white focus:border-[#2c5282]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-bold text-[#1a202c]">
              الوصف
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="أدخل وصف النموذج (اختياري)..."
              className="text-base border-[#cbd5e1] rounded min-h-[90px] p-3 focus:border-[#2c5282]"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-bold text-[#1a202c]">
              ملف النموذج {!isEditing && <span className="text-red-600">*</span>}
              {isEditing && <span className="text-sm font-normal text-gray-500"> (اختياري - اتركه فارغاً للاحتفاظ بالملف الحالي)</span>}
            </Label>
            
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragActive 
                  ? 'border-[#2c5282] bg-[#2c5282]/5' 
                  : 'border-gray-300 hover:border-[#2c5282]'
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
                <div className="space-y-2">
                  <FileText className="h-10 w-10 mx-auto text-emerald-600" />
                  <p className="font-bold text-base text-[#1a202c]">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 mx-auto text-[#2c5282]" />
                  <p className="text-base font-medium text-gray-700">
                    اسحب وأفلت ملف Word هنا أو انقر للاختيار
                  </p>
                  <p className="text-sm text-gray-500">
                    يدعم فقط ملفات .doc و .docx
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-[#e2e8f0]">
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="h-11 px-7 rounded bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold shadow-none"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'جاري الحفظ...'
                : isEditing
                ? 'حفظ التغييرات'
                : 'إنشاء النموذج'
              }
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 px-6 rounded border-[#cbd5e1] text-[#2d3748] hover:bg-gray-100 text-base font-medium"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateDialog;
