
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
    if (action.includes('create')) return 'bg-[#ebf8f1] text-[#22543d] border-[#bbf0d0]';
    if (action.includes('update') || action.includes('move')) return 'bg-[#ebf4ff] text-[#2c5282] border-[#bee3f8]';
    if (action.includes('delete')) return 'bg-[#fff5f5] text-[#742a2a] border-[#fed7d7]';
    return 'bg-[#f7fafc] text-[#4a5568] border-[#e2e8f0]';
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
    <Card className="col-span-full bg-white border border-[#e2e8f0] shadow-sm rounded overflow-hidden" dir="rtl">
      <CardHeader className="bg-[#f7fafc] border-b border-[#e2e8f0] px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#ebf4ff] rounded border border-[#bee3f8] text-[#2c5282]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-[#1a202c]">
                آخر أنشطة النظام
              </CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-[#718096] mt-0.5">
                <TrendingUp className="h-3.5 w-3.5 text-[#38a169]" />
                <span>مراقبة العمليات الحديثة في النظام</span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate('/dashboard/audit-trail')}
            className="bg-[#2c5282] hover:bg-[#234269] text-white rounded shadow-xs text-xs px-3.5 py-1.5 transition-colors duration-200"
            size="sm"
          >
            <span className="flex items-center gap-1.5">
              عرض الكل
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-8 h-8 border-2 border-[#bee3f8] border-t-[#2c5282] rounded-full animate-spin"></div>
            <p className="mt-3 text-xs text-[#718096]">جاري التحميل...</p>
          </div>
        ) : (
          <ScrollArea className="h-[340px]">
            <div className="space-y-2.5">
              {recentLogs?.data?.map((log) => {
                const ActionIcon = getActionIcon(log.action);
                return (
                  <div key={log._id} className="group relative">
                    <div className="flex items-center gap-3 p-3 bg-white rounded border border-[#e2e8f0] hover:border-[#cbd5e1] hover:bg-[#f7fafc] transition-all duration-200 shadow-xs">
                      <div className="p-2 bg-[#f7fafc] border border-[#e2e8f0] rounded text-[#2c5282] flex-shrink-0">
                        <ActionIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${getActionColor(log.action)} border text-xs px-2 py-0.5 rounded font-normal`}>
                            {getActionText(log.action)}
                          </Badge>
                          <Badge variant="outline" className="text-[11px] bg-[#f7fafc] border-[#e2e8f0] text-[#718096] px-2 py-0.5 rounded font-normal">
                            {log.entityType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#718096]">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-[#a0aec0]" />
                            <span className="font-medium text-[#2d3748]">{log.userDetails.username}</span>
                          </div>
                          <span className="text-[#cbd5e1]">•</span>
                          <span className="text-[11px] text-[#718096]">{log.userDetails.role}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#718096] bg-[#f7fafc] px-2.5 py-1.5 rounded border border-[#e2e8f0] flex-shrink-0">
                        <Clock className="h-3 w-3 text-[#a0aec0]" />
                        <span className="text-[11px]">
                          {formatArabicDateTime(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {recentLogs?.data?.length === 0 && (
                <div className="text-center py-10">
                  <div className="p-3 bg-[#f7fafc] rounded inline-block border border-[#e2e8f0] mb-2">
                    <Shield className="h-8 w-8 text-[#a0aec0]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-[#4a5568]">لا توجد أنشطة حديثة</h3>
                    <p className="text-xs text-[#a0aec0]">لم يتم تسجيل أي أنشطة في النظام حتى الآن</p>
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
