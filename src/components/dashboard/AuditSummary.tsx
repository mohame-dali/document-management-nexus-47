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
  TrendingUp
} from 'lucide-react';
import { getAuditLogs } from '@/services/auditService';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDateTime as formatLocalizedDateTime } from '@/utils/formatDate';
import { useLanguage } from '@/contexts/LanguageProvider';

const AuditSummary: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const { data: recentLogs, isLoading } = useQuery({
    queryKey: ['auditLogs', 'recent'],
    queryFn: () => getAuditLogs({ limit: 10 }),
    enabled: currentUser?.role === 'Director' || currentUser?.role === 'Admin'
  });

  const getActionIcon = (action: string) => {
    if (action.includes('document')) return FileText;
    if (action.includes('folder')) return Folder;
    if (action.includes('user')) return User;
    return Shield;
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60';
    if (action.includes('update') || action.includes('move')) return 'bg-blue-50/90 text-[#1e3a5f] border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60';
    if (action.includes('delete')) return 'bg-red-50/90 text-red-800 border-red-200/80 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60';
    return 'bg-slate-100/90 text-slate-700 border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/80';
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'document_create': return t('dashboard.audit.action.documentCreate');
      case 'document_update': return t('dashboard.audit.action.documentUpdate');
      case 'document_delete': return t('dashboard.audit.action.documentDelete');
      case 'folder_create': return t('dashboard.audit.action.folderCreate');
      case 'folder_update': return t('dashboard.audit.action.folderUpdate');
      case 'folder_delete': return t('dashboard.audit.action.folderDelete');
      case 'user_create': return t('dashboard.audit.action.userCreate');
      case 'user_update': return t('dashboard.audit.action.userUpdate');
      case 'user_delete': return t('dashboard.audit.action.userDelete');
      default: return action.replace(/_/g, ' ');
    }
  };

  const getRoleDisplayName = (role?: string) => {
    if (!role) return '';
    const roleKey = `roles.${role}`;
    const translated = t(roleKey);
    return translated !== roleKey ? translated : role;
  };

  const formatDateTime = (dateStr: string | Date) => {
    return formatLocalizedDateTime(dateStr, language);
  };

  if (currentUser?.role !== 'Director' && currentUser?.role !== 'Admin') {
    return null;
  }

  return (
    <Card className="col-span-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-lg overflow-hidden">
      <CardHeader className="bg-slate-50/90 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#ebf4ff] dark:bg-slate-800 rounded-lg border border-[#bee3f8] dark:border-slate-700 text-[#2c5282] dark:text-blue-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-[#1a202c] dark:text-slate-100">
                {t('dashboard.audit.title')}
              </CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-[#5f6b7d] dark:text-slate-400 mt-0.5">
                <TrendingUp className="h-3.5 w-3.5 text-[#38a169] dark:text-emerald-400" />
                <span>{t('dashboard.audit.subtitle')}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate('/dashboard/audit-trail')}
            className="bg-[#2c5282] hover:bg-[#234269] text-white rounded shadow-xs text-xs px-3.5 py-1.5 transition-colors duration-200 whitespace-nowrap shrink-0"
            size="sm"
          >
            <span className="flex items-center gap-1.5">
              {t('dashboard.audit.viewAll')}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-8 h-8 border-2 border-[#bee3f8] border-t-[#2c5282] rounded-full animate-spin"></div>
            <p className="mt-3 text-xs text-[#5f6b7d] dark:text-slate-400">{t('common.loading')}</p>
          </div>
        ) : (
          <ScrollArea className="h-[340px]">
            <div className="space-y-2.5">
              {recentLogs?.data?.map((log) => {
                const ActionIcon = getActionIcon(log.action);
                return (
                  <div key={log._id} className="group relative">
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded border border-[#e2e8f0] dark:border-slate-800 hover:border-[#cbd5e1] dark:hover:border-slate-700 hover:bg-[#f7fafc] dark:hover:bg-slate-800/60 transition-all duration-200 shadow-xs">
                      <div className="p-2 bg-[#f7fafc] dark:bg-slate-800 border border-[#e2e8f0] dark:border-slate-700 rounded text-[#2c5282] dark:text-blue-400 flex-shrink-0">
                        <ActionIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${getActionColor(log.action)} border text-xs px-2.5 py-0.5 rounded-full font-medium`}>
                            {getActionText(log.action)}
                          </Badge>
                          <Badge variant="outline" className="text-[11px] bg-slate-50/90 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-normal">
                            {log.entityType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#5f6b7d] dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-[#a0aec0]" />
                            <span className="font-medium text-[#2d3748] dark:text-slate-200">{log.userDetails.username}</span>
                          </div>
                          <span className="text-[#cbd5e1] dark:text-slate-700">•</span>
                          <span className="text-[11px] text-[#5f6b7d] dark:text-slate-400">{getRoleDisplayName(log.userDetails.role)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#5f6b7d] dark:text-slate-400 bg-[#f7fafc] dark:bg-slate-800 px-2.5 py-1.5 rounded border border-[#e2e8f0] dark:border-slate-700 flex-shrink-0 tabular-nums">
                        <Clock className="h-3 w-3 text-[#a0aec0]" />
                        <span className="text-[11px] tabular-nums">
                          <bdi dir={language === 'fr' ? 'ltr' : 'rtl'}>{formatDateTime(log.createdAt)}</bdi>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {recentLogs?.data?.length === 0 && (
                <div className="text-center py-10">
                  <div className="p-3 bg-[#f7fafc] dark:bg-slate-800 rounded inline-block border border-[#e2e8f0] dark:border-slate-700 mb-2">
                    <Shield className="h-8 w-8 text-[#a0aec0]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-[#4a5568] dark:text-slate-300">
                      {t('dashboard.audit.noRecentActivities')}
                    </h3>
                    <p className="text-xs text-[#5f6b7d] dark:text-slate-400">
                      {t('dashboard.audit.noActivitiesDescription')}
                    </p>
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
