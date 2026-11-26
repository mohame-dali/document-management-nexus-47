import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  Mail,
  User,
  AlertTriangle,
  Trash2,
  CheckCheck,
  Clock,
  Check,
  FileText,
} from 'lucide-react';
import {
  getActivityNotifications,
  markNotificationAsRead,
  deleteNotification,
  ActivityNotification,
} from '@/services/activityNotificationService';
import { useAuth } from '@/contexts/AuthContext';
import { getRelativeTime, getDateGroup } from '@/utils/relativeTime';
import { useDirection } from '@/i18n/useDirection';
import { useLanguage } from '@/contexts/LanguageProvider';

interface ActivityNotificationsProps {
  onClose?: () => void;
}

interface TransformedNotification extends Omit<ActivityNotification, 'type'> {
  isRead: boolean;
  title: string;
  type: string;
}

const resolveNotificationTarget = (notification: TransformedNotification): string | null => {
  const extra = notification as unknown as Record<string, unknown>;

  if (typeof extra.link === 'string' && extra.link.startsWith('/')) {
    return extra.link;
  }

  const entityType = typeof extra.entityType === 'string' ? extra.entityType.toLowerCase() : '';
  const entityId =
    typeof extra.entityId === 'string'
      ? extra.entityId
      : extra.entityId && typeof extra.entityId === 'object' && '_id' in extra.entityId
        ? String((extra.entityId as { _id?: unknown })._id || '')
        : '';

  if (entityId) {
    if (entityType.includes('outgoing')) return `/dashboard/mail/outgoing/${entityId}`;
    if (entityType.includes('incoming') || entityType.includes('document')) {
      return `/dashboard/mail/incoming/${entityId}`;
    }
    if (entityType.includes('personnel')) return `/dashboard/hr/personnel/${entityId}`;
    if (entityType.includes('declaration')) return '/dashboard/hr/attendance-declarations';
    if (entityType.includes('stage')) return '/dashboard/hr/stages';
    if (entityType.includes('message')) return '/dashboard/messages';
  }

  const rawDoc = notification.documentId;
  const docId =
    typeof rawDoc === 'string'
      ? rawDoc
      : rawDoc && typeof rawDoc === 'object' && '_id' in rawDoc
        ? String(rawDoc._id)
        : '';

  if (docId) {
    const docType = typeof extra.documentType === 'string' ? extra.documentType.toLowerCase() : '';
    if (docType.includes('outgoing')) {
      return `/dashboard/mail/outgoing/${docId}`;
    }
    return `/dashboard/mail/incoming/${docId}`;
  }

  if (notification.type === 'user_created' || notification.type === 'user_updated') {
    return '/dashboard/admin/users';
  }
  if (notification.type === 'department_created' || notification.type === 'department_updated') {
    return '/dashboard/admin/departments';
  }

  return null;
};

