
import {
  ARABIC_MONTH_NAMES,
  formatDateTime,
  formatDateWithWeekday,
  formatLongDate,
  parseDateInput,
  type DateInput,
} from './formatDate';

/**
 * Comprehensive Arabic date formatting utilities for the DMS
 * Example: 10 جويلية 2025
 */

// Core formatting function with enhanced error handling
export const formatArabicDate = (date: string | Date): string => {
  if (!date) return 'تاريخ غير محدد';
  const parsed = parseDateInput(date);
  if (!parsed) return 'تاريخ غير صحيح';
  return formatLongDate(parsed, 'ar');
};

export const formatLocalizedDate = (
  date: string | Date,
  language: 'ar' | 'fr' = 'ar'
): string => {
  if (!date) return language === 'ar' ? 'تاريخ غير محدد' : 'Date non définie';
  const parsed = parseDateInput(date);
  if (!parsed) return language === 'ar' ? 'تاريخ غير صحيح' : 'Date invalide';
  return formatLongDate(parsed, language);
};

// Format with time
export const formatArabicDateTime = (date: string | Date): string => {
  if (!date) return 'تاريخ غير محدد';
  const parsed = parseDateInput(date);
  if (!parsed) return 'تاريخ غير صحيح';
  return formatDateTime(parsed, 'ar');
};

// Format with weekday
export const formatArabicDateWithDay = (date: string | Date): string => {
  if (!date) return 'تاريخ غير محدد';
  const parsed = parseDateInput(date);
  if (!parsed) return 'تاريخ غير صحيح';
  return formatDateWithWeekday(parsed, 'ar');
};

// Helper function to format any date value to Arabic format
export const formatDateToArabic = (dateValue: unknown): string => {
  if (!dateValue) return 'تاريخ غير محدد';
  const parsed = parseDateInput(dateValue as DateInput);
  if (!parsed) return 'تاريخ غير صحيح';
  return formatLongDate(parsed, 'ar');
};

// Format for relative time (e.g., "منذ 3 أيام")
export const formatArabicRelativeTime = (date: string | Date): string => {
  if (!date) return 'تاريخ غير محدد';

  const dateObj = parseDateInput(date);

  if (!dateObj) {
    return 'تاريخ غير صحيح';
  }

  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  if (diffInDays > 7) {
    return formatLongDate(dateObj, 'ar');
  } else if (diffInDays > 0) {
    return `منذ ${diffInDays} ${diffInDays === 1 ? 'يوم' : 'أيام'}`;
  } else if (diffInHours > 0) {
    return `منذ ${diffInHours} ${diffInHours === 1 ? 'ساعة' : 'ساعات'}`;
  } else if (diffInMinutes > 0) {
    return `منذ ${diffInMinutes} ${diffInMinutes === 1 ? 'دقيقة' : 'دقائق'}`;
  } else {
    return 'الآن';
  }
};

// Format for short date display (mobile friendly)
export const formatArabicDateShort = (date: string | Date): string => {
  if (!date) return 'غير محدد';

  const dateObj = parseDateInput(date);

  if (!dateObj) {
    return 'غير صحيح';
  }

  const day = dateObj.getDate();
  const month = ARABIC_MONTH_NAMES[dateObj.getMonth()].substring(0, 4);
  const year = dateObj.getFullYear();

  return `${day} ${month} ${year}`;
};
