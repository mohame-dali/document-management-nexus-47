/**
 * Redirections rétrocompatibles vers l'architecture Gmail (5 hubs).
 * 
 * ÉTAT : ACTIVÉ (ENABLE_REDIRECTS = true)
 * Les anciennes routes redirigent vers les hubs correspondants.
 * 
 * STRUCTURE CIBLE (5 hubs) :
 *   Hub 1 : 📁 البريد والمستندات    → /dashboard/mail
 *   Hub 2 : 🏛️ الموارد البشرية       → /dashboard/hr
 *   Hub 3 : ⚙️ الأدوات               → /dashboard/tools
 *   Hub 4 : 👤 الملف والحضور         → /dashboard/profile
 *   Hub 5 : 🏢 الإدارة              → /dashboard/admin
 * 
 * + 3 items directs :
 *   - 📊 لوحة التحكم
 *   - 💬 الرسائل
 *   - 🗑️ سلة المحذوفات
 * 
 * ROLLBACK : ENABLE_REDIRECTS = false → retour à l'ancien système.
 */

export const ENABLE_REDIRECTS = true;

export interface RouteRedirect {
  from: string;
  to: string;
}

/**
 * Redirections des chemins principaux (sans paramètres).
 */
export const PRIMARY_REDIRECTS: RouteRedirect[] = [
  // Hub 1 — البريد والمستندات
  { from: 'incoming-documents',  to: '/dashboard/mail/incoming' },
  { from: 'outgoing-documents',  to: '/dashboard/mail/outgoing' },
  { from: 'folders',             to: '/dashboard/mail/folders' },
  { from: 'advanced-search',     to: '/dashboard/mail/search' },

  // Hub 3 — الأدوات
  { from: 'templates',           to: '/dashboard/tools/templates' },
  { from: 'document-options',    to: '/dashboard/tools/document-options' },

  // Hub 4 — الملف والحضور
  { from: 'hr/my-profile',       to: '/dashboard/profile/my-profile' },
  { from: 'hr/my-attendance',    to: '/dashboard/profile/my-attendance' },

  // Hub 5 — الإدارة
  { from: 'users',               to: '/dashboard/admin/users' },
  { from: 'departments',         to: '/dashboard/admin/departments' },
  { from: 'audit-trail',         to: '/dashboard/admin/audit-trail' },
  { from: 'organization-chart',  to: '/dashboard/admin/organization-chart' },
  { from: 'settings',            to: '/dashboard/admin/settings' },
  { from: 'guide',               to: '/dashboard/admin/guide' },

  // Hub 2 — الموارد البشرية (chemins conservés ou ajustés)
  // Note : le hub RH garde /dashboard/hr comme base (pas de redirection nécessaire)
];

/**
 * Redirections des sous-chemins (avec paramètres et actions).
 * ⚠️ L'ordre est important : les chemins les plus spécifiques d'abord.
 */
export const SUBPATH_REDIRECTS: RouteRedirect[] = [
  // Documents entrants — sous-routes
  { from: 'incoming-documents/create',   to: '/dashboard/mail/incoming/create' },
  { from: 'incoming-documents/:id/edit', to: '/dashboard/mail/incoming/:id/edit' },
  { from: 'incoming-documents/:id',      to: '/dashboard/mail/incoming/:id' },

  // Documents sortants — sous-routes
  { from: 'outgoing-documents/create',   to: '/dashboard/mail/outgoing/create' },
  { from: 'outgoing-documents/:id/edit', to: '/dashboard/mail/outgoing/:id/edit' },
  { from: 'outgoing-documents/:id',      to: '/dashboard/mail/outgoing/:id' },

  // Admin — Utilisateurs
  { from: 'users/create',                to: '/dashboard/admin/users/create' },
  { from: 'users/edit/:id',              to: '/dashboard/admin/users/edit/:id' },

  // Admin — Départements
  { from: 'departments/create',          to: '/dashboard/admin/departments/create' },
  { from: 'departments/edit/:id',        to: '/dashboard/admin/departments/edit/:id' },

  // Admin — Settings
  { from: 'settings/message-retention',  to: '/dashboard/admin/settings/message-retention' },
  { from: 'settings/backup',             to: '/dashboard/admin/settings/backup' },
];

/**
 * Toutes les redirections combinées.
 */
export const ALL_REDIRECTS: RouteRedirect[] = [
  ...SUBPATH_REDIRECTS,
  ...PRIMARY_REDIRECTS,
];

/**
 * Mapping ancien path → nouveau path (pour utilisation dans le code).
 * Exemple : navigate(getNewPath('/dashboard/incoming-documents'))
 */
export const PATH_MAPPING: Record<string, string> = ALL_REDIRECTS.reduce(
  (acc, r) => {
    const oldPath = '/dashboard/' + r.from;
    acc[oldPath] = r.to;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Convertit un ancien path vers le nouveau.
 * Si le path n'est pas dans le mapping, retourne le path original.
 */
export function getNewPath(oldPath: string): string {
  if (!ENABLE_REDIRECTS) return oldPath;
  return PATH_MAPPING[oldPath] || oldPath;
}
