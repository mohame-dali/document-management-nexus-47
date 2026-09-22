
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { getTemplates, deleteTemplate, downloadTemplate, Template } from '@/services/templateService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileText, Download, Edit, Trash2, Plus, Upload, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import TemplateDialog from '@/components/templates/TemplateDialog';

const TemplatesPage = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('تم حذف النموذج بنجاح');
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
    onError: (error: any) => {
      toast.error('فشل في حذف النموذج: ' + (error.response?.data?.message || error.message));
    },
  });

  const handleDownload = async (template: Template) => {
    try {
      await downloadTemplate(template._id, template.fileName);
      toast.success('تم تحميل النموذج بنجاح');
    } catch (error: any) {
      toast.error('فشل في تحميل النموذج: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = (template: Template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canManageTemplates = currentUser?.role === 'AdminTuningDesk';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#ebf4ff] rounded text-[#2c5282]">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1a202c]">النماذج</h1>
            <p className="text-sm text-[#4a5568] mt-0.5">
              إدارة نماذج الوثائق المتاحة للتحميل والاستخدام
            </p>
          </div>
        </div>
        
        {canManageTemplates && (
          <Button 
            onClick={handleCreateNew} 
            className="gap-2 h-10 px-5 bg-[#2c5282] hover:bg-[#2a4365] text-white rounded font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            إضافة نموذج جديد
          </Button>
        )}
      </div>

      {/* Info Banner: كيفية استخدام النماذج */}
      <div className="bg-[#ebf4ff] border border-[#bee3f8] rounded p-4 flex items-center gap-3 text-[#2c5282]">
        <Upload className="h-5 w-5 text-[#2c5282] flex-shrink-0" />
        <div className="text-sm">
          <span className="font-semibold ml-1">كيفية استخدام النماذج:</span>
          <span>
            يمكن لجميع المستخدمين تحميل النماذج المتاحة وتعديلها حسب احتياجاتهم
            {canManageTemplates && ' • يمكنك كمدير مكتب الضبط إضافة وتعديل وحذف النماذج'}
          </span>
        </div>
      </div>

      {/* Templates Grid */}
      {templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template._id}
              className="bg-white border border-[#e2e8f0] rounded p-5 shadow-sm hover:shadow-md hover:border-[#2c5282] transition-all flex flex-col justify-between"
            >
              <div>
                {/* File Icon Header */}
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded bg-[#ebf4ff] text-[#2c5282] flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs bg-[#f7fafc] text-[#4a5568] border border-[#e2e8f0] font-normal">
                    {formatFileSize(template.fileSize)}
                  </Badge>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-[#1a202c] mt-3 line-clamp-1">
                  {template.name}
                </h3>

                {/* Description */}
                {template.description && (
                  <p className="text-sm text-[#4a5568] mt-1 line-clamp-2">
                    {template.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="text-xs text-[#718096] flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[#f1f5f9]">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-[#718096]" />
                    <span>{template.downloads} تحميل</span>
                  </div>
                  <span>•</span>
                  <span>{formatArabicDate(template.createdAt)}</span>
                  <span>•</span>
                  <span>بواسطة: {template.uploadedBy.username}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={() => handleDownload(template)}
                  className="w-full h-10 bg-[#2c5282] text-white rounded font-medium hover:bg-[#2a4365] gap-2 flex items-center justify-center transition-colors"
                >
                  <Download className="h-4 w-4" />
                  تحميل
                </Button>
                
                {canManageTemplates && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(template)}
                      className="flex-1 h-9 border border-[#e2e8f0] text-[#4a5568] hover:bg-[#f7fafc] rounded text-xs gap-1.5"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(template)}
                      className="flex-1 h-9 border border-[#e2e8f0] text-red-600 hover:bg-red-50 hover:border-red-200 rounded text-xs gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-[#e2e8f0] rounded p-12 text-center shadow-sm">
          <FileText className="h-12 w-12 mx-auto mb-3 text-[#cbd5e0]" />
          <h3 className="text-base font-medium text-[#718096] mb-1">لا توجد نماذج متاحة</h3>
          <p className="text-sm text-[#a0aec0] mb-4">
            {canManageTemplates 
              ? 'ابدأ بإضافة النموذج الأول للمستخدمين'
              : 'لم يتم رفع أي نماذج بعد'
            }
          </p>
          {canManageTemplates && (
            <Button 
              onClick={handleCreateNew} 
              className="gap-2 h-10 px-5 bg-[#2c5282] hover:bg-[#2a4365] text-white rounded font-medium shadow-sm inline-flex items-center"
            >
              <Plus className="h-4 w-4" />
              إضافة نموذج جديد
            </Button>
          )}
        </div>
      )}

      {/* Template Dialog */}
      <TemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        template={editingTemplate}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['templates'] });
          setTemplateDialogOpen(false);
          setEditingTemplate(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl font-bold text-red-600 text-right">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-600 mt-2 text-right">
              هل أنت متأكد من حذف النموذج "{templateToDelete?.name}"؟ 
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse justify-start gap-3 mt-4 pt-4 border-t border-[#e2e8f0]">
            <AlertDialogAction
              onClick={() => templateToDelete && deleteMutation.mutate(templateToDelete._id)}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-base h-11 px-7 rounded shadow-none"
            >
              حذف
            </AlertDialogAction>
            <AlertDialogCancel className="h-11 px-6 rounded border-[#cbd5e1] text-gray-700 hover:bg-gray-100 text-base font-medium">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TemplatesPage;
