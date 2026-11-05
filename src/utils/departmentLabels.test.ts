import { describe, it, expect } from 'vitest';
import { getDepartmentLabel } from './departmentLabels';

describe('departmentLabels', () => {
  const settings = {
    bureauOrdreDepartmentId: 'bo-id',
    rhDepartmentId: 'rh-id',
    bureauDirecteurDepartmentId: 'dir-id',
  };

  it('traduit BO en مكتب الضبط', () => {
    expect(getDepartmentLabel({ _id: 'bo-id', name: 'BO' }, settings)).toBe('مكتب الضبط');
  });

  it('traduit Direction en الإدارة العامة', () => {
    expect(getDepartmentLabel({ _id: 'dir-id', name: 'Direction' }, settings)).toBe('الإدارة العامة');
  });

  it('retourne le nom brut si non reconnu', () => {
    expect(getDepartmentLabel({ _id: 'other', name: 'LABO' }, settings)).toBe('LABO');
  });
});
