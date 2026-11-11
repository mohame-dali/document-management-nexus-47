import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Department } from '@/types';
import { Building, ArrowRight, Check, RefreshCw, AlertCircle, FileText } from 'lucide-react';

export interface DepartmentFormData {
  name: string;
  description?: string;
  isActive?: boolean;
}

interface DepartmentFormProps {
  initialData?: Department;
  onSubmit: (data: DepartmentFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const DepartmentForm: React.FC<DepartmentFormProps> = ({ 
  initialData, 
  onSubmit,
  isSubmitting: externalIsSubmitting
}) => {
  const navigate = useNavigate();
  const isEditMode = !!initialData;

  const { 
    register, 
    handleSubmit, 
    setValue,
    watch,
    formState: { errors, isSubmitting: internalIsSubmitting } 
  } = useForm<DepartmentFormData>({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      isActive: initialData?.isActive !== undefined ? initialData.isActive : true
    }
  });

  const isSubmitting = externalIsSubmitting ?? internalIsSubmitting;
  const isActiveValue = watch('isActive');

  const onFormSubmit = async (data: DepartmentFormData) => {
    try {
      await onSubmit(data);
    } catch (error: unknown) {
      console.error('Error in DepartmentForm submission:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { error?: string } } }).response?.data?.error
        ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : 'حدث خطأ أثناء حفظ بيانات القسم';
      toast.error(errorMsg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6" dir="rtl">
      {/* Department Basic Details Card */}
      <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
        <CardHeader className="pb-4 border-b border-[#e2e8f0]">
          <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#1a202c]">
            <div className="w-9 h-9 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
              <Building className="h-5 w-5" />
            </div>
            <span>بيانات القسم الأساسية</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Department Name */}
          <div className="space-y-2">
            <label htmlFor="dept-name" className="block text-base font-bold text-[#1a202c]">
              اسم القسم <span className="text-red-500 font-bold">*</span>
            </label>
            <Input
              id="dept-name"
              {...register('name', { 
                required: 'اسم القسم مطلوب ولا يمكن تركه فارغاً',
                minLength: { value: 2, message: 'اسم القسم يجب أن يحتوي على حرفين على الأقل' }
              })}
              placeholder="مثال: قسم الشؤون القانونية والإدارية"
              className={`h-11 text-base px-4 bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] ${
                errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
              }`}
            />
            {errors.name ? (
              <p className="text-sm text-red-600 font-medium flex items-center gap-1.5 mt-1">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors.name.message}</span>
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                الاسم الرسمي للقسم كما سيظهر في كافة المعاملات والمراسلات والمجلدات
              </p>
            )}
          </div>

          {/* Department Description */}
          <div className="space-y-2">
            <label htmlFor="dept-description" className="block text-base font-bold text-[#1a202c]">
              وصف القسم والاختصاصات
            </label>
            <Textarea
              id="dept-description"
              {...register('description')}
              placeholder="أدخل نبذة مختصرة عن مهام واختصاصات هذا القسم (اختياري)..."
              rows={4}
              className="min-h-[110px] text-base p-3.5 bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] leading-relaxed"
            />
            <p className="text-sm text-gray-500">
              معلومات إضافية توضح طبيعة عمل القسم لتسهيل توزيع المراسلات بدقة
            </p>
          </div>

          {/* Active Status Toggle (available for both, especially useful in edit mode) */}
          <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded flex items-start gap-3">
            <Checkbox
              id="dept-status"
              checked={isActiveValue}
              onCheckedChange={(checked) => setValue('isActive', !!checked)}
              className="h-5 w-5 mt-0.5 data-[state=checked]:bg-[#2c5282] data-[state=checked]:border-[#2c5282]"
            />
            <div className="space-y-1">
              <label 
                htmlFor="dept-status" 
                className="text-base font-bold text-[#1a202c] cursor-pointer block select-none"
              >
                قسم نشط ومفعل
              </label>
              <p className="text-sm text-gray-600 leading-normal">
                الأقسام النشطة تظهر في خيارات التوجيه، وإحالة الوثائق، وتعيين المستخدمين، بينما تبقى الأقسام المعطلة محفوظة في السجلات دون إمكانية إسناد معاملات جديدة لها.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Action Footer */}
      <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#f8fafc] border border-[#e2e8f0] rounded p-6 shadow-sm">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/dashboard/departments')}
          className="h-11 px-6 border-[#cbd5e1] hover:bg-gray-100 text-base font-medium rounded text-gray-700 flex items-center justify-center gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          <span>إلغاء والعودة</span>
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 px-8 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-bold rounded shadow-none flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>{isEditMode ? 'حفظ تعديلات القسم' : 'إنشاء القسم الجديد'}</span>
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </form>
  );
};

export default DepartmentForm;
