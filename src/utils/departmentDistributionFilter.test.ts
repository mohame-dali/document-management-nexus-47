import { describe, it, expect } from 'vitest';
import { getDistributableDepartments } from './departmentDistributionFilter';
import { Department } from '@/types';

describe('departmentDistributionFilter', () => {
  const departments = [
    { _id: 'bo-id', name: 'BO' },
    { _id: 'rh-id', name: 'RH' },
    { _id: 'dir-id', name: 'Direction' },
    { _id: 'labo-id', name: 'LABO' },
  ] as unknown as Department[];

  it('exclut BO et Direction', () => {
    const result = getDistributableDepartments(departments, {
      bureauOrdreDepartmentId: 'bo-id',
      bureauDirecteurDepartmentId: 'dir-id',
    });
    expect(result).toHaveLength(2);
    expect(result.map(d => d._id)).toEqual(['rh-id', 'labo-id']);
  });

  it('garde tous les départements si settings null', () => {
    const result = getDistributableDepartments(departments, null);
    expect(result).toHaveLength(4);
  });
});
