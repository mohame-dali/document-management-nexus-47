import { describe, it, expect } from 'vitest';
import { resolveFrontendAttendanceScope } from './attendanceScope';
import type { Department, User } from '@/types';
import type { OrganizationSettings } from '@/services/organizationSettingsService';

const departments: Department[] = [
  { _id: 'dept-rh', name: 'RH', description: 'Ressources Humaines (RH)' },
  { _id: 'dept-bd', name: 'Bureau Directeur', description: 'Direction Générale (DG)' },
  { _id: 'dept-bo', name: "Bureau d'Ordre", description: "Bureau d'Ordre (BO)" },
  { _id: 'dept-labo', name: 'LABO', description: 'Laboratoire' },
];

const orgSettings: OrganizationSettings = {
  nomAdministration: 'Administration Centrale',
  logoAdministration: '',
  rhDepartmentId: 'dept-rh',
  bureauDirecteurDepartmentId: 'dept-bd',
  bureauOrdreDepartmentId: 'dept-bo',
};

const makeUser = (role: User['role'], activeDepartment: string): User =>
  ({
    _id: 'user-1',
    username: 'test_user',
    email: 'test@example.com',
    role,
    departments: [activeDepartment],
    activeDepartment,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }) as unknown as User;

describe('resolveFrontendAttendanceScope', () => {
  it('grants Admin and Director access to all departments and the "all" option', () => {
    for (const role of ['Admin', 'Director'] as const) {
      const scope = resolveFrontendAttendanceScope(makeUser(role, 'dept-rh'), departments, orgSettings);
      expect(scope.isFullMultiDeptRole).toBe(true);
      expect(scope.allowAllOption).toBe(true);
      expect(scope.defaultDepartmentId).toBe('all');
      expect(scope.visibleDepartments.map((d) => d._id)).toEqual([
        'dept-rh',
        'dept-bd',
        'dept-bo',
        'dept-labo',
      ]);
    }
  });

  it('restricts AdminDepartment of RH (rh_manager) exclusively to RH, Bureau Directeur, and Bureau dOrdre', () => {
    const scope = resolveFrontendAttendanceScope(
      makeUser('AdminDepartment', 'dept-rh'),
      departments,
      orgSettings
    );

    expect(scope.isFullMultiDeptRole).toBe(false);
    expect(scope.isRHManager).toBe(true);
    expect(scope.allowAllOption).toBe(false);
    expect(scope.defaultDepartmentId).toBe('dept-rh');
    expect(scope.visibleDepartments.map((d) => d._id)).toEqual([
      'dept-rh',
      'dept-bd',
      'dept-bo',
    ]);
    expect(scope.visibleDepartments.some((d) => d._id === 'dept-labo')).toBe(false);
  });

  it('restricts standard AdminDepartment (LABO) exclusively to LABO and Bureau Directeur', () => {
    const scope = resolveFrontendAttendanceScope(
      makeUser('AdminDepartment', 'dept-labo'),
      departments,
      orgSettings
    );

    expect(scope.isFullMultiDeptRole).toBe(false);
    expect(scope.isRHManager).toBe(false);
    expect(scope.allowAllOption).toBe(false);
    expect(scope.defaultDepartmentId).toBe('dept-labo');
    expect(scope.visibleDepartments.map((d) => d._id)).toEqual([
      'dept-labo',
      'dept-bd',
    ]);
    expect(scope.visibleDepartments.some((d) => d._id === 'dept-rh')).toBe(false);
    expect(scope.visibleDepartments.some((d) => d._id === 'dept-bo')).toBe(false);
  });

  it('falls back to department metadata when OrganizationSettings IDs are null', () => {
    const scope = resolveFrontendAttendanceScope(
      makeUser('AdminDepartment', 'dept-rh'),
      departments,
      null
    );

    expect(scope.isRHManager).toBe(true);
    expect(scope.allowAllOption).toBe(false);
    expect(scope.visibleDepartments.map((d) => d._id)).toEqual([
      'dept-rh',
      'dept-bd',
      'dept-bo',
    ]);
  });
});
