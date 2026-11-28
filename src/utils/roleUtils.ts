import type { PersonnelSummary, User } from '@/types';

const EXECUTIVE_ROLES = new Set(['admin', 'director', 'directeur']);

type UserLike = Partial<User> & {
  position?: string;
  title?: string;
  poste?: string;
  personnelId?: string | PersonnelSummary | null;
};

export const isExecutiveDashboardUser = (user?: UserLike | null): boolean => {
  if (!user) return false;

  const role = String(user.role || '').trim().toLowerCase();
  if (EXECUTIVE_ROLES.has(role)) return true;

  const position = String(user.position || user.title || user.poste || '').trim().toLowerCase();
  if (EXECUTIVE_ROLES.has(position)) return true;

  if (user.personnelId && typeof user.personnelId === 'object') {
    const personnelPoste = String(user.personnelId.poste || '').trim().toLowerCase();
    if (EXECUTIVE_ROLES.has(personnelPoste)) return true;
  }

  return false;
};

export const getDefaultLandingRoute = (user?: UserLike | null): string =>
  isExecutiveDashboardUser(user) ? '/dashboard' : '/dashboard/mail/incoming';
