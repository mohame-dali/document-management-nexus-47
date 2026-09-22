
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  Mail, 
  User, 
  AlertTriangle, 
  Calendar, 
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
      refetch();
      queryClient.invalidateQueries({ queryKey: ['activityNotificationCount'] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = transformedNotifications.filter(n => !n.isRead);
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
    if (type === 'error' || type === 'warning' || type === 'overdue' || type === 'today') {
      return <AlertTriangle className="h-4 w-4 text-[#e53e3e] shrink-0" />;
    }
    if (type === 'user_created' || type === 'user_updated' || act.includes('مستخدم') || act.includes('موظف') || act.includes('إجازة') || act.includes('rh')) {
      return <User className="h-4 w-4 text-[#2c5282] shrink-0" />;
    }
    return <Mail className="h-4 w-4 text-[#2c5282] shrink-0" />;
  };

  if (!currentUser || (currentUser.role !== 'SuperAdmin' && currentUser.role !== 'Admin' && currentUser.role !== 'AdminTuningDesk' && currentUser.role !== 'AdminDepartment')) {
    return null;
  }

  return (
    <div className="w-full bg-white rounded shadow-sm" dir="rtl">
      {/* EN-TÊTE DU MENU */}
      <div className="flex items-center justify-between px-4 pt-3 pb-3 mb-2 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#1a202c]">الإشعارات</span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="text-xs text-[#2c5282] hover:underline cursor-pointer"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* LISTE DES NOTIFICATIONS */}
      <div className="px-1 pb-1">
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#2c5282] mx-auto"></div>
              <p className="text-xs text-[#718096] mt-2">جاري التحميل...</p>
            </div>
          ) : transformedNotifications.length === 0 ? (
            /* ÉTAT VIDE */
            <div className="text-center py-8">
              <p className="text-sm text-[#718096]">لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f7fafc]">
              {transformedNotifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
                  className="p-3 border-b border-[#f7fafc] hover:bg-[#f7fafc] transition-colors cursor-pointer flex items-start gap-2.5 text-right"
                >
                  {/* État "non lu" : point bleu à droite (w-2 h-2 rounded-full bg-[#2c5282]) */}
                  <div className="w-2 pt-1.5 shrink-0 flex items-center justify-center">
                    {!notification.isRead ? (
                      <span className="w-2 h-2 rounded-full bg-[#2c5282]" />
                    ) : (
                      <span className="w-2 h-2" />
                    )}
                  </div>

                  {/* Icône à droite (RTL) : selon le type (Mail pour courrier, User pour RH, AlertTriangle pour alerte) */}
                  <div className="mt-0.5 p-1.5 rounded bg-slate-100 shrink-0">
                    {getNotificationIcon(notification.type, notification.activity)}
                  </div>

                  {/* Texte principal et date/heure */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a202c] leading-snug">
                      {notification.activity ? `نشاط: ${notification.activity}` : notification.title}
                    </p>
                    {notification.documentId && typeof notification.documentId === 'object' && (
                      <p className="text-xs text-[#2c5282] font-medium mt-0.5">
                        الوثيقة رقم {notification.documentId.serialNumber}/{notification.documentId.year}
                      </p>
                    )}
                    {notification.documentId && typeof notification.documentId === 'object' && notification.documentId.subject && (
                      <p className="text-xs text-[#4a5568] line-clamp-1 mt-0.5">
                        الموضوع: {notification.documentId.subject}
                      </p>
                    )}
                    {notification.message && (
                      <p className="text-xs text-[#718096] line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-[#718096] mt-1">
                      <Calendar className="h-3 w-3 text-[#718096]" />
                      <span>{formatArabicDateTime(notification.createdAt)}</span>
                    </div>
                  </div>

                  {/* Suppression */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification._id);
                    }}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-transparent shrink-0"
                    title="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default ActivityNotifications;
