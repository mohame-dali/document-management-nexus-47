import { Department, User } from '@/types';
import { OrganizationSettings } from '@/services/organizationSettingsService';

type DeptLike = {
  _id?: string;
  name?: string;
  description?: string;
  code?: string;
};

export const extractEntityId = (val: unknown): string | null => {
  if (!val) return null;
  if (typeof val === 'string') return val.trim() || null;
  if (typeof val === 'object') {
    const obj = val as { _id?: unknown; id?: unknown };
    if (obj._id) return String(obj._id);
    if (obj.id) return String(obj.id);
  }
  return null;
};

const normalizeText = (value?: string | null): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’'`]/g, "'");

export const isRHDeptMeta = (dept?: DeptLike | null): boolean => {
  const name = normalizeText(dept?.name);
  const desc = normalizeText(dept?.description);
  const code = normalizeText(dept?.code);
  return (
    code === 'rh' ||
    name === 'rh' ||
    name === 'ressources humaines' ||
    name === 'الموارد البشرية' ||
    name.includes('ressources humaines') ||
    name.includes('الموارد البشرية') ||
    desc.includes('(rh)')
  );
};

export const isBureauDirecteurMeta = (dept?: DeptLike | null): boolean => {
  const name = normalizeText(dept?.name);
  const desc = normalizeText(dept?.description);
  const code = normalizeText(dept?.code);
  return (
    code === 'dg' ||
    code === 'bd' ||
    code === 'dir' ||
    name === 'dg' ||
    name === 'bd' ||
    name === 'bureau directeur' ||
    name === 'direction' ||
    name === 'direction générale' ||
    name === 'direction generale' ||
    name === 'الإدارة العامة' ||
    name === 'مكتب المدير' ||
    name.includes('bureau directeur') ||
    name.includes('direction générale') ||
    name.includes('direction generale') ||
    desc.includes('(dir)') ||
    desc.includes('(dg)') ||
    desc.includes('(bd)')
  );
};

export const isBureauOrdreMeta = (dept?: DeptLike | null): boolean => {
  const name = normalizeText(dept?.name);
  const desc = normalizeText(dept?.description);
  const code = normalizeText(dept?.code);
  return (
    code === 'bo' ||
    name === 'bo' ||
    name === "bureau d'ordre" ||
    name === 'bureau ordre' ||
    name === 'مكتب الضبط' ||
    name.includes("bureau d'ordre") ||
    name.includes('bureau ordre') ||
    desc.includes('(bo)')
  );
};

export interface FrontendAttendanceScope {
  isFullMultiDeptRole: boolean;
  isRHManager: boolean;
  allowAllOption: boolean;
  userDeptId: string | null;
  visibleDepartments: Department[];
  defaultDepartmentId: string;
}

export function resolveFrontendAttendanceScope(
  currentUser: User | null | undefined,
  departments: Department[],
  orgSettings: OrganizationSettings | null
): FrontendAttendanceScope {
  const userRole = currentUser?.role;
  const userDeptId = extractEntityId(currentUser?.activeDepartment);
  const activeDeptObj =
    currentUser?.activeDepartment && typeof currentUser.activeDepartment === 'object'
      ? (currentUser.activeDepartment as DeptLike)
      : departments.find((d) => String(d._id) === String(userDeptId)) || null;

  const isFullMultiDeptRole = userRole === 'Admin' || userRole === 'Director';

  if (isFullMultiDeptRole) {
    return {
      isFullMultiDeptRole: true,
      isRHManager: userRole === 'Admin',
      allowAllOption: true,
      userDeptId,
      visibleDepartments: departments,
      defaultDepartmentId: 'all',
    };
  }

  let rhDeptId = extractEntityId(orgSettings?.rhDepartmentId);
  let bdDeptId = extractEntityId(orgSettings?.bureauDirecteurDepartmentId);
  let boDeptId = extractEntityId(orgSettings?.bureauOrdreDepartmentId);

  if (!rhDeptId) {
    const found = departments.find(isRHDeptMeta);
    if (found) rhDeptId = String(found._id);
  }
  if (!bdDeptId) {
    const found = departments.find(isBureauDirecteurMeta);
    if (found) bdDeptId = String(found._id);
  }
  if (!boDeptId) {
    const found = departments.find(isBureauOrdreMeta);
    if (found) boDeptId = String(found._id);
  }

  if (userRole === 'AdminDepartment') {
    const isRHManager = Boolean(
      (userDeptId && rhDeptId && String(userDeptId) === String(rhDeptId)) ||
        (!rhDeptId && activeDeptObj && isRHDeptMeta(activeDeptObj))
    );

    const allowedIds = new Set<string>();
    if (isRHManager) {
      if (userDeptId) allowedIds.add(String(userDeptId));
      if (rhDeptId) allowedIds.add(String(rhDeptId));
      if (bdDeptId) allowedIds.add(String(bdDeptId));
      if (boDeptId) allowedIds.add(String(boDeptId));
    } else {
      if (userDeptId) allowedIds.add(String(userDeptId));
      if (bdDeptId) allowedIds.add(String(bdDeptId));
    }

    const visibleDepartments = departments
      .filter((d) => allowedIds.has(String(d._id)))
      .sort((a, b) => {
        if (userDeptId && String(a._id) === String(userDeptId)) return -1;
        if (userDeptId && String(b._id) === String(userDeptId)) return 1;
        return 0;
      });
    const defaultDepartmentId =
      (userDeptId && visibleDepartments.some((d) => String(d._id) === String(userDeptId))
        ? String(userDeptId)
        : visibleDepartments[0]?._id) ||
      userDeptId ||
      '';

    return {
      isFullMultiDeptRole: false,
      isRHManager,
      allowAllOption: false,
      userDeptId,
      visibleDepartments,
      defaultDepartmentId,
    };
  }

  return {
    isFullMultiDeptRole: false,
    isRHManager: false,
    allowAllOption: false,
    userDeptId,
    visibleDepartments: [],
    defaultDepartmentId: userDeptId || '',
  };
}
