
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getFolders } from '@/services/folderService';
import { 
  Archive, 
  FolderTree, 
  BarChart3, 
  Settings,
  Eye,
  Lock,
  Users,
  Building2,
  Sparkles,
  Calendar,
  FileText,
  Zap
} from 'lucide-react';
import FolderTreeView from './FolderTreeView';
import EnhancedFolderTree from './EnhancedFolderTree';
import DocumentCategoryManager from './DocumentCategoryManager';
import { FolderDocumentsModal } from './FolderDocumentsModal';
import { Folder } from '@/types';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

interface FolderManagementProps {
  readOnly?: boolean;
}

const FolderManagement: React.FC<FolderManagementProps> = ({ readOnly = false }) => {
  const { currentUser } = useAuth();
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('enhanced');
  
  // AdminTuningDesk can see all departments, others see their active department
  const targetDepartmentId = currentUser?.role === 'AdminTuningDesk' 
    ? undefined // No filter - see all departments
    : currentUser?.activeDepartment?._id;

  const { data: folders } = useQuery({
    queryKey: ['folders', targetDepartmentId],
    queryFn: () => getFolders(targetDepartmentId),
    enabled: !!currentUser,
  });

  // AdminDepartment can manage folders (create, edit, delete), AdminTuningDesk is read-only
  const canManageFolders = currentUser?.role === 'AdminDepartment' && !readOnly;
  
  // All specified roles can view folders
  const canViewFolders = currentUser?.role === 'SuperAdmin' ||
                        currentUser?.role === 'Admin' || 
                        currentUser?.role === 'AdminTuningDesk' || 
                        currentUser?.role === 'AdminDepartment' ||
                        currentUser?.role === 'User';

  const handleFolderSelect = (folder: Folder) => {
    setSelectedFolder(folder);
    setIsDocumentsModalOpen(true);
  };

  const handleCloseDocumentsModal = () => {
    setIsDocumentsModalOpen(false);
    setSelectedFolder(null);
  };

  // Get current date in Arabic format
  const getCurrentArabicDate = () => {
    return formatArabicDate(new Date());
  };

  const getRoleDisplayInfo = () => {
    switch (currentUser?.role) {
      case 'AdminTuningDesk':
        return {
          title: 'مراقبة الأرشيف المتقدمة',
          subtitle: 'يمكنك عرض ومراقبة تنظيم المجلدات والمستندات لجميع الأقسام مع إحصائيات مفصلة',
          badge: { text: 'مراقبة شاملة لجميع الأقسام', variant: 'secondary' as const, icon: Eye },
          bgGradient: 'from-violet-50 via-purple-50 to-fuchsia-50',
          iconBg: 'from-violet-500 via-purple-600 to-fuchsia-700',
          accentColor: 'border-violet-400'
        };
      case 'AdminDepartment':
        return {
          title: 'إدارة الأرشيف الشاملة',
          subtitle: 'إدارة كاملة للمجلدات وتصنيف المستندات مع صلاحيات الإنشاء والتعديل والحذف',
          badge: { text: 'إدارة كاملة', variant: 'default' as const, icon: Settings },
          bgGradient: 'from-cyan-50 via-blue-50 to-indigo-50',
          iconBg: 'from-cyan-500 via-blue-600 to-indigo-700',
          accentColor: 'border-blue-400'
        };
      case 'User':
        return {
          title: 'عرض الأرشيف',
          subtitle: 'يمكنك عرض تنظيم المجلدات والمستندات في قسمك مع واجهة سهلة الاستخدام',
          badge: { text: 'للعرض فقط', variant: 'secondary' as const, icon: Lock },
          bgGradient: 'from-slate-50 via-gray-50 to-zinc-50',
          iconBg: 'from-slate-500 via-gray-600 to-zinc-700',
          accentColor: 'border-gray-400'
        };
      default:
        return {
          title: 'إدارة الأرشيف المتطورة',
          subtitle: 'إدارة شاملة لنظام الأرشيف مع أدوات متقدمة للتنظيم والمراقبة',
          badge: { text: 'إدارة شاملة', variant: 'default' as const, icon: Settings },
          bgGradient: 'from-emerald-50 via-teal-50 to-green-50',
          iconBg: 'from-emerald-500 via-teal-600 to-green-700',
          accentColor: 'border-emerald-400'
        };
    }
  };

  const roleInfo = getRoleDisplayInfo();

  if (!canViewFolders) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
        <Card className="max-w-lg w-full shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-red-100 to-orange-100 rounded-full blur-xl opacity-60"></div>
              <div className="relative p-6 bg-gradient-to-r from-red-500 to-orange-600 rounded-full w-fit mx-auto">
                <Lock className="h-16 w-16 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">ليس لديك صلاحية للوصول</h2>
            <p className="text-gray-600 text-lg leading-relaxed">ليس لديك الصلاحية لعرض إدارة المجلدات في هذا النظام</p>
            <p className="text-gray-500 text-sm mt-4">يرجى التواصل مع مدير النظام للحصول على الصلاحيات المطلوبة</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Modern Header */}
        <Card className={`shadow-2xl border-0 bg-gradient-to-r ${roleInfo.bgGradient} overflow-hidden relative group hover:shadow-3xl transition-all duration-500`}>
          {/* Animated Border */}
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${roleInfo.iconBg} animate-pulse`}></div>
          
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-white to-transparent rounded-full blur-3xl"></div>
            <div className="absolute bottom-4 left-4 w-24 h-24 bg-gradient-to-tl from-white to-transparent rounded-full blur-2xl"></div>
          </div>

          <CardHeader className="relative pb-8 pt-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-br ${roleInfo.iconBg} rounded-3xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300`}></div>
                  <div className={`relative p-6 bg-gradient-to-br ${roleInfo.iconBg} rounded-3xl shadow-2xl group-hover:scale-105 transition-transform duration-300`}>
                    <Archive className="h-12 w-12 text-white" />
                    <div className="absolute -top-2 -right-2 animate-bounce">
                      <Sparkles className="h-6 w-6 text-yellow-300" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <CardTitle className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                      {roleInfo.title}
                      <Zap className="h-8 w-8 text-yellow-500 animate-pulse" />
                    </CardTitle>
                    <p className="text-lg text-gray-700 max-w-3xl leading-relaxed">
                      {roleInfo.subtitle}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <Badge variant="outline" className="bg-white/90 backdrop-blur-sm border-white/40 text-gray-700 px-4 py-2 text-sm font-medium shadow-lg">
                      <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                      {currentUser?.role === 'AdminTuningDesk' 
                        ? 'جميع الأقسام' 
                        : currentUser?.activeDepartment?.name || 'جميع الأقسام'
                      }
                    </Badge>
                    <Badge variant="outline" className="bg-white/90 backdrop-blur-sm border-white/40 text-gray-700 px-4 py-2 text-sm font-medium shadow-lg">
                      <FileText className="h-4 w-4 mr-2 text-green-600" />
                      {folders?.length || 0} مجلد
                    </Badge>
                    <Badge variant="outline" className="bg-white/90 backdrop-blur-sm border-white/40 text-gray-700 px-4 py-2 text-sm font-medium shadow-lg">
                      <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                      محدث في {getCurrentArabicDate()}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Badge variant={roleInfo.badge.variant} className={`flex items-center gap-3 px-6 py-3 text-lg font-medium shadow-2xl bg-white/90 backdrop-blur-sm ${roleInfo.accentColor} border-2 hover:scale-105 transition-transform duration-300`}>
                <roleInfo.badge.icon className="h-6 w-6" />
                {roleInfo.badge.text}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content Layout - Full width tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <TabsList className="grid w-full grid-cols-3 h-16 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-2 shadow-inner">
                <TabsTrigger 
                  value="enhanced" 
                  className="flex items-center gap-4 text-base font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-700 hover:bg-white/60 transition-all duration-300"
                >
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <span className="hidden sm:inline">العرض المحسن</span>
                  <span className="sm:hidden">محسن</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="tree" 
                  className="flex items-center gap-4 text-base font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-700 hover:bg-white/60 transition-all duration-300"
                >
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg">
                    <FolderTree className="h-5 w-5 text-white" />
                  </div>
                  <span className="hidden sm:inline">الهيكل الهرمي</span>
                  <span className="sm:hidden">هرمي</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="categorization" 
                  className="flex items-center gap-4 text-base font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-green-700 hover:bg-white/60 transition-all duration-300"
                >
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <span className="hidden sm:inline">تصنيف المستندات</span>
                  <span className="sm:hidden">تصنيف</span>
                </TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>

          <TabsContent value="enhanced" className="mt-8">
            <div className="animate-fade-in">
              <EnhancedFolderTree
                onFolderSelect={handleFolderSelect}
                selectedFolderId={selectedFolder?._id}
                departmentId={targetDepartmentId}
                readOnly={!canManageFolders}
              />
            </div>
          </TabsContent>

          <TabsContent value="tree" className="mt-8">
            <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
              <CardContent className="p-10">
                <div className="animate-scale-in">
                  <FolderTreeView
                    onFolderSelect={handleFolderSelect}
                    selectedFolderId={selectedFolder?._id}
                    departmentId={targetDepartmentId}
                    readOnly={!canManageFolders}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categorization" className="mt-8">
            <div className="animate-fade-in">
              <DocumentCategoryManager
                folders={folders || []}
                canManage={canManageFolders}
                departmentId={targetDepartmentId}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Documents Modal */}
        <FolderDocumentsModal
          selectedFolder={selectedFolder}
          isOpen={isDocumentsModalOpen}
          onClose={handleCloseDocumentsModal}
          canManage={canManageFolders}
        />
      </div>
    </div>
  );
};

export default FolderManagement;
