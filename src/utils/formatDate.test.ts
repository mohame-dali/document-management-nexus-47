import { describe, it, expect } from 'vitest';
import {
  formatShortDate,
  formatShortDayMonth,
  formatTime,
  formatLongDate,
  formatDateTime,
  formatShortDateTime,
  formatDateWithWeekday,
  formatDayMonthLabel,
  parseDateInput,
} from './formatDate';

describe('formatDate', () => {
  it('parses YYYY-MM-DD date-only strings in local time without shifting day', () => {
    const parsed = parseDateInput('2026-11-10');
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(10);
    expect(parsed?.getDate()).toBe(10);
  });

  it('formats short numeric dates as DD/MM/YYYY', () => {
    expect(formatShortDate('2026-11-10')).toBe('10/11/2026');
    expect(formatShortDate(new Date(2026, 0, 5))).toBe('05/01/2026');
    expect(formatShortDayMonth('2026-11-10')).toBe('10/11');
  });

  it('formats long dates explicitly in Arabic and French', () => {
    expect(formatLongDate('2026-11-10', 'ar')).toBe('10 نوفمبر 2026');
    expect(formatLongDate('2026-11-10', 'fr')).toBe('10 novembre 2026');
    expect(formatLongDate(new Date(2026, 0, 5), 'ar-TN')).toBe('5 جانفي 2026');
    expect(formatLongDate(new Date(2026, 0, 5), 'fr-FR')).toBe('5 janvier 2026');
  });

  it('formats date and time cleanly without scrambled BiDi word order', () => {
    const dt = new Date(2026, 10, 10, 14, 5, 9);
    expect(formatTime(dt)).toBe('14:05');
    expect(formatTime(dt, true)).toBe('14:05:09');
    expect(formatDateTime(dt, 'ar')).toBe('10 نوفمبر 2026 في 14:05');
    expect(formatDateTime(dt, 'fr')).toBe('10 novembre 2026 à 14:05');
    expect(formatShortDateTime(dt)).toBe('10/11/2026 14:05');
  });

  it('formats weekday + date and day/month labels properly', () => {
    const tuesday = new Date(2026, 10, 10); // Tuesday, 10 Nov 2026
    expect(formatDateWithWeekday(tuesday, 'ar')).toBe('الثلاثاء، 10 نوفمبر 2026');
    expect(formatDateWithWeekday(tuesday, 'fr')).toBe('mardi 10 novembre 2026');
    expect(formatDayMonthLabel(tuesday, 'ar')).toBe('10 نوفمبر');
    expect(formatDayMonthLabel(tuesday, 'fr')).toBe('10 nov.');
  });

  it('handles Mongo $date objects and invalid/empty inputs gracefully', () => {
    expect(formatShortDate({ $date: '2026-11-10T00:00:00.000Z' })).toMatch(/^\d{2}\/11\/2026$/);
    expect(formatShortDate(null)).toBe('—');
    expect(formatShortDate(undefined, '-')).toBe('-');
    expect(formatLongDate('', 'ar')).toBe('—');
    expect(formatDateTime('not-a-date', 'fr')).toBe('—');
  });
});
