/**
 * Génération des credentials utilisateur à partir des données Personnel
 */

export function generateUsername(prenom: string, nom: string): string {
  const clean = (s: string): string =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const p = clean(prenom);
  const n = clean(nom);

  if (!p && !n) return 'user';
  if (!p) return n;
  if (!n) return p;
  return `${p}.${n}`;
}

export function generatePassword(length: number = 10): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((x) => chars[x % chars.length])
    .join('');
}

export function suggestRole(
  departmentId: string | undefined | null,
  settings: {
    bureauDirecteurDepartmentId?: string | { toString(): string } | { _id?: string };
    bureauOrdreDepartmentId?: string | { toString(): string } | { _id?: string };
    rhDepartmentId?: string | { toString(): string } | { _id?: string };
  } | null | undefined
): 'Director' | 'AdminTuningDesk' | 'AdminDepartment' | 'User' {
  if (!departmentId || !settings) return 'User';

  const extractId = (val: unknown): string | undefined => {
    if (!val) return undefined;
    if (typeof val === 'object' && val !== null && '_id' in val) {
      return (val as { _id?: string })._id?.toString();
    }
    return val.toString();
  };

  const dId = departmentId.toString();
  const dirId = extractId(settings.bureauDirecteurDepartmentId);
  const boId = extractId(settings.bureauOrdreDepartmentId);
  const rhId = extractId(settings.rhDepartmentId);

  if (dirId && dId === dirId) return 'Director';
  if (boId && dId === boId) return 'AdminTuningDesk';
  if (rhId && dId === rhId) return 'AdminDepartment';
  return 'User';
}

export function getRoleArabicLabel(role: string): string {
  const map: Record<string, string> = {
    Director: 'مدير الإدارة',
    Admin: 'مدير النظام',
    AdminDepartment: 'مدير قسم',
    AdminTuningDesk: 'مكتب الضبط',
    User: 'موظف',
  };
  return map[role] || role;
}
