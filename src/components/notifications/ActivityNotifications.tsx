
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  FileText, 
  User, 
  Building2, 
  Calendar, 
  CheckCircle,
  AlertCircle,
  Info,
  Trash2
} from 'lucide-react';
import { getActivityNotifications, markNotificationAsRead, deleteNotification } from '@/services/activityNotificationService';
import { formatArabicDateTime } from '@/utils/arabicDateFormatter';
import { useAuth } from '@/contexts/AuthContext';

const ActivityNotifications: React.FC = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['activityNotifications'],
    queryFn: getActivityNotifications,
    refetchInterval: 10000, // Refetch every 10 seconds for more responsive updates
    staleTime: 0,
  });

  // Transform notifications to have the expected structure
  const transformedNotifications = notifications.map(notification => ({
    ...notification,
    isRead: notification.recipients?.some(r => 
      (typeof r.userId === 'string' ? r.userId : r.userId._id) === currentUser?._id && r.read
    ) || false,
    title: notification.message || 'إشعار نشاط',
    type: notification.notificationType === 'overdue' ? 'error' : 
          notification.notificationType === 'today' ? 'warning' : 'info'
  }));

  const unreadCount = transformedNotifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      // Refetch both the notifications list and count
      refetch();
      // Also invalidate the count query to update the bell badge
      queryClient.invalidateQueries({ queryKey: ['activityNotificationCount'] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      // Refetch both the notifications list and count
      refetch();
      // Also invalidate the count query to update the bell badge
      queryClient.invalidateQueries({ queryKey: ['activityNotificationCount'] });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document_created':
      case 'document_updated':
      case 'responsible_assigned':
        return <FileText className="h-4 w-4" />;
      case 'user_created':
      case 'user_updated':
        return <User className="h-4 w-4" />;
      case 'department_created':
      case 'department_updated':
        return <Building2 className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (!currentUser || (currentUser.role !== 'SuperAdmin' && currentUser.role !== 'Admin' && currentUser.role !== 'AdminTuningDesk' && currentUser.role !== 'AdminDepartment')) {
    return null;
  }

  return (
    <Card className="w-full max-w-md" dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            الإشعارات
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary mx-auto"></div>
              <p className="text-xs text-muted-foreground mt-2">جاري التحميل...</p>
            </div>
          ) : transformedNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transformedNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-3 rounded border transition-colors ${
                    notification.isRead ? 'bg-gray-50 border-gray-200' : getNotificationColor(notification.type)
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">
                          {notification.activity && `نشاط: ${notification.activity}`}
                        </p>
                        {notification.documentId && typeof notification.documentId === 'object' && (
                          <p className="text-xs text-blue-600 font-medium mt-1">
                            الوثيقة رقم {notification.documentId.serialNumber}/{notification.documentId.year}
                          </p>
                        )}
                        {notification.documentId && typeof notification.documentId === 'object' && notification.documentId.subject && (
                          <p className="text-xs text-gray-700 line-clamp-2 mt-1">
                            الموضوع: {notification.documentId.subject}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            تاريخ الإنشاء: {formatArabicDateTime(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification._id)}
                          className="h-6 w-6 p-0"
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(notification._id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActivityNotifications;
