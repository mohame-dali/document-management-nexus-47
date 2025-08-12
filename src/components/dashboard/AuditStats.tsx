
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
    enabled: currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Admin'
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
    enabled: currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Admin'
  });

  if (currentUser?.role !== 'SuperAdmin' && currentUser?.role !== 'Admin') {
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
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'أنشطة الأسبوع',
      value: weekCount,
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'عمليات المستندات',
      value: documentActions,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'عمليات المجلدات',
      value: folderActions,
      icon: Folder,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" dir="rtl">
      {stats.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AuditStats;
