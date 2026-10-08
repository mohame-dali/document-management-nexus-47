import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createDepartment } from '@/services/departmentService';
import DepartmentForm, { DepartmentFormData } from '@/components/forms/DepartmentForm';
import { toast } from 'sonner';
import { Building, ArrowRight, Info, ShieldCheck, FolderTree } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const CreateDepartment: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSubmit = async (data: DepartmentFormData) => {
    try {
      await createDepartment(data);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('تم إنشاء القسم بنجاح');
      navigate('/dashboard/departments');
    } catch (error: unknown) {
      console.error('Error creating department:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { error?: string } } }).response?.data?.error
        ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : 'فشل في إنشاء القسم';
      toast.error(errorMsg);
      throw error;
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">إضافة قسم جديد</h1>
            <p className="text-base text-gray-600 mt-1">
              تسجيل وحدة إدارية جديدة في الهيكل التنظيمي للمنظومة
            </p>
          </div>
        </div>

        <Link
          to="/dashboard/departments"
          className="inline-flex items-center gap-2 h-11 px-5 bg-white border border-[#cbd5e1] hover:bg-gray-100 text-[#1a202c] text-base font-medium rounded transition-colors w-fit"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة لقائمة الأقسام</span>
        </Link>
      </div>

      {/* Helpful Guidelines Card */}
      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 sm:p-5 flex items-start gap-3.5">
        <div className="w-9 h-9 rounded bg-[#FFCB56]/20 text-[#1a202c] border border-[#FFCB56]/50 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="h-5 w-5 text-[#2c5282]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#1a202c]">ملاحظات حول الهيكل التنظيمي للأقسام</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            يمثل القسم وحدة تنظيمية رئيسية في إدارة الوثائق والمراسلات. بمجرد إنشاء القسم، ستتمكن من ربط المستخدمين به، وتوجيه البريد الوارد والصادر إليه، وإنشاء مجلدات أرشيفية خاصة به.
          </p>
        </div>
      </div>

      {/* Department Form */}
      <DepartmentForm onSubmit={handleSubmit} />
    </div>
  );
};

export default CreateDepartment;
