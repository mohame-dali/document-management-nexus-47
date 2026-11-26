
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield,
  FileText,
  Folder,
  User,
  Activity
} from 'lucide-react';
import { getAuditLogs } from '@/services/auditService';
import { useAuth } from '@/contexts/AuthContext';

const AuditStats: React.FC = () => {
  const { currentUser } = useAuth();

  const { data: todayLogs } = useQuery({
    queryKey: ['auditLogs', 'today'],
    queryFn: () => getAuditLogs({ 
      startDate: new Date(new Date().setHours(0, 0, 0, 0)),
      endDate: new Date()
    }),
    enabled: currentUser?.role === 'Director' || currentUser?.role === 'Admin'
  });

  const { data: weekLogs } = useQuery({
    queryKey: ['auditLogs', 'week'],
    queryFn: () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return getAuditLogs({ 
        startDate: weekAgo,
        endDate: new Date()
      });
    },
    enabled: currentUser?.role === 'Director' || currentUser?.role === 'Admin'
  });

  if (currentUser?.role !== 'Director' && currentUser?.role !== 'Admin') {
    return null;
  }

  const todayCount = todayLogs?.data?.length || 0;
  const weekCount = weekLogs?.data?.length || 0;

  const documentActions = weekLogs?.data?.filter(log => log.entityType === 'document').length || 0;
  const folderActions = weekLogs?.data?.filter(log => log.entityType === 'folder').length || 0;
  const userActions = weekLogs?.data?.filter(log => log.entityType === 'user').length || 0;

  const stats = [
    {
      title: 'أنشطة اليوم',
      value: todayCount,
      icon: Activity,
      color: 'text-[#2c5282] dark:text-blue-400',
      bgColor: 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-200/70 dark:border-blue-800/60',
      accent: 'border-t-[#2c5282] dark:border-t-blue-500'
    },
    {
      title: 'أنشطة الأسبوع',
      value: weekCount,
      icon: Shield,
      color: 'text-indigo-700 dark:text-indigo-400',
      bgColor: 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-200/70 dark:border-indigo-800/60',
      accent: 'border-t-indigo-500'
    },
    {
      title: 'عمليات المستندات',
      value: documentActions,
      icon: FileText,
      color: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200/70 dark:border-emerald-800/60',
      accent: 'border-t-emerald-500'
    },
    {
      title: 'عمليات المجلدات',
      value: folderActions,
      icon: Folder,
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-200/70 dark:border-amber-800/60',
      accent: 'border-t-amber-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" dir="rtl">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 ${stat.accent} rounded-lg shadow-sm hover:shadow transition-shadow duration-200`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{stat.value}</p>
              </div>
              <div className={`p-2.5 rounded-lg border ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AuditStats;
