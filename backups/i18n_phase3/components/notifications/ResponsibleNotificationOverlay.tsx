
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getUnreadResponsibleNotifications, 
  markResponsibleNotificationAsRead, 
  dismissResponsibleNotification,
  ResponsibleNotification 
} from '@/services/responsibleNotificationService';
import ResponsibleNotificationPopup from './ResponsibleNotificationPopup';

const ResponsibleNotificationOverlay: React.FC = () => {
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

  // Only show the most recent notification to avoid cluttering the screen
  const latestNotification = notifications[0];

  if (!latestNotification) {
    return null;
  }

  return (
    <ResponsibleNotificationPopup
      documentId={latestNotification.documentId._id}
      documentSubject={latestNotification.documentId.subject}
      documentSerialNumber={latestNotification.documentId.serialNumber}
      documentYear={latestNotification.documentId.year}
      assignedBy={latestNotification.assignedBy.username}
      assignedAt={latestNotification.createdAt}
      onMarkAsRead={() => handleMarkAsRead(latestNotification._id)}
      onTemporaryDismiss={() => handleTemporaryDismiss(latestNotification._id)}
    />
  );
};

export default ResponsibleNotificationOverlay;
