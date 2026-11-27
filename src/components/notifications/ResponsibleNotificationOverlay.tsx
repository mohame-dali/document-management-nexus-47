import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUnreadResponsibleNotifications,
  markResponsibleNotificationAsRead,
  dismissResponsibleNotification,
  ResponsibleNotification
} from '@/services/responsibleNotificationService';
import { resolveDocumentDetailRoute } from '@/utils/notificationRoute';
import ResponsibleNotificationPopup from './ResponsibleNotificationPopup';

const ResponsibleNotificationOverlay: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch unread notifications every 30 seconds
  const { data: notifications = [] } = useQuery({
    queryKey: ['unreadResponsibleNotifications'],
    queryFn: getUnreadResponsibleNotifications,
    refetchInterval: 30000, // 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: markResponsibleNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadResponsibleNotifications'] });
    }
  });

  const dismissMutation = useMutation({
    mutationFn: ({ notificationId, minutes }: { notificationId: string; minutes: number }) =>
      dismissResponsibleNotification(notificationId, minutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadResponsibleNotifications'] });
    }
  });

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleTemporaryDismiss = (notificationId: string) => {
    dismissMutation.mutate({ notificationId, minutes: 60 }); // Dismiss for 1 hour
  };

  const handleOpenDocument = (notification: ResponsibleNotification) => {
    const docObj = typeof notification.documentId === 'object' ? notification.documentId : null;
    const docId = docObj?._id || (typeof notification.documentId === 'string' ? notification.documentId : '');
    const docType = notification.documentType || docObj?.documentType || 'IncomingDocument';

    markAsReadMutation.mutate(notification._id);

    const target = resolveDocumentDetailRoute(docId, docType);
    if (target) {
      navigate(target);
    }
  };

  // Only show the most recent notification to avoid cluttering the screen
  const latestNotification = notifications[0];

  if (!latestNotification || !latestNotification.documentId) {
    return null;
  }

  return (
    <ResponsibleNotificationPopup
      documentId={latestNotification.documentId._id}
      documentType={latestNotification.documentType || latestNotification.documentId.documentType}
      documentSubject={latestNotification.documentId.subject}
      documentSerialNumber={latestNotification.documentId.serialNumber}
      documentYear={latestNotification.documentId.year}
      assignedBy={latestNotification.assignedBy?.username || ''}
      assignedAt={latestNotification.createdAt}
      onOpenDocument={() => handleOpenDocument(latestNotification)}
      onMarkAsRead={() => handleMarkAsRead(latestNotification._id)}
      onTemporaryDismiss={() => handleTemporaryDismiss(latestNotification._id)}
    />
  );
};

export default ResponsibleNotificationOverlay;
