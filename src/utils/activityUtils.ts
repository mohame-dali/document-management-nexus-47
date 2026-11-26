
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
      color: 'border-red-500/80 bg-red-50/40 dark:bg-red-950/20',
      badgeColor: 'bg-red-50/90 text-red-800 border border-red-200/80 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60',
      daysDiff: Math.abs(daysDiff)
    };
  } else if (daysDiff === 0) {
    return {
      type: 'today',
      label: 'اليوم',
      color: 'border-amber-500/80 bg-amber-50/40 dark:bg-amber-950/20',
      badgeColor: 'bg-amber-50/90 text-amber-800 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
      daysDiff
    };
  } else if (daysDiff === 1) {
    return {
      type: 'tomorrow',
      label: 'غداً',
      color: 'border-amber-500/70 bg-amber-50/30 dark:bg-amber-950/15',
      badgeColor: 'bg-amber-50/90 text-amber-800 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
      daysDiff
    };
  } else if (daysDiff === 2) {
    return {
      type: '2days',
      label: 'خلال يومين',
      color: 'border-blue-500/70 bg-blue-50/35 dark:bg-blue-950/20',
      badgeColor: 'bg-blue-50/90 text-[#1e3a5f] border border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60',
      daysDiff
    };
  } else if (daysDiff <= 3) {
    return {
      type: '3days',
      label: 'خلال 3 أيام',
      color: 'border-emerald-500/70 bg-emerald-50/35 dark:bg-emerald-950/20',
      badgeColor: 'bg-emerald-50/90 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
      daysDiff
    };
  }

  return null;
};

export const hasActivityAlert = (document: IncomingDocument): boolean => {
  const urgency = getActivityUrgency(document);
  return urgency !== null && urgency.daysDiff <= 3;
};

export interface DocumentPriorityMeta {
  level: 'very-urgent' | 'urgent' | 'normal';
  label: string;
  pillClasses: string;
  rowAccentClasses: string;
  cardAccentClasses: string;
}

export const getDocumentPriority = (
  document: Pick<IncomingDocument, 'activity' | 'dateActivity'> | null | undefined,
  isFr: boolean
): DocumentPriorityMeta => {
  const urgency = document ? getActivityUrgency(document as IncomingDocument) : null;

  if (urgency?.type === 'overdue' || urgency?.type === 'today') {
    return {
      level: 'very-urgent',
      label: isFr ? 'Très urgent' : 'عاجل جداً',
      pillClasses:
        'bg-red-50/90 text-red-700 border border-red-200/80 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/70',
      rowAccentClasses:
        'border-s-2 border-s-red-500 bg-red-50/25 dark:bg-red-950/10',
      cardAccentClasses:
        'border-s-2 border-s-red-500',
    };
  }

  if (
    urgency?.type === 'tomorrow' ||
    urgency?.type === '2days' ||
    urgency?.type === '3days'
  ) {
    return {
      level: 'urgent',
      label: isFr ? 'Urgent' : 'عاجل',
      pillClasses:
        'bg-amber-50/90 text-amber-800 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
      rowAccentClasses:
        'border-s-2 border-s-amber-500 bg-amber-50/20 dark:bg-amber-950/10',
      cardAccentClasses:
        'border-s-2 border-s-amber-500',
    };
  }

  return {
    level: 'normal',
    label: isFr ? 'Normal' : 'عادي',
    pillClasses:
      'bg-slate-100/90 text-slate-600 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    rowAccentClasses: '',
    cardAccentClasses: '',
  };
};

