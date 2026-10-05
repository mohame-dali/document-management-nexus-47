/**
 * Maps department IDs to their Arabic labels based on 
 * OrganizationSettings roles.
 */

interface DepartmentLike {
  _id?: string | { toString(): string };
  name?: string;
}

interface OrgSettingsLike {
  bureauOrdreDepartmentId?: string | { toString(): string; _id?: string } | null;
  bureauDirecteurDepartmentId?: string | { toString(): string; _id?: string } | null;
  rhDepartmentId?: string | { toString(): string; _id?: string } | null;
}

const extractId = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'object') {
    return String(val._id || val.toString() || '');
  }
  return String(val);
};

/**
 * Get the Arabic label for a department.
 * Priority:
 *   1. If department is BO → "مكتب الضبط"
 *   2. If department is Direction → "الإدارة العامة"
 *   3. If department is RH → "الموارد البشرية"
 *   4. Otherwise → dept.name (raw name)
 */
export function getDepartmentLabel(
  department: DepartmentLike | string | null | undefined,
  settings: OrgSettingsLike | null | undefined
): string {
  if (!department) return '—';

  // If department is just an ID string without name
  if (typeof department === 'string') {
    if (!settings) return department;
    const id = department.toString();
    if (id === extractId(settings.bureauOrdreDepartmentId)) return 'مكتب الضبط';
    if (id === extractId(settings.bureauDirecteurDepartmentId)) return 'الإدارة العامة';
    if (id === extractId(settings.rhDepartmentId)) return 'الموارد البشرية';
    return department;
  }

  const id = extractId(department._id);
  const rawName = department.name || '—';

  if (!settings) return rawName;

  // Match against org settings
  if (id && id === extractId(settings.bureauOrdreDepartmentId)) {
    return 'مكتب الضبط';
  }
  if (id && id === extractId(settings.bureauDirecteurDepartmentId)) {
    return 'الإدارة العامة';
  }
  if (id && id === extractId(settings.rhDepartmentId)) {
    return 'الموارد البشرية';
  }

  // Fallback: use raw name
  return rawName;
}