const ActivityNotifications: React.FC<ActivityNotificationsProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { dir } = useDirection();
  const { language } = useLanguage();
  const isFr = language === 'fr';
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['activityNotifications'],
    queryFn: getActivityNotifications,
    refetchInterval: 60000,
    staleTime: 0,
  });

  const transformedNotifications: TransformedNotification[] = useMemo(() => {
    return notifications.map((notification) => ({
      ...notification,
      isRead:
        notification.recipients?.some(
          (r) =>
            (typeof r.userId === 'string' ? r.userId : r.userId?._id) === currentUser?._id &&
            r.read
        ) || false,
      title: notification.message || (isFr ? 'Notification d’activité' : 'إشعار نشاط'),
      type:
        notification.notificationType === 'overdue'
          ? 'error'
          : notification.notificationType === 'today'
            ? 'warning'
            : 'info',
    }));
  }, [notifications, currentUser, isFr]);

  const unreadCount = transformedNotifications.filter((n) => !n.isRead).length;

  const groupedNotifications = useMemo(() => {
    const groups: {
      today: TransformedNotification[];
      yesterday: TransformedNotification[];
      older: TransformedNotification[];
    } = {
      today: [],
      yesterday: [],
      older: [],
    };

    transformedNotifications.forEach((item) => {
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
      const unread = transformedNotifications.filter((n) => !n.isRead);
      if (unread.length === 0) return;
      await Promise.all(unread.map((n) => markNotificationAsRead(n._id)));
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

  const handleNotificationClick = (notification: TransformedNotification) => {
    if (!notification.isRead) {
      void handleMarkAsRead(notification._id);
    }
    const target = resolveNotificationTarget(notification);
    if (target) {
      navigate(target);
      onClose?.();
    }
  };

  const getNotificationIcon = (type: string, activity?: string) => {
    const act = (activity || '').toLowerCase();
    if (type === 'error' || type === 'overdue') {
      return (
        <div className="p-2 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
          <AlertTriangle className="h-4 w-4" />
        </div>
      );
    }
    if (type === 'warning' || type === 'today' || type === 'tomorrow') {
      return (
        <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
          <Clock className="h-4 w-4" />
        </div>
      );
    }
    if (
      type === 'user_created' ||
      type === 'user_updated' ||
      act.includes('مستخدم') ||
      act.includes('موظف') ||
      act.includes('إجازة') ||
      act.includes('rh')
    ) {
      return (
        <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0">
          <User className="h-4 w-4" />
        </div>
      );
    }
    return (
      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300 shrink-0">
        <Mail className="h-4 w-4" />
      </div>
    );
  };

  if (
    !currentUser ||
    (currentUser.role !== 'Director' &&
      currentUser.role !== 'Admin' &&
      currentUser.role !== 'AdminTuningDesk' &&
      currentUser.role !== 'AdminDepartment')
  ) {
    return null;
  }

  const renderGroup = (title: string, items: TransformedNotification[]) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-2">
        <div className="px-3 py-1 bg-slate-50 dark:bg-slate-800/80 border-y border-slate-200/80 dark:border-slate-800 text-[13px] font-bold text-slate-600 dark:text-slate-300">
          {title} (<bdi dir="ltr">{items.length}</bdi>)
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {items.map((notification) => {
            const target = resolveNotificationTarget(notification);
            return (
              <div
                key={notification._id}
                role="button"
                tabIndex={0}
                onClick={() => handleNotificationClick(notification)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNotificationClick(notification);
                  }
                }}
                className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 text-start relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282] ${
                  !notification.isRead
                    ? 'bg-blue-50/75 dark:bg-blue-950/35 hover:bg-blue-100/75 dark:hover:bg-blue-950/55'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Unread indicator dot */}
                <div className="w-2 pt-2 shrink-0 flex items-center justify-center">
                  {!notification.isRead ? (
                    <span className="w-2 h-2 rounded-full bg-[#2c5282] dark:bg-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/70" />
                  ) : (
                    <span className="w-2 h-2" />
                  )}
                </div>

                {/* Specific type icon */}
                {getNotificationIcon(notification.type, notification.activity)}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`text-xs font-bold leading-snug truncate ${
                        !notification.isRead
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {notification.activity
                        ? isFr
                          ? `Activité : ${notification.activity}`
                          : `نشاط: ${notification.activity}`
                        : notification.title}
                    </p>
                    <span className="text-[13px] text-slate-700 dark:text-slate-300 shrink-0 font-medium tabular-nums">
                      <bdi dir="auto">{getRelativeTime(notification.createdAt)}</bdi>
                    </span>
                  </div>

                  {notification.documentId && typeof notification.documentId === 'object' && (
                    <div className="flex items-center gap-1 text-[13px] text-[#2c5282] dark:text-blue-400 font-semibold mt-1">
                      <FileText className="w-3 h-3 shrink-0" />
                      <span>
                        {isFr ? 'Document ' : 'الوثيقة '}
                        <bdi dir="ltr">
                          {notification.documentId.serialNumber}/{notification.documentId.year}
                        </bdi>
                      </span>
                      {target && (
                        <span className="text-[13px] font-normal text-slate-700 dark:text-slate-300">
                          · {isFr ? 'Ouvrir' : 'فتح'}
                        </span>
                      )}
                    </div>
                  )}

                  {notification.documentId &&
                    typeof notification.documentId === 'object' &&
                    notification.documentId.subject && (
                      <p className="text-[13px] text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">
                        {isFr ? 'Objet : ' : 'الموضوع: '}
                        {notification.documentId.subject}
                      </p>
                    )}

                  {notification.message && (
                    <p className="text-[13px] text-slate-700 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
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
                      className="h-6 w-6 p-0 text-[#2c5282] dark:text-blue-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded"
                      title={isFr ? 'Marquer comme lu' : 'تحديد كمقروء'}
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
                    className="h-6 w-6 p-0 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded"
                    title={isFr ? 'Supprimer' : 'حذف'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className="w-full bg-white dark:bg-slate-900 rounded-md shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden"
      dir={dir}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <Bell className="w-4 h-4 text-[#2c5282] dark:text-blue-400 shrink-0" />
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {isFr ? 'Notifications et alertes' : 'الإشعارات والتنبيهات'}
          </span>
          {unreadCount > 0 ? (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[13px] font-bold rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/70 shrink-0 tabular-nums">
              <bdi dir="ltr">{unreadCount}</bdi> {isFr ? 'nouveau(x)' : 'جديد'}
            </span>
          ) : (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[13px] font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
              {isFr ? 'À jour' : 'محدث'}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1 text-xs font-semibold text-[#2c5282] dark:text-blue-400 hover:text-[#1a365d] dark:hover:text-blue-300 hover:underline cursor-pointer transition-colors shrink-0 whitespace-nowrap"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{isFr ? 'Tout marquer comme lu' : 'تحديد الكل كمقروء'}</span>
          </button>
        )}
      </div>

      {/* Notification List */}
      <ScrollArea className="max-h-[380px]">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#2c5282] dark:border-blue-400 mx-auto"></div>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 font-medium">
              {isFr ? 'Chargement des notifications...' : 'جاري تحميل الإشعارات...'}
            </p>
          </div>
        ) : transformedNotifications.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {isFr ? 'Aucune nouvelle notification' : 'لا توجد إشعارات جديدة'}
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
              {isFr
                ? 'Toutes les alertes système et documents apparaîtront ici'
                : 'ستظهر هنا كافة تنبيهات النظام والمستندات والمهام'}
            </p>
          </div>
        ) : (
          <div>
            {renderGroup(isFr ? "Aujourd'hui" : 'اليوم', groupedNotifications.today)}
            {renderGroup(isFr ? 'Hier' : 'أمس', groupedNotifications.yesterday)}
            {renderGroup(isFr ? 'Plus ancien' : 'سابقاً', groupedNotifications.older)}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ActivityNotifications;
