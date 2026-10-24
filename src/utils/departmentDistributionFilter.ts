import { Department } from '@/types';

/**
 * Filter departments available for document distribution.
 * Excludes :
 *   - BO department (the distributor / bureauOrdreDepartmentId)
 *   - Direction department (has global read access / bureauDirecteurDepartmentId)
 *
 * Keeps :
 *   - RH, LABO, QT, PMI, and all other operational departments
 */
export function getDistributableDepartments(
  allDepartments: Department[] | null | undefined,
  settings: {
    bureauOrdreDepartmentId?: string | { _id?: string } | { toString(): string } | null;
    bureauDirecteurDepartmentId?: string | { _id?: string } | { toString(): string } | null;
  } | null | undefined
): Department[] {
  if (!allDepartments || !Array.isArray(allDepartments)) {
    return [];
  }

  if (!settings) {
    return allDepartments;
  }

  const extractId = (val: unknown): string => {
    if (!val) return '';
    if (typeof val === 'object' && val !== null) {
      if ('_id' in val && (val as { _id?: unknown })._id) {
        return String((val as { _id: unknown })._id);
      }
      return String(val.toString?.() || '');
    }
    return String(val);
  };

  const boId = extractId(settings.bureauOrdreDepartmentId);
  const dirId = extractId(settings.bureauDirecteurDepartmentId);

  return allDepartments.filter((dept) => {
    const id = dept._id?.toString();
    if (boId && id === boId) return false;   // Exclude BO
    if (dirId && id === dirId) return false; // Exclude Direction
    return true;
  });
}
