import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getDepartmentUsers, getDepartment } from '@/services/departmentService';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Building, ArrowRight, Users, Shield, UserCheck, AlertCircle } from 'lucide-react';
import { User } from '@/types';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

const DepartmentUsersPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: department } = useQuery({
    queryKey: ['departments', id],
    queryFn: () => (id ? getDepartment(id) : Promise.reject('No ID')),
    enabled: !!id,
  });

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['departmentUsers', id],
    queryFn: () => (id ? getDepartmentUsers(id) : Promise.reject('No ID')),
    enabled: !!id,
  });

  const getPhotoUrl = (photoPath: string) => {
    if (!photoPath) return '';
    if (photoPath.startsWith('http')) return photoPath;
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
    const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
    return `${baseUrl}${cleanPath}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full" dir="rtl">
        <div className="flex flex-col items-center gap-4 p-8 bg-white border border-[#e2e8f0] rounded">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2c5282]"></div>
          <p className="text-base text-gray-600 font-medium">جاري تحميل قائمة المستخدمين التابعين للقسم...</p>
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
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">
              مستخدمو القسم: <span className="text-[#2c5282]">{department?.name || 'القسم المحدد'}</span>
            </h1>
            <p className="text-base text-gray-600 mt-1">
              عرض كافة الحسابات والموظفين المرتبطين بهذا القسم وصلاحياتهم
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

      {/* Summary card */}
      <div className="bg-white border border-[#e2e8f0] rounded p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#FFCB56]/20 text-[#1a202c] border border-[#FFCB56]/50 flex items-center justify-center shrink-0">
            <Building className="h-5 w-5 text-[#2c5282]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1a202c]">{department?.name}</h2>
            <p className="text-sm text-gray-600">{department?.description || 'لا يوجد وصف مسجل لهذا القسم'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">إجمالي المنسوبين:</span>
          <span className="px-3 py-1 bg-blue-50 text-[#2c5282] font-bold text-sm rounded border border-blue-200">
            {users.length} {users.length === 1 ? 'مستخدم' : 'مستخدمين'}
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#e2e8f0] rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-[#f8fafc] border-b border-[#e2e8f0]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-right py-4 px-4 text-sm font-bold text-gray-700 w-16">الصورة</TableHead>
                <TableHead className="text-right py-4 px-4 text-sm font-bold text-gray-700 min-w-[160px]">اسم المستخدم</TableHead>
                <TableHead className="text-right py-4 px-4 text-sm font-bold text-gray-700 min-w-[140px]">الدور الوظيفي</TableHead>
                <TableHead className="text-right py-4 px-4 text-sm font-bold text-gray-700 min-w-[140px]">تاريخ الانضمام</TableHead>
                <TableHead className="text-right py-4 px-4 text-sm font-bold text-gray-700 min-w-[120px]">حالة الحساب</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-base text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-gray-400" />
                      <span>لا يوجد أي مستخدم مرتبط بهذا القسم حالياً.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow 
                    key={user._id} 
                    className="min-h-[64px] h-16 hover:bg-slate-50/80 transition-colors duration-150 border-b border-[#e2e8f0]"
                  >
                    {/* Photo */}
                    <TableCell className="text-right py-3 px-4">
                      <Avatar className="h-11 w-11 rounded-full border border-[#cbd5e1] overflow-hidden bg-gray-50">
                        {user.photo ? (
                          <AvatarImage src={getPhotoUrl(user.photo)} alt={user.username} className="object-cover" />
                        ) : (
                          <AvatarFallback className="text-sm font-bold bg-[#2c5282]/10 text-[#2c5282]">
                            {user.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </TableCell>

                    {/* Username */}
                    <TableCell className="text-right py-3 px-4 font-bold text-base text-[#1a202c]">
                      {user.username}
                    </TableCell>

                    {/* Role */}
                    <TableCell className="text-right py-3 px-4">
                      {user.role === 'SuperAdmin' || user.role === 'Admin' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded text-xs sm:text-sm font-bold bg-[#FFD758] text-[#1a202c] border border-[#e2be40]">
                          {user.role === 'SuperAdmin' ? 'مدير أعلى' : 'مدير'}
                        </span>
                      ) : user.role === 'AdminDepartment' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded text-xs sm:text-sm font-medium bg-[#2c5282] text-white">
                          مدير قسم
                        </span>
                      ) : user.role === 'AdminTuningDesk' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded text-xs sm:text-sm font-semibold bg-purple-100 text-purple-900 border border-purple-200">
                          مدير المكتب
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded text-xs sm:text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
                          مستخدم
                        </span>
                      )}
                    </TableCell>

                    {/* Join Date */}
                    <TableCell className="text-right py-3 px-4 text-sm text-gray-600 font-medium">
                      {user.createdAt ? formatArabicDate(user.createdAt) : 'غير مسجل'}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-right py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                        user.isActive 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-600' : 'bg-red-500'}`}></span>
                        <span>{user.isActive ? 'نشط' : 'معطل'}</span>
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default DepartmentUsersPage;
