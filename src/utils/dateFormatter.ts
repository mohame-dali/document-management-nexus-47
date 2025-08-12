// Import the new Arabic date formatter
import { formatArabicDate, formatArabicDateTime } from './arabicDateFormatter';

// Update all existing functions to use Arabic format
export const formatDate = (date: string | Date): string => {
  return formatArabicDate(date);
};

export const formatDateTime = (date: string | Date): string => {
  return formatArabicDateTime(date);
};

// Keep other utility functions but update them to use Arabic formatting
export const formatRelativeDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'اليوم';
  } else if (diffInDays === 1) {
    return 'أمس';
  } else if (diffInDays < 7) {
    return `منذ ${diffInDays} أيام`;
  } else {
    return formatArabicDate(date);
  }
};

export const isToday = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return dateObj.toDateString() === today.toDateString();
};

export const isThisWeek = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  return diffInDays >= 0 && diffInDays < 7;
};
