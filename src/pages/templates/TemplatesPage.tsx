
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { getTemplates, deleteTemplate, downloadTemplate, Template } from '@/services/templateService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">النماذج</h1>
            <p className="text-sm text-muted-foreground">
              إدارة نماذج الوثائق المتاحة للتحميل والاستخدام
            </p>
          </div>
        </div>
        
        {canManageTemplates && (
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة نموذج جديد
          </Button>
        )}
      </div>

      {/* Info Card */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">كيفية استخدام النماذج</h3>
              <p className="text-sm text-blue-700">
                يمكن لجميع المستخدمين تحميل النماذج المتاحة وتعديلها حسب احتياجاتهم
                {canManageTemplates && ' • يمكنك كمدير مكتب الضبط إضافة وتعديل وحذف النماذج'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((template) => (
          <Card key={template._id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {formatFileSize(template.fileSize)}
                </Badge>
              </div>
              {template.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {template.description}
                </p>
              )}
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Template Info */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{template.downloads} تحميل</span>
                  </div>
                  <span>
                    {formatArabicDate(template.createdAt)}
                  </span>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  رفع بواسطة: {template.uploadedBy.username}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleDownload(template)}
                    className="flex-1 gap-2"
                  >
                    <Download className="h-4 w-4" />
                    تحميل
                  </Button>
                  
                  {canManageTemplates && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(template)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        تعديل
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(template)}
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {templates?.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">لا توجد نماذج متاحة</h3>
          <p className="text-gray-500 mb-4">
            {canManageTemplates 
              ? 'ابدأ بإضافة النموذج الأول للمستخدمين'
              : 'لم يتم رفع أي نماذج بعد'
            }
          </p>
          {canManageTemplates && (
            <Button onClick={handleCreateNew} className="gap-2">
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف النموذج "{templateToDelete?.name}"؟ 
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => templateToDelete && deleteMutation.mutate(templateToDelete._id)}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TemplatesPage;
