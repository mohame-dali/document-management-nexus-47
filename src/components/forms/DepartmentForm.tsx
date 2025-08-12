
import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Department } from '@/types';

interface DepartmentFormProps {
  initialData?: Department;
  onSubmit: (data: Partial<Department>) => Promise<void>;
}

const DepartmentForm = ({ initialData, onSubmit }: DepartmentFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
    }
  });

  const onFormSubmit = async (data: Partial<Department>) => {
    try {
      await onSubmit(data);
      toast({
        title: `تم ${initialData ? 'تحديث' : 'إنشاء'} القسم بنجاح`,
        variant: "default",
      });
      navigate('/dashboard/departments');
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.response?.data?.error || 'حدث خطأ ما',
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4" dir="rtl">
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 max-w-md">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            اسم القسم *
          </label>
          <Input
            id="name"
            {...register('name', { required: 'اسم القسم مطلوب' })}
            className={errors.name ? 'border-red-500' : ''}
            placeholder="أدخل اسم القسم"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            الوصف
          </label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="أدخل وصف القسم (اختياري)"
            rows={3}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'جاري الحفظ...' : initialData ? 'تحديث القسم' : 'إنشاء القسم'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard/departments')}>
            إلغاء
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DepartmentForm;
