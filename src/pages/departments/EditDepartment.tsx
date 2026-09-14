import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDepartments, updateDepartment } from '@/services/departmentService';
import DepartmentForm, { DepartmentFormData } from '@/components/forms/DepartmentForm';
import { toast } from 'sonner';
import { Building, ArrowRight, AlertCircle, Info, Calendar, ShieldCheck, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

const EditDepartment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    refetchInterval: 30000,
  });

  const handleSubmit = async (data: DepartmentFormData) => {
    if (!id) return;
    try {
      await updateDepartment(id, data);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('تم تحديث بيانات القسم بنجاح');
      navigate('/dashboard/departments');
    } catch (error: unknown) {
      console.error('Error updating department:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { error?: string } } }).response?.data?.error
        ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : 'فشل في تحديث القسم';
      toast.error(errorMsg);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full" dir="rtl">
        <div className="flex flex-col items-center gap-4 p-8 bg-white border border-[#e2e8f0] rounded">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2c5282]"></div>
          <p className="text-base text-gray-600 font-medium">جاري تحميل بيانات القسم...</p>
        </div>
      </div>
    );
  }

  const department = departments?.find(d => d._id === id);

  if (!department) {
    return (
      <div className="w-full max-w-[1200px] mx-auto p-6" dir="rtl">
        <div className="bg-red-50 border border-red-200 text-red-800 p-5 rounded flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
          <div>
            <h3 className="font-bold text-base">القسم غير موجود</h3>
            <p className="text-sm mt-1">تعذر العثور على القسم المطلوب في قاعدة البيانات.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">
              تعديل بيانات القسم: <span className="text-[#2c5282]">{department.name}</span>
            </h1>
            <p className="text-base text-gray-600 mt-1">
              تحديث تفاصيل ومعلومات الوحدة التنظيمية
            </p>
          </div>
        </div>

        <Link
          to="/dashboard/departments"
          className="inline-flex items-center gap-2 h-11 px-5 bg-white border border-[#cbd5e1] hover:bg-gray-100 text-[#1a202c] text-base font-medium rounded transition-colors w-fit"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة للأقسام</span>
        </Link>
      </div>

      {/* Department Metadata Info Card */}
      <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
        <CardHeader className="pb-4 border-b border-[#e2e8f0]">
          <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#1a202c]">
            <div className="w-9 h-9 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <span>معلومات تعريفية عن القسم</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-base">
            <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-1">
              <span className="text-sm font-semibold text-gray-500 block flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#2c5282]" />
                تاريخ الإنشاء
              </span>
              <p className="font-medium text-[#1a202c]">
                {department.createdAt ? formatArabicDate(department.createdAt) : 'غير مسجل'}
              </p>
            </div>

            <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-1">
              <span className="text-sm font-semibold text-gray-500 block flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#2c5282]" />
                الحالة التشغيلية
              </span>
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  department.isActive 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-1 ${department.isActive ? 'bg-emerald-600' : 'bg-red-500'}`}></span>
                  {department.isActive ? 'قسم نشط ومتاح للمعاملات' : 'قسم معطل حالياً'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-1">
              <span className="text-sm font-semibold text-gray-500 block flex items-center gap-1.5">
                <Hash className="h-4 w-4 text-[#2c5282]" />
                المعرف النظامي
              </span>
              <p className="font-mono text-xs text-gray-700 truncate" title={department._id}>
                {department._id}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Component */}
      <DepartmentForm 
        initialData={department} 
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default EditDepartment;
