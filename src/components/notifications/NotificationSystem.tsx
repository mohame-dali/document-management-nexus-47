
import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, FileText, User, MessageSquare, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { getActivityNotifications, markNotificationAsRead } from '@/services/activityNotificationService';
import { getUnreadCount } from '@/services/messageService';
import { formatArabicDateTime } from '@/utils/arabicDateFormatter';
import { useAuth } from '@/contexts/AuthContext';

const NotificationSystem: React.FC = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [lastNotificationCheck, setLastNotificationCheck] = useState(Date.now());
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set());

  // Fetch activity notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['activityNotifications'],
    queryFn: getActivityNotifications,
    refetchInterval: 5000, // Check every 5 seconds
  });

  // Fetch unread message count
  const { data: messageCount } = useQuery({
    queryKey: ['unreadMessageCount'],
    queryFn: getUnreadCount,
    refetchInterval: 5000,
  });

  // Check for new notifications and show instant pop-ups
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const newNotifications = notifications.filter(notification => {
      const notificationTime = new Date(notification.createdAt).getTime();
      const isNew = notificationTime > lastNotificationCheck;
      const notShown = !shownNotifications.has(notification._id);
      const isForCurrentUser = notification.recipients?.some(r => 
        (typeof r.userId === 'string' ? r.userId : r.userId._id) === currentUser?._id
      );
      
      return isNew && notShown && isForCurrentUser && !notification.recipients?.some(r => 
        (typeof r.userId === 'string' ? r.userId : r.userId._id) === currentUser?._id && r.read
      );
    });

    newNotifications.forEach(notification => {
      showInstantNotification(notification);
      setShownNotifications(prev => new Set([...prev, notification._id]));
    });

    if (newNotifications.length > 0) {
      setLastNotificationCheck(Date.now());
    }
  }, [notifications, currentUser?._id, lastNotificationCheck, shownNotifications]);

  const showInstantNotification = (notification: any) => {
    const getIcon = () => {
      switch (notification.notificationType) {
        case 'document_assigned':
        case 'responsible_assigned':
          return <FileText className="h-5 w-5 text-blue-500" />;
        case 'overdue':
          return <AlertCircle className="h-5 w-5 text-red-500" />;
        case 'today':
        case 'tomorrow':
          return <AlertCircle className="h-5 w-5 text-yellow-500" />;
        default:
          return <Info className="h-5 w-5 text-blue-500" />;
      }
    };

    const getToastType = () => {
      switch (notification.notificationType) {
        case 'overdue':
          return 'error';
        case 'today':
        case 'tomorrow':
          return 'warning';
        case 'responsible_assigned':
        case 'document_assigned':
          return 'success';
        default:
          return 'info';
      }
    };

    toast[getToastType() as 'success' | 'error' | 'warning' | 'info'](
      notification.message || 'إشعار جديد',
      {
        description: `تاريخ النشاط: ${formatArabicDateTime(notification.createdAt)}`,
        icon: getIcon(),
        duration: 8000,
        action: notification.notificationType === 'responsible_assigned' ? {
          label: 'تم قراءته',
          onClick: () => handleMarkAsRead(notification._id)
        } : undefined,
        className: 'text-right',
        style: { direction: 'rtl' }
      }
    );
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      queryClient.invalidateQueries({ queryKey: ['activityNotifications'] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Show message notifications
  useEffect(() => {
    if (messageCount?.count > 0) {
      const interval = setInterval(() => {
        toast.info('لديك رسائل غير مقروءة', {
          description: `${messageCount.count} رسالة غير مقروءة`,
          icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
          duration: 5000,
          className: 'text-right',
          style: { direction: 'rtl' }
        });
      }, 30000); // Show every 30 seconds if there are unread messages

      return () => clearInterval(interval);
    }
  }, [messageCount?.count]);

  return null; // This component only manages notifications, doesn't render anything
};

export default NotificationSystem;
