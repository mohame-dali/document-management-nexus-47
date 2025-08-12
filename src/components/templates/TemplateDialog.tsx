
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
      <DialogContent className="sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'تعديل النموذج' : 'إضافة نموذج جديد'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">اسم النموذج *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="أدخل اسم النموذج"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="أدخل وصف النموذج (اختياري)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>
              ملف النموذج {!isEditing && '*'}
              {isEditing && ' (اختياري - اتركه فارغاً للاحتفاظ بالملف الحالي)'}
            </Label>
            
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-300 hover:border-gray-400'
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
                  <FileText className="h-8 w-8 mx-auto text-green-600" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-gray-400" />
                  <p className="text-gray-600">
                    اسحب وأفلت ملف Word هنا أو انقر للاختيار
                  </p>
                  <p className="text-sm text-gray-500">
                    يدعم فقط ملفات .doc و .docx
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'جاري الحفظ...'
                : isEditing
                ? 'حفظ التغييرات'
                : 'إنشاء النموذج'
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateDialog;
