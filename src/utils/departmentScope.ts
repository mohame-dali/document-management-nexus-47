import { Department, ResponsibleUserRef, User } from '@/types';

export interface NormalizedDeptMeta {
  id: string;
  name: string;
  code: string;
  displayName: string;
}

export function extractDeptMeta(dept: unknown): NormalizedDeptMeta {
  if (!dept) {
    return { id: '', name: '', code: '', displayName: '' };
  }

  if (typeof dept === 'string') {
    const trimmed = dept.trim();
    const looksLikeObjectId = /^[a-f0-9]{24}$/i.test(trimmed);
    return {
      id: trimmed,
      name: looksLikeObjectId ? '' : trimmed.toLowerCase(),
      code: looksLikeObjectId ? '' : trimmed.toLowerCase(),
      displayName: looksLikeObjectId ? '' : trimmed,
    };
  }

  if (typeof dept === 'object') {
    const obj = dept as {
      _id?: unknown;
      id?: unknown;
      name?: unknown;
      code?: unknown;
    };
    const rawId =
      obj._id ??
      (typeof obj.id === 'object' && obj.id !== null
        ? (obj.id as { _id?: unknown })?._id
        : obj.id);
    const id = rawId ? String(rawId).trim() : '';
    const rawName = typeof obj.name === 'string' ? obj.name.trim() : '';
    const rawCode = typeof obj.code === 'string' ? obj.code.trim() : '';
    return {
      id,
      name: rawName.toLowerCase(),
      code: rawCode.toLowerCase(),
      displayName: rawName || rawCode,
    };
  }

  const str = String(dept).trim();
  return { id: str, name: '', code: '', displayName: '' };
}

export function isRhDepartment(dept: unknown, rhDeptId?: string | null): boolean {
  const meta = extractDeptMeta(dept);
  if (rhDeptId && meta.id && meta.id === String(rhDeptId).trim()) {
    return true;
  }
  if (['rh', 'hr'].includes(meta.code)) {
    return true;
  }
  return (
    /\b(rh|hr)\b/i.test(meta.name) ||
    /ressources?\s*humaines?/i.test(meta.name) ||
    /الموارد\s*البشرية/i.test(meta.name)
  );
}

export function isBureauDirecteurDepartment(dept: unknown, bdDeptId?: string | null): boolean {
  const meta = extractDeptMeta(dept);
  if (bdDeptId && meta.id && meta.id === String(bdDeptId).trim()) {
    return true;
  }
  if (['dg', 'bd', 'dir'].includes(meta.code)) {
    return true;
  }
  return (
    /^(dg|bd|dir)$/i.test(meta.name) ||
    /bureau\s*(du\s*)?directeur/i.test(meta.name) ||
    /^direction(\s+g[ée]n[ée]rale)?$/i.test(meta.name) ||
    /مكتب\s*المدير/i.test(meta.name) ||
    /المديرية/i.test(meta.name)
  );
}

export function isBureauOrdreDepartment(dept: unknown, boDeptId?: string | null): boolean {
  const meta = extractDeptMeta(dept);
  if (boDeptId && meta.id && meta.id === String(boDeptId).trim()) {
    return true;
  }
  if (['bo'].includes(meta.code)) {
    return true;
  }
  return (
    /\bbo\b/i.test(meta.name) ||
    /bureau\s*d['’]?\s*ordre/i.test(meta.name) ||
    /bureau\s*ordre/i.test(meta.name) ||
    /مكتب\s*الضبط/i.test(meta.name) ||
    /مكتب\s*التنسيق/i.test(meta.name)
  );
}

export function isBureauOrdreUserAccount(
  user: User | null | undefined,
  boDeptId?: string | null
): boolean {
  if (!user || user.role === 'Admin') return false;
  if (user.role === 'AdminTuningDesk') return true;
  if (user.activeDepartment && isBureauOrdreDepartment(user.activeDepartment, boDeptId)) {
    return true;
  }
  if (
    !user.activeDepartment &&
    Array.isArray(user.departments) &&
    user.departments.some((d) => isBureauOrdreDepartment(d, boDeptId))
  ) {
    return true;
  }
  if (!user.activeDepartment && (!user.departments || user.departments.length === 0)) {
    return user.username?.trim().toLowerCase() === 'bo';
  }
  return false;
}

export function getUserDepartmentLabel(user: ResponsibleUserRef): string {
  const candidates: Array<Department | string | null | undefined> = [
    user.activeDepartment,
    ...(Array.isArray(user.departments) ? user.departments : []),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const meta = extractDeptMeta(candidate);
    if (meta.displayName) {
      return meta.displayName;
    }
  }
  return '';
}
