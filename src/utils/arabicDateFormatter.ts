
/**
 * Comprehensive Arabic date formatting utilities for the DMS
 * Example: 10 جويلية 2025
 */

const arabicMonths = [
  'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
  'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const arabicWeekDays = [
  'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
];

// Core formatting function with enhanced error handling
export const formatArabicDate = (date: string | Date): string => {
  if (!date) return 'تاريخ غير محدد';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'تاريخ غير صحيح';
  }
  
  const day = dateObj.getDate();
  const month = arabicMonths[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  
  return `${day} ${month} ${year}`;
};

// Format with time
export const formatArabicDateTime = (date: string | Date): string => {
  if (!date) return 'تاريخ غير محدد';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'تاريخ غير صحيح';
  }
  
  const day = dateObj.getDate();
  const month = arabicMonths[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  
  return `${day} ${month} ${year} في ${hours}:${minutes}`;
};

// Format with weekday
export const formatArabicDateWithDay = (date: string | Date): string => {
  if (!date) return 'تاريخ غير محدد';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'تاريخ غير صحيح';
  }
  
  const weekDay = arabicWeekDays[dateObj.getDay()];
  const formattedDate = formatArabicDate(dateObj);
  
  return `${weekDay}، ${formattedDate}`;
};

// Helper function to format any date value to Arabic format
export const formatDateToArabic = (dateValue: any): string => {
  if (!dateValue) return 'تاريخ غير محدد';
  
  let dateObj: Date;
  
  // Handle different date formats
  if (typeof dateValue === 'string') {
    dateObj = new Date(dateValue);
  } else if (dateValue instanceof Date) {
    dateObj = dateValue;
  } else if (typeof dateValue === 'object' && dateValue.$date) {
    // Handle MongoDB date format
    dateObj = new Date(dateValue.$date);
  } else {
    return 'تاريخ غير صحيح';
  }
  
  if (isNaN(dateObj.getTime())) {
    return 'تاريخ غير صحيح';
  }
  
  return formatArabicDate(dateObj);
};

// Format for relative time (e.g., "منذ 3 أيام")
export const formatArabicRelativeTime = (date: string | Date): string => {
  if (!date) return 'تاريخ غير محدد';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'تاريخ غير صحيح';
  }
  
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  
  if (diffInDays > 7) {
    return formatArabicDate(dateObj);
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
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'غير صحيح';
  }
  
  const day = dateObj.getDate();
  const month = arabicMonths[dateObj.getMonth()].substring(0, 4); // Shortened month
  const year = dateObj.getFullYear();
  
  return `${day} ${month} ${year}`;
};
