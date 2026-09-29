import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  Mail, 
  User, 
  AlertTriangle, 
  Calendar, 
  Trash2,
  CheckCheck,
  Clock,
  Check,
  FileText
} from 'lucide-react';
import { 
  getActivityNotifications, 
  markNotificationAsRead, 
  deleteNotification,
  ActivityNotification 
} from '@/services/activityNotificationService';
import { useAuth } from '@/contexts/AuthContext';
import { getRelativeTime, getDateGroup } from '@/utils/relativeTime';

interface TransformedNotification extends ActivityNotification {
  isRead: boolean;
  title: string;
  type: string;
}

const ActivityNotifications: React.FC = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['activityNotifications'],
    queryFn: getActivityNotifications,
    refetchInterval: 60000, // Refetch every 60 seconds
    staleTime: 0,
  });

  // Transform notifications with read state and visual type
  const transformedNotifications: TransformedNotification[] = useMemo(() => {
    return notifications.map(notification => ({
      ...notification,
      isRead: notification.recipients?.some(r => 
        (typeof r.userId === 'string' ? r.userId : r.userId?._id) === currentUser?._id && r.read
      ) || false,
      title: notification.message || 'إشعار نشاط',
      type: notification.notificationType === 'overdue' ? 'error' : 
            notification.notificationType === 'today' ? 'warning' : 'info'
    }));
  }, [notifications, currentUser]);

  const unreadCount = transformedNotifications.filter(n => !n.isRead).length;

  // Group notifications by day (today, yesterday, older)
  const groupedNotifications = useMemo(() => {
    const groups: {
      today: TransformedNotification[];
      yesterday: TransformedNotification[];
      older: TransformedNotification[];
    } = {
      today: [],
      yesterday: [],
      older: []
    };

    transformedNotifications.forEach(item => {
      const grp = getDateGroup(item.createdAt);
      groups[grp].push(item);
    });

    return groups;
  }, [transformedNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['activityNotificationCount'] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = transformedNotifications.filter(n => !n.isRead);
      if (unread.length === 0) return;
      await Promise.all(unread.map(n => markNotificationAsRead(n._id)));
      refetch();
      queryClient.invalidateQueries({ queryKey: ['activityNotificationCount'] });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['activityNotificationCount'] });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string, activity?: string) => {
    const act = (activity || '').toLowerCase();
    if (type === 'error' || type === 'overdue') {
      return (
        <div className="p-2 rounded-full bg-red-100 text-red-600 shrink-0">
          <AlertTriangle className="h-4 w-4" />
        </div>
      );
    }
    if (type === 'warning' || type === 'today' || type === 'tomorrow') {
      return (
        <div className="p-2 rounded-full bg-amber-100 text-amber-600 shrink-0">
          <Clock className="h-4 w-4" />
        </div>
      );
    }
    if (type === 'user_created' || type === 'user_updated' || act.includes('مستخدم') || act.includes('موظف') || act.includes('إجازة') || act.includes('rh')) {
      return (
        <div className="p-2 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
          <User className="h-4 w-4" />
        </div>
      );
    }
    return (
      <div className="p-2 rounded-full bg-blue-100 text-[#2c5282] shrink-0">
        <Mail className="h-4 w-4" />
      </div>
    );
  };

  if (!currentUser || (currentUser.role !== 'Director' && currentUser.role !== 'Admin' && currentUser.role !== 'AdminTuningDesk' && currentUser.role !== 'AdminDepartment')) {
    return null;
  }

  const renderGroup = (title: string, items: TransformedNotification[]) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-2">
        <div className="px-3 py-1 bg-[#f8fafc] border-y border-[#edf2f7] text-[11px] font-bold text-[#718096]">
          {title} ({items.length})
        </div>
        <div className="divide-y divide-[#f1f5f9]">
          {items.map((notification) => (
            <div
              key={notification._id}
              onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
              className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 text-right relative ${
                !notification.isRead ? 'bg-[#f0f9ff]/70 hover:bg-[#e0f2fe]/70' : 'hover:bg-[#f8fafc]'
              }`}
            >
              {/* Unread indicator dot */}
              <div className="w-2 pt-2 shrink-0 flex items-center justify-center">
                {!notification.isRead ? (
                  <span className="w-2 h-2 rounded-full bg-[#2c5282] ring-2 ring-blue-100" />
                ) : (
                  <span className="w-2 h-2" />
                )}
              </div>

              {/* Specific type icon */}
              {getNotificationIcon(notification.type, notification.activity)}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-xs font-bold leading-snug truncate ${
                    !notification.isRead ? 'text-[#1a202c]' : 'text-[#4a5568]'
                  }`}>
                    {notification.activity ? `نشاط: ${notification.activity}` : notification.title}
                  </p>
                  <span className="text-[10px] text-[#718096] shrink-0 font-medium">
                    {getRelativeTime(notification.createdAt)}
                  </span>
                </div>

                {notification.documentId && typeof notification.documentId === 'object' && (
                  <div className="flex items-center gap-1 text-[11px] text-[#2c5282] font-semibold mt-1">
                    <FileText className="w-3 h-3 shrink-0" />
                    <span>الوثيقة {notification.documentId.serialNumber}/{notification.documentId.year}</span>
                  </div>
                )}

                {notification.documentId && typeof notification.documentId === 'object' && notification.documentId.subject && (
                  <p className="text-[11px] text-[#4a5568] line-clamp-1 mt-0.5">
                    الموضوع: {notification.documentId.subject}
                  </p>
                )}

                {notification.message && (
                  <p className="text-[11px] text-[#718096] line-clamp-2 mt-0.5 leading-relaxed">
                    {notification.message}
                  </p>
                )}
              </div>

              {/* Actions: Mark read & Delete */}
              <div className="flex items-center gap-1 self-start pt-1 shrink-0">
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification._id);
                    }}
                    className="h-6 w-6 p-0 text-[#2c5282] hover:text-emerald-700 hover:bg-emerald-50 rounded"
                    title="تعليم كمقروء"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notification._id);
                  }}
                  className="h-6 w-6 p-0 text-[#a0aec0] hover:text-red-600 hover:bg-red-50 rounded"
                  title="حذف"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white rounded-md shadow-lg border border-[#e2e8f0] overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#2c5282]" />
          <span className="text-sm font-bold text-[#1a202c]">الإشعارات والتنبيهات</span>
          {unreadCount > 0 ? (
            <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-red-100 text-red-700 border border-red-200">
              {unreadCount} جديد
            </span>
          ) : (
            <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600">
              محدث
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1 text-xs font-semibold text-[#2c5282] hover:text-[#1a365d] hover:underline cursor-pointer transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>تعيين الكل كمقروء</span>
          </button>
        )}
      </div>

      {/* Notification List */}
      <ScrollArea className="max-h-[380px]">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#2c5282] mx-auto"></div>
            <p className="text-xs text-[#718096] mt-2 font-medium">جاري تحميل الإشعارات...</p>
          </div>
        ) : transformedNotifications.length === 0 ? (
          /* Clean Empty State */
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 bg-slate-100 text-[#a0aec0] rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h4 className="text-sm font-bold text-[#4a5568]">لا توجد إشعارات جديدة</h4>
            <p className="text-xs text-[#a0aec0] mt-1">ستظهر هنا كافة تنبيهات النظام والمستندات والمهام</p>
          </div>
        ) : (
          <div>
            {renderGroup('اليوم', groupedNotifications.today)}
            {renderGroup('أمس', groupedNotifications.yesterday)}
            {renderGroup('سابقاً', groupedNotifications.older)}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ActivityNotifications;
