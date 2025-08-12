
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield,
  Clock,
  User,
  FileText,
  Folder,
  ArrowRight,
  Activity,
  Zap,
  TrendingUp
} from 'lucide-react';
import { getAuditLogs } from '@/services/auditService';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatArabicDateTime } from '@/utils/arabicDateFormatter';

const AuditSummary: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const { data: recentLogs, isLoading } = useQuery({
    queryKey: ['auditLogs', 'recent'],
    queryFn: () => getAuditLogs({ limit: 10 }),
    enabled: currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Admin'
  });

  const getActionIcon = (action: string) => {
    if (action.includes('document')) return FileText;
    if (action.includes('folder')) return Folder;
    if (action.includes('user')) return User;
    return Shield;
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('update') || action.includes('move')) return 'bg-sky-50 text-sky-700 border-sky-200';
    if (action.includes('delete')) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'document_create': return 'إنشاء مستند';
      case 'document_update': return 'تحديث مستند';
      case 'document_delete': return 'حذف مستند';
      case 'folder_create': return 'إنشاء مجلد';
      case 'folder_update': return 'تحديث مجلد';
      case 'folder_delete': return 'حذف مجلد';
      case 'user_create': return 'إنشاء مستخدم';
      case 'user_update': return 'تحديث مستخدم';
      case 'user_delete': return 'حذف مستخدم';
      default: return action.replace(/_/g, ' ');
    }
  };

  if (currentUser?.role !== 'SuperAdmin' && currentUser?.role !== 'Admin') {
    return null;
  }

  return (
    <Card className="col-span-full bg-gradient-to-br from-white via-slate-50 to-blue-50 border-0 shadow-xl shadow-blue-100/50 hover:shadow-2xl hover:shadow-blue-200/60 transition-all duration-500 animate-fade-in-up" dir="rtl">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-md opacity-30 animate-pulse"></div>
              <div className="relative p-3 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Activity className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 bg-clip-text text-transparent">
                آخر أنشطة النظام
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span>مراقبة العمليات الحديثة في النظام</span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate('/dashboard/audit-trail')}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 px-6 py-2.5 rounded-xl"
          >
            <span className="flex items-center gap-2">
              عرض الكل
              <ArrowRight className="h-4 w-4" />
            </span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-purple-500 rounded-full animate-spin animate-reverse"></div>
            </div>
            <p className="mt-4 text-sm text-gray-600 font-medium">جاري التحميل...</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="space-y-4">
              {recentLogs?.data?.map((log, index) => {
                const ActionIcon = getActionIcon(log.action);
                return (
                  <div key={log._id} className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 hover:border-indigo-200 transition-all duration-300 hover:shadow-md animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg blur-sm opacity-50"></div>
                        <div className="relative p-3 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg shadow-sm group-hover:shadow-md transition-all duration-300">
                          <ActionIcon className="h-5 w-5 text-indigo-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={`${getActionColor(log.action)} border font-medium px-3 py-1 rounded-full transition-all duration-300 hover:scale-105`}>
                            {getActionText(log.action)}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-600 px-2 py-1 rounded-full">
                            {log.entityType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-indigo-100 rounded-full">
                              <User className="h-3 w-3 text-indigo-600" />
                            </div>
                            <span className="font-medium text-gray-800">{log.userDetails.username}</span>
                          </div>
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-500" />
                            <span className="text-xs text-gray-500">{log.userDetails.role}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="font-medium">
                          {formatArabicDateTime(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {recentLogs?.data?.length === 0 && (
                <div className="text-center py-12">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full blur-md opacity-50"></div>
                    <div className="relative p-6 bg-gradient-to-br from-gray-50 to-white rounded-full border border-gray-200 shadow-sm">
                      <Shield className="h-12 w-12 text-gray-400" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <h3 className="text-lg font-medium text-gray-600">لا توجد أنشطة حديثة</h3>
                    <p className="text-sm text-gray-500">لم يتم تسجيل أي أنشطة في النظام حتى الآن</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditSummary;
