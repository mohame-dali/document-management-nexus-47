import { ActivityNotification } from '@/types';

export type NotificationDocumentType = 'IncomingDocument' | 'OutgoingDocument' | string;

export const resolveDocumentDetailRoute = (
  documentId?: string | null,
  documentType?: NotificationDocumentType | null
): string | null => {
  if (!documentId) return null;
  const normalizedType = (documentType || '').toLowerCase();
  if (normalizedType.includes('outgoing')) {
    return `/dashboard/mail/outgoing/${documentId}`;
  }
  return `/dashboard/mail/incoming/${documentId}`;
};

export const resolveNotificationTarget = (
  notification: Partial<ActivityNotification> & Record<string, unknown>
): string | null => {
  if (typeof notification.link === 'string' && notification.link.startsWith('/')) {
    return notification.link;
  }

  const entityType =
    typeof notification.entityType === 'string' ? notification.entityType.toLowerCase() : '';
  const entityId =
    typeof notification.entityId === 'string'
      ? notification.entityId
      : notification.entityId &&
          typeof notification.entityId === 'object' &&
          '_id' in notification.entityId
        ? String((notification.entityId as { _id?: unknown })._id || '')
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
  const docObj =
    rawDoc && typeof rawDoc === 'object' ? (rawDoc as unknown as Record<string, unknown>) : null;
  const docId =
    typeof rawDoc === 'string'
      ? rawDoc
      : docObj && '_id' in docObj
        ? String(docObj._id || '')
        : '';

  if (docId) {
    const explicitType =
      (typeof notification.documentType === 'string' && notification.documentType) ||
      (typeof notification.docType === 'string' && notification.docType) ||
      (docObj && typeof docObj.documentType === 'string' && docObj.documentType) ||
      (docObj && typeof docObj.docType === 'string' && docObj.docType) ||
      entityType ||
      '';

    const inferredOutgoing =
      explicitType.toLowerCase().includes('outgoing') ||
      Boolean(docObj && 'issueDate' in docObj && !('arrivalDate' in docObj));

    return resolveDocumentDetailRoute(
      docId,
      inferredOutgoing ? 'OutgoingDocument' : 'IncomingDocument'
    );
  }

  if (notification.type === 'user_created' || notification.type === 'user_updated') {
    return '/dashboard/admin/users';
  }
  if (notification.type === 'department_created' || notification.type === 'department_updated') {
    return '/dashboard/admin/departments';
  }

  return null;
};
