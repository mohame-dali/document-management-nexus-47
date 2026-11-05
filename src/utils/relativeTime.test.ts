import { describe, it, expect } from 'vitest';
import { getRelativeTime, getDateGroup } from './relativeTime';

describe('relativeTime', () => {
  it('retourne "الآن" pour maintenant', () => {
    expect(getRelativeTime(new Date())).toBe('الآن');
  });

  it('retourne "منذ X دقيقة" pour 5 min', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(getRelativeTime(date)).toContain('منذ');
    expect(getRelativeTime(date)).toContain('5');
  });

  it('groupe aujourd\'hui correctement', () => {
    expect(getDateGroup(new Date())).toBe('today');
  });

  it('groupe hier correctement', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(getDateGroup(yesterday)).toBe('yesterday');
  });
});
