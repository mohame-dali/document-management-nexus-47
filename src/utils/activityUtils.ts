
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
      color: 'border-[#e53e3e] bg-[#feeeee]/30',
      badgeColor: 'bg-[#feeeee] text-[#9b2c2c] border border-[#feb2b2]',
      daysDiff: Math.abs(daysDiff)
    };
  } else if (daysDiff === 0) {
    return {
      type: 'today',
      label: 'اليوم',
      color: 'border-[#d69e2e] bg-[#fef9e7]/30',
      badgeColor: 'bg-[#fef9e7] text-[#744210] border border-[#fbd38d]',
      daysDiff
    };
  } else if (daysDiff === 1) {
    return {
      type: 'tomorrow',
      label: 'غداً',
      color: 'border-[#d69e2e] bg-[#fef9e7]/20',
      badgeColor: 'bg-[#fef9e7] text-[#744210] border border-[#fbd38d]',
      daysDiff
    };
  } else if (daysDiff === 2) {
    return {
      type: '2days',
      label: 'خلال يومين',
      color: 'border-[#2c5282] bg-[#ebf4ff]/30',
      badgeColor: 'bg-[#ebf4ff] text-[#2c5282] border border-[#bee3f8]',
      daysDiff
    };
  } else if (daysDiff <= 3) {
    return {
      type: '3days',
      label: 'خلال 3 أيام',
      color: 'border-[#38a169] bg-[#ebf8f1]/30',
      badgeColor: 'bg-[#ebf8f1] text-[#22543d] border border-[#bbf0d0]',
      daysDiff
    };
  }

  return null;
};

export const hasActivityAlert = (document: IncomingDocument): boolean => {
  const urgency = getActivityUrgency(document);
  return urgency !== null && urgency.daysDiff <= 3;
};
