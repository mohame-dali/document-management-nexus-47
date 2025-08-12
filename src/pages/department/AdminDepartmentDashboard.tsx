
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartmentContext } from '@/components/department/DepartmentContext';
import DepartmentSwitcher from '@/components/department/DepartmentSwitcher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Edit
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDepartmentDashboard = () => {
  const { currentUser } = useAuth();
  const { activeDepartment, isMultiDepartment } = useDepartmentContext();
  const navigate = useNavigate();

  if (!currentUser || currentUser.role !== 'AdminDepartment') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          غير مخول للوصول لهذه الصفحة
        </div>
      </div>
    );
  }

  if (!activeDepartment) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          لا يوجد قسم نشط. يرجى التواصل مع المدير لتخصيص قسم لك.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header with Department Info */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              لوحة تحكم إدارة القسم
            </h1>
            <p className="text-gray-600 mt-1">
              إدارة الوثائق والمستخدمين في قسم {activeDepartment.name}
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {currentUser.role}
          </Badge>
        </div>

        {/* Department Switcher for multi-department users */}
        {isMultiDepartment && <DepartmentSwitcher />}

        {/* Active Department Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">القسم النشط</h3>
                <p className="text-blue-700">{activeDepartment.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Management */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إدارة المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">قسم {activeDepartment.name}</div>
            <p className="text-xs text-muted-foreground mb-4">
              إنشاء وتعديل وإدارة المستخدمين في القسم
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => navigate('/dashboard/users')}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-1" />
                عرض
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/dashboard/users/create')}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                إضافة
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Incoming Documents */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الوثائق الواردة</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">الإدارة والمتابعة</div>
            <p className="text-xs text-muted-foreground mb-4">
              إدارة الوثائق الواردة للقسم وتحديد المسؤولين
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm"
                onClick={() => navigate('/dashboard/incoming-documents')}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-1" />
                عرض
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/dashboard/incoming-documents')}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-1" />
                إدارة
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Outgoing Documents */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الوثائق الصادرة</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">إدارة الصادر</div>
            <p className="text-xs text-muted-foreground mb-4">
              عرض وتنظيم الوثائق الصادرة من القسم
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm"
                onClick={() => navigate('/dashboard/outgoing-documents')}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-1" />
                عرض
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/dashboard/outgoing-documents')}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-1" />
                إدارة
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Folder Management */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إدارة المجلدات</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">التصنيف والتنظيم</div>
            <p className="text-xs text-muted-foreground mb-4">
              تنظيم الوثائق في مجلدات وفئات
            </p>
            <Button 
              size="sm"
              onClick={() => navigate('/dashboard/folders')}
              className="w-full"
            >
              <FolderOpen className="h-4 w-4 mr-1" />
              إدارة المجلدات
            </Button>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الرسائل</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">التواصل</div>
            <p className="text-xs text-muted-foreground mb-4">
              إرسال واستقبال الرسائل مع المستخدمين
            </p>
            <Button 
              size="sm"
              onClick={() => navigate('/dashboard/messages')}
              className="w-full"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              الرسائل
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Department Capabilities Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            صلاحيات إدارة القسم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2 text-green-700">الصلاحيات المتاحة:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• إنشاء وتعديل المستخدمين في القسم</li>
                <li>• تحديد المسؤولين للوثائق الواردة</li>
                <li>• إضافة ردود على الوثائق الواردة</li>
                <li>• تنظيم الوثائق في مجلدات</li>
                <li>• البحث في وثائق القسم</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-blue-700">نطاق العمل:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• الوصول محدود بالقسم النشط</li>
                <li>• إدارة المستخدمين داخل القسم فقط</li>
                <li>• عرض الوثائق المخصصة للقسم</li>
                {isMultiDepartment && (
                  <li>• إمكانية التبديل بين الأقسام المتعددة</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDepartmentDashboard;
