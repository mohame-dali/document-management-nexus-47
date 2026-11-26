export type SupportedDateLang = 'ar' | 'fr';

export type DateInput =
  | Date
  | string
  | number
  | { $date: string | number }
  | null
  | undefined;

export const ARABIC_MONTH_NAMES = [
  'جانفي',
  'فيفري',
  'مارس',
  'أفريل',
  'ماي',
  'جوان',
  'جويلية',
  'أوت',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
] as const;

export const FRENCH_MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

export const FRENCH_SHORT_MONTH_NAMES = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
] as const;

export const ARABIC_WEEKDAY_NAMES = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
] as const;

export const FRENCH_WEEKDAY_NAMES = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
] as const;

export const normalizeDateLang = (lang?: string): SupportedDateLang => {
  if (typeof lang === 'string' && lang.toLowerCase().startsWith('fr')) {
    return 'fr';
  }
  return 'ar';
};

export const parseDateInput = (input: DateInput): Date | null => {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === 'object' && '$date' in input) {
    return parseDateInput(input.$date);
  }

  if (typeof input === 'number') {
    const parsed = new Date(input);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Parse date-only YYYY-MM-DD in local time to prevent timezone off-by-one shifts
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]) - 1;
      const day = Number(dateOnlyMatch[3]);
      const localDate = new Date(year, month, day);
      if (
        !isNaN(localDate.getTime()) &&
        localDate.getFullYear() === year &&
        localDate.getMonth() === month &&
        localDate.getDate() === day
      ) {
        return localDate;
      }
      return null;
    }

    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

/**
 * Formats a date as numeric DD/MM/YYYY (e.g., "10/11/2026").
 * Note: Wrap in <bdi dir="ltr" className="tabular-nums"> when rendered inside RTL JSX.
 */
export const formatShortDate = (date: DateInput, fallback = '—'): string => {
  const d = parseDateInput(date);
  if (!d) return fallback;

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
};

/**
 * Formats a date as numeric DD/MM (e.g., "10/11").
 * Note: Wrap in <bdi dir="ltr" className="tabular-nums"> when rendered inside RTL JSX.
 */
export const formatShortDayMonth = (date: DateInput, fallback = '—'): string => {
  const d = parseDateInput(date);
  if (!d) return fallback;

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');

  return `${dd}/${mm}`;
};

/**
 * Formats time as 24-hour HH:mm or HH:mm:ss.
 * Note: Wrap in <bdi dir="ltr" className="tabular-nums"> when rendered inside RTL JSX.
 */
export const formatTime = (
  date: DateInput,
  withSeconds = false,
  fallback = '—'
): string => {
  const d = parseDateInput(date);
  if (!d) return fallback;

  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  if (!withSeconds) {
    return `${hh}:${min}`;
  }

  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${min}:${sec}`;
};

/**
 * Explicitly formats date parts as "${day} ${monthName} ${year}"
 * (e.g., "10 نوفمبر 2026" in Arabic or "10 novembre 2026" in French),
 * avoiding browser-dependent toLocaleDateString('ar') BiDi reordering.
 * Note: When rendering in JSX, do NOT wrap Arabic output in dir="ltr"; use dir="rtl" or omit dir inside RTL containers.
 */
export const formatLongDate = (
  date: DateInput,
  lang: SupportedDateLang | string = 'ar',
  fallback = '—'
): string => {
  const d = parseDateInput(date);
  if (!d) return fallback;

  const normalized = normalizeDateLang(lang);
  const day = d.getDate();
  const monthName =
    normalized === 'fr'
      ? FRENCH_MONTH_NAMES[d.getMonth()]
      : ARABIC_MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${monthName} ${year}`;
};

/**
 * Cleanly formats date + HH:mm without scrambled BiDi word order:
 * - Arabic: "10 نوفمبر 2026 في 14:30"
 * - French: "10 novembre 2026 à 14:30"
 */
export const formatDateTime = (
  date: DateInput,
  lang: SupportedDateLang | string = 'ar',
  fallback = '—'
): string => {
  const d = parseDateInput(date);
  if (!d) return fallback;

  const normalized = normalizeDateLang(lang);
  const datePart = formatLongDate(d, normalized, fallback);
  const timePart = formatTime(d, false, '');

  return normalized === 'fr'
    ? `${datePart} à ${timePart}`
    : `${datePart} في ${timePart}`;
};

/**
 * Compact numeric date + time: "DD/MM/YYYY HH:mm" (e.g., "10/11/2026 14:30").
 * Wrap in <bdi dir="ltr" className="tabular-nums"> inside RTL containers.
 */
export const formatShortDateTime = (date: DateInput, fallback = '—'): string => {
  const d = parseDateInput(date);
  if (!d) return fallback;

  return `${formatShortDate(d, fallback)} ${formatTime(d, false, '')}`;
};

/**
 * Formats date with weekday name explicitly:
 * - Arabic: "الثلاثاء، 10 نوفمبر 2026"
 * - French: "mardi 10 novembre 2026"
 */
export const formatDateWithWeekday = (
  date: DateInput,
  lang: SupportedDateLang | string = 'ar',
  fallback = '—'
): string => {
  const d = parseDateInput(date);
  if (!d) return fallback;

  const normalized = normalizeDateLang(lang);
  const longDate = formatLongDate(d, normalized, fallback);

  if (normalized === 'fr') {
    return `${FRENCH_WEEKDAY_NAMES[d.getDay()]} ${longDate}`;
  }
  return `${ARABIC_WEEKDAY_NAMES[d.getDay()]}، ${longDate}`;
};

/**
 * Formats day and month label explicitly without year:
 * - Arabic: "10 نوفمبر"
 * - French: "10 nov."
 */
export const formatDayMonthLabel = (
  date: DateInput,
  lang: SupportedDateLang | string = 'ar',
  fallback = '—'
): string => {
  const d = parseDateInput(date);
  if (!d) return fallback;

  const normalized = normalizeDateLang(lang);
  const day = d.getDate();
  const monthName =
    normalized === 'fr'
      ? FRENCH_SHORT_MONTH_NAMES[d.getMonth()]
      : ARABIC_MONTH_NAMES[d.getMonth()];

  return `${day} ${monthName}`;
};
