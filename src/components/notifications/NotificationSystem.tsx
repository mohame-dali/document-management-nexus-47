import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, MessageSquare, AlertCircle, Info } from 'lucide-react';
import { getActivityNotifications, markNotificationAsRead } from '@/services/activityNotificationService';
import { getUnreadCount } from '@/services/messageService';
import { formatDateTime } from '@/utils/formatDate';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityNotification } from '@/types';
import { useDirection } from '@/i18n/useDirection';
import { resolveNotificationTarget } from '@/utils/notificationRoute';

const NotificationSystem: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { dir, isRTL } = useDirection();
  const isFr = !isRTL;
  const queryClient = useQueryClient();
  const [lastNotificationCheck, setLastNotificationCheck] = useState(Date.now());
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set());

  // Fetch activity notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['activityNotifications'],
    queryFn: getActivityNotifications,
    refetchInterval: 60000, // Check every 60 seconds
  });

  // Fetch unread message count
  const { data: messageCount } = useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: getUnreadCount,
    refetchInterval: 60000,
  });

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      queryClient.invalidateQueries({ queryKey: ['activityNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['activityNotificationCount'] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [queryClient]);

  const showInstantNotification = useCallback((notification: ActivityNotification) => {
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

    const target = resolveNotificationTarget(
      notification as unknown as Partial<ActivityNotification> & Record<string, unknown>
    );

    const action = target
      ? {
          label: isFr ? 'Ouvrir le document' : 'فتح الوثيقة',
          onClick: () => {
            void handleMarkAsRead(notification._id);
            navigate(target);
          },
        }
      : notification.notificationType === 'responsible_assigned'
        ? {
            label: isFr ? 'Marquer comme lu' : 'تم قراءته',
            onClick: () => handleMarkAsRead(notification._id),
          }
        : undefined;

    toast[getToastType() as 'success' | 'error' | 'warning' | 'info'](
      notification.message || (isFr ? 'Nouvelle notification' : 'إشعار جديد'),
      {
        description: isFr
          ? `Date d'activité : ${formatDateTime(notification.createdAt, 'fr')}`
          : `تاريخ النشاط: ${formatDateTime(notification.createdAt, 'ar')}`,
        icon: getIcon(),
        duration: 8000,
        action,
        className: 'text-start',
        style: { direction: dir }
      }
    );
  }, [handleMarkAsRead, dir, isFr, navigate]);

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
  }, [notifications, currentUser?._id, lastNotificationCheck, shownNotifications, showInstantNotification]);

  // Show message notifications
  useEffect(() => {
    if (messageCount?.count > 0) {
      const interval = setInterval(() => {
        toast.info(isFr ? 'Messages non lus' : 'لديك رسائل غير مقروءة', {
          description: isFr
            ? `${messageCount.count} message(s) non lu(s)`
            : `${messageCount.count} رسالة غير مقروءة`,
          icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
          duration: 5000,
          className: 'text-start',
          style: { direction: dir }
        });
      }, 30000); // Show every 30 seconds if there are unread messages

      return () => clearInterval(interval);
    }
  }, [messageCount?.count, dir, isFr]);

  return null; // This component only manages notifications, doesn't render anything
};

export default NotificationSystem;
