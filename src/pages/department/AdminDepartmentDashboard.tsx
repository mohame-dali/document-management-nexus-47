
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartmentContext } from '@/components/department/DepartmentContext';
import DepartmentSwitcher from '@/components/department/DepartmentSwitcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  FileText, 
  Users, 
  FolderOpen, 
  MessageSquare,
  Plus,
  Eye,
  Edit,
  Shield,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDepartmentDashboard = () => {
  const { currentUser } = useAuth();
  const { activeDepartment, isMultiDepartment } = useDepartmentContext();
  const navigate = useNavigate();

  if (!currentUser || currentUser.role !== 'AdminDepartment') {
    return (
      <div className="p-6" dir="rtl">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          غير مخول للوصول لهذه الصفحة
        </div>
      </div>
    );
  }

  if (!activeDepartment) {
    return (
      <div className="p-6" dir="rtl">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          لا يوجد قسم نشط. يرجى التواصل مع المدير لتخصيص قسم لك.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header with Department Info */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a202c]">
            لوحة تحكم إدارة القسم
          </h1>
          <p className="text-sm text-[#4a5568] mt-1">
            إدارة الوثائق والمستخدمين في قسم {activeDepartment.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs px-3 py-1 bg-[#ebf4ff] text-[#2c5282] border-[#bee3f8] font-medium">
            {currentUser.role}
          </Badge>
        </div>
      </div>

      {/* Department Switcher for multi-department users */}
      {isMultiDepartment && <DepartmentSwitcher />}

      {/* Active Department Info Banner */}
      <div className="bg-[#ebf4ff] border border-[#bee3f8] rounded p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Building className="h-6 w-6 text-[#2c5282] flex-shrink-0" />
          <div>
            <h3 className="text-xs font-semibold text-[#2c5282]">القسم النشط</h3>
            <p className="text-base font-bold text-[#1a202c]">{activeDepartment.name}</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-white text-[#2c5282] border-[#bee3f8] text-xs font-medium px-2.5 py-1">
          قسم مفعل
        </Badge>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* User Management */}
        <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm hover:shadow-md transition-shadow min-h-[200px] flex flex-col">
          <div className="flex items-center justify-between">
            <Users className="h-8 w-8 text-[#2c5282]" />
            <span className="text-xs bg-[#f7fafc] border border-[#e2e8f0] text-[#718096] px-2 py-0.5 rounded font-normal">
              المستخدمين
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#1a202c] mt-4">إدارة المستخدمين</h3>
          <p className="text-sm text-[#4a5568] mt-2 flex-1">
            إنشاء وتعديل وإدارة حسابات المستخدمين التابعين لقسم {activeDepartment.name}.
          </p>
          <div className="flex gap-2 mt-auto pt-4 border-t border-[#f1f5f9]">
            <Button 
              size="sm" 
              onClick={() => navigate('/dashboard/users')}
              className="flex-1 h-10 bg-[#2c5282] text-white hover:bg-[#2a4365] rounded font-medium gap-1.5"
            >
              <Eye className="h-4 w-4" />
              عرض
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/dashboard/users/create')}
              className="flex-1 h-10 border border-[#e2e8f0] text-[#4a5568] hover:bg-[#f7fafc] rounded font-medium gap-1.5"
            >
              <Plus className="h-4 w-4" />
              إضافة
            </Button>
          </div>
        </div>

        {/* Incoming Documents */}
        <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm hover:shadow-md transition-shadow min-h-[200px] flex flex-col">
          <div className="flex items-center justify-between">
            <FileText className="h-8 w-8 text-[#2c5282]" />
            <span className="text-xs bg-[#f7fafc] border border-[#e2e8f0] text-[#718096] px-2 py-0.5 rounded font-normal">
              الوارد
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#1a202c] mt-4">الوثائق الواردة</h3>
          <p className="text-sm text-[#4a5568] mt-2 flex-1">
            إدارة ومتابعة المراسلات الواردة للقسم وتعيين المسؤولين وإضافة الردود.
          </p>
          <div className="flex gap-2 mt-auto pt-4 border-t border-[#f1f5f9]">
            <Button 
              size="sm"
              onClick={() => navigate('/dashboard/incoming-documents')}
              className="flex-1 h-10 bg-[#2c5282] text-white hover:bg-[#2a4365] rounded font-medium gap-1.5"
            >
              <Eye className="h-4 w-4" />
              عرض
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/dashboard/incoming-documents')}
              className="flex-1 h-10 border border-[#e2e8f0] text-[#4a5568] hover:bg-[#f7fafc] rounded font-medium gap-1.5"
            >
              <Edit className="h-4 w-4" />
              إدارة
            </Button>
          </div>
        </div>

        {/* Outgoing Documents */}
        <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm hover:shadow-md transition-shadow min-h-[200px] flex flex-col">
          <div className="flex items-center justify-between">
            <FileText className="h-8 w-8 text-[#2c5282]" />
            <span className="text-xs bg-[#f7fafc] border border-[#e2e8f0] text-[#718096] px-2 py-0.5 rounded font-normal">
              الصادر
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#1a202c] mt-4">الوثائق الصادرة</h3>
          <p className="text-sm text-[#4a5568] mt-2 flex-1">
            عرض وتنظيم المراسلات والوثائق الصادرة الرسمية من القسم.
          </p>
          <div className="flex gap-2 mt-auto pt-4 border-t border-[#f1f5f9]">
            <Button 
              size="sm" 
              onClick={() => navigate('/dashboard/outgoing-documents')}
              className="flex-1 h-10 bg-[#2c5282] text-white hover:bg-[#2a4365] rounded font-medium gap-1.5"
            >
              <Eye className="h-4 w-4" />
              عرض
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/dashboard/outgoing-documents')}
              className="flex-1 h-10 border border-[#e2e8f0] text-[#4a5568] hover:bg-[#f7fafc] rounded font-medium gap-1.5"
            >
              <Edit className="h-4 w-4" />
              إدارة
            </Button>
          </div>
        </div>

        {/* Folder Management */}
        <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm hover:shadow-md transition-shadow min-h-[200px] flex flex-col">
          <div className="flex items-center justify-between">
            <FolderOpen className="h-8 w-8 text-[#2c5282]" />
            <span className="text-xs bg-[#f7fafc] border border-[#e2e8f0] text-[#718096] px-2 py-0.5 rounded font-normal">
              التنظيم
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#1a202c] mt-4">إدارة المجلدات</h3>
          <p className="text-sm text-[#4a5568] mt-2 flex-1">
            تنظيم وفهرسة وثائق ومراسلات القسم ضمن مجلدات وتصنيفات مخصصة.
          </p>
          <div className="flex gap-2 mt-auto pt-4 border-t border-[#f1f5f9]">
            <Button 
              size="sm"
              onClick={() => navigate('/dashboard/folders')}
              className="w-full h-10 bg-[#2c5282] text-white hover:bg-[#2a4365] rounded font-medium gap-1.5"
            >
              <FolderOpen className="h-4 w-4" />
              إدارة المجلدات
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm hover:shadow-md transition-shadow min-h-[200px] flex flex-col">
          <div className="flex items-center justify-between">
            <MessageSquare className="h-8 w-8 text-[#2c5282]" />
            <span className="text-xs bg-[#f7fafc] border border-[#e2e8f0] text-[#718096] px-2 py-0.5 rounded font-normal">
              التواصل
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#1a202c] mt-4">الرسائل والمحادثات</h3>
          <p className="text-sm text-[#4a5568] mt-2 flex-1">
            إرسال واستقبال التنبيهات والرسائل الإدارية مع مستخدمي القسم.
          </p>
          <div className="flex gap-2 mt-auto pt-4 border-t border-[#f1f5f9]">
            <Button 
              size="sm"
              onClick={() => navigate('/dashboard/messages')}
              className="w-full h-10 bg-[#2c5282] text-white hover:bg-[#2a4365] rounded font-medium gap-1.5"
            >
              <MessageSquare className="h-4 w-4" />
              الرسائل
            </Button>
          </div>
        </div>
      </div>

      {/* Section: صلاحيات إدارة القسم */}
      <div className="mt-8 bg-[#f7fafc] border border-[#e2e8f0] rounded p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e2e8f0]">
          <Shield className="h-5 w-5 text-[#2c5282]" />
          <h3 className="text-base font-bold text-[#1a202c]">
            صلاحيات إدارة القسم
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-2 text-sm text-[#4a5568]">
            <CheckCircle2 className="h-4 w-4 text-[#38a169] flex-shrink-0 mt-0.5" />
            <span>إنشاء وتعديل وإدارة حسابات المستخدمين التابعين للقسم</span>
          </div>

          <div className="flex items-start gap-2 text-sm text-[#4a5568]">
            <CheckCircle2 className="h-4 w-4 text-[#38a169] flex-shrink-0 mt-0.5" />
            <span>تحديد وتعيين المسؤولين ومتابعة مسار الوثائق الواردة</span>
          </div>

          <div className="flex items-start gap-2 text-sm text-[#4a5568]">
            <CheckCircle2 className="h-4 w-4 text-[#38a169] flex-shrink-0 mt-0.5" />
            <span>إضافة الردود والإجراءات الإدارية على المراسلات الواردة</span>
          </div>

          <div className="flex items-start gap-2 text-sm text-[#4a5568]">
            <CheckCircle2 className="h-4 w-4 text-[#38a169] flex-shrink-0 mt-0.5" />
            <span>تنظيم الوثائق وفهرستها ضمن مجلدات وتصنيفات إدارية</span>
          </div>

          <div className="flex items-start gap-2 text-sm text-[#4a5568]">
            <CheckCircle2 className="h-4 w-4 text-[#38a169] flex-shrink-0 mt-0.5" />
            <span>البحث والاستعلام المتقدم في أرشيف وثائق القسم النشط</span>
          </div>

          <div className="flex items-start gap-2 text-sm text-[#4a5568]">
            <CheckCircle2 className="h-4 w-4 text-[#38a169] flex-shrink-0 mt-0.5" />
            <span>الوصول محصور بحدود القسم النشط مع إمكانية التبديل عند توفر الصلاحية</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDepartmentDashboard;
