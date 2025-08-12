
import { IncomingDocument } from '@/types';

export const getActivityUrgency = (document: IncomingDocument) => {
  if (!document.activity || !document.dateActivity) {
    return null;
  }

  const activityDate = new Date(document.dateActivity);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.ceil((activityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    return {
      type: 'overdue',
      label: 'متأخر',
      color: 'border-red-500 bg-red-50',
      badgeColor: 'bg-red-500 text-white',
      daysDiff: Math.abs(daysDiff)
    };
  } else if (daysDiff === 0) {
    return {
      type: 'today',
      label: 'اليوم',
      color: 'border-orange-500 bg-orange-50',
      badgeColor: 'bg-orange-500 text-white',
      daysDiff
    };
  } else if (daysDiff === 1) {
    return {
      type: 'tomorrow',
      label: 'غداً',
      color: 'border-yellow-500 bg-yellow-50',
      badgeColor: 'bg-yellow-500 text-white',
      daysDiff
    };
  } else if (daysDiff === 2) {
    return {
      type: '2days',
      label: 'خلال يومين',
      color: 'border-blue-500 bg-blue-50',
      badgeColor: 'bg-blue-500 text-white',
      daysDiff
    };
  } else if (daysDiff <= 3) {
    return {
      type: '3days',
      label: 'خلال 3 أيام',
      color: 'border-green-500 bg-green-50',
      badgeColor: 'bg-green-500 text-white',
      daysDiff
    };
  }

  return null;
};

export const hasActivityAlert = (document: IncomingDocument): boolean => {
  const urgency = getActivityUrgency(document);
  return urgency !== null && urgency.daysDiff <= 3;
};
