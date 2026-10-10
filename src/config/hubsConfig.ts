/**
 * Configuration des Hubs et Onglets pour l'architecture Gmail (5 hubs + 3 directs).
 *
 * ÉTAT : DÉSACTIVÉ (utilisé uniquement en préparation de la Phase 2/3/4).
 * Ne modifie aucun composant existant.
 *
 * STRUCTURE CIBLE :
 *   Sidebar (7 items) :
 *     1. 📊 لوحة التحكم (direct)       → /dashboard
 *     2. 📁 البريد والمستندات (hub 1)   → /dashboard/mail
 *     3. 🏛️ الموارد البشرية (hub 2)     → /dashboard/hr
 *     4. ⚙️ الأدوات (hub 3)             → /dashboard/tools
 *     5. 👤 الملف والحضور (hub 4)       → /dashboard/profile
 *     6. 💬 الرسائل (direct)           → /dashboard/messages
 *     7. 🗑️ سلة المحذوفات (direct)     → /dashboard/trash
 *
 *   + Hub 5 pour Admin / Direction :
 *     🏢 الإدارة (hub 5)              → /dashboard/admin
 */

export interface HubTabConfig {
  id: string;
  labelAr: string;
  labelFr: string;
  path: string;
  icon?: string;
  roles?: string[];
  exact?: boolean;
}

export interface HubDefinition {
  id: string;
  labelAr: string;
  labelFr: string;
  basePath: string;
  defaultPath: string;
  icon: string;
  roles?: string[];
  tabs: HubTabConfig[];
}

export interface DirectNavigationItem {
  id: string;
  labelAr: string;
  labelFr: string;
  path: string;
  icon: string;
  roles?: string[];
}

/**
 * Hub 1 : البريد والمستندات (Courrier & Documents)
 */
export const MAIL_HUB: HubDefinition = {
  id: 'mail',
  labelAr: 'البريد والمستندات',
  labelFr: 'Courrier & Documents',
  basePath: '/dashboard/mail',
  defaultPath: '/dashboard/mail/incoming',
  icon: 'FolderOpen',
  tabs: [
    {
      id: 'incoming',
      labelAr: 'الواردة',
      labelFr: 'Courrier entrant',
      path: '/dashboard/mail/incoming',
      icon: 'FileInput',
    },
    {
      id: 'outgoing',
      labelAr: 'الصادرة',
      labelFr: 'Courrier sortant',
      path: '/dashboard/mail/outgoing',
      icon: 'FileOutput',
    },
    {
      id: 'folders',
      labelAr: 'المجلدات',
      labelFr: 'Dossiers',
      path: '/dashboard/mail/folders',
      icon: 'FolderOpen',
    },
    {
      id: 'search',
      labelAr: 'البحث المتقدم',
      labelFr: 'Recherche avancée',
      path: '/dashboard/mail/search',
      icon: 'Search',
    },
  ],
};

/**
 * Hub 2 : الموارد البشرية (Ressources Humaines)
 */
export const HR_HUB: HubDefinition = {
  id: 'hr',
  labelAr: 'الموارد البشرية',
  labelFr: 'Ressources Humaines',
  basePath: '/dashboard/hr',
  defaultPath: '/dashboard/hr/personnel',
  icon: 'Users',
  roles: ['Director', 'Admin', 'AdminDepartment'],
  tabs: [
    {
      id: 'personnel',
      labelAr: 'الموظفون',
      labelFr: 'Personnel',
      path: '/dashboard/hr/personnel',
      icon: 'Users',
    },
    {
      id: 'create-personnel',
      labelAr: 'إضافة موظف',
      labelFr: 'Ajouter employé',
      path: '/dashboard/hr/personnel/create',
      icon: 'UserPlus',
      roles: ['Director', 'Admin', 'AdminDepartment'],
    },
    {
      id: 'attendance',
      labelAr: 'الحضور والغياب',
      labelFr: 'Présences',
      path: '/dashboard/hr/attendance',
      icon: 'Calendar',
    },
    {
      id: 'situation',
      labelAr: 'الوضعية العامة',
      labelFr: 'Situation globale',
      path: '/dashboard/hr/situation',
      icon: 'BarChart3',
    },
    {
      id: 'declarations',
      labelAr: 'طلبات الحضور',
      labelFr: 'Déclarations',
      path: '/dashboard/hr/declarations',
      icon: 'ClipboardCheck',
    },
    {
      id: 'leave-reasons',
      labelAr: 'أسباب الغياب',
      labelFr: 'Motifs absence',
      path: '/dashboard/hr/leave-reasons',
      icon: 'HelpCircle',
    },
    {
      id: 'stages',
      labelAr: 'مراحل الموارد البشرية',
      labelFr: 'Stages RH',
      path: '/dashboard/hr/stages',
      icon: 'Layers',
    },
  ],
};

/**
 * Hub 3 : الأدوات (Outils & Modèles)
 */
export const TOOLS_HUB: HubDefinition = {
  id: 'tools',
  labelAr: 'الأدوات',
  labelFr: 'Outils',
  basePath: '/dashboard/tools',
  defaultPath: '/dashboard/tools/templates',
  icon: 'Sliders',
  tabs: [
    {
      id: 'templates',
      labelAr: 'النماذج',
      labelFr: 'Modèles',
      path: '/dashboard/tools/templates',
      icon: 'FileText',
    },
    {
      id: 'document-options',
      labelAr: 'خيارات المستندات',
      labelFr: 'Options de documents',
      path: '/dashboard/tools/document-options',
      icon: 'Sliders',
      roles: ['Admin', 'AdminTuningDesk'],
    },
  ],
};

/**
 * Hub 4 : الملف والحضور (Mon profil & Présence)
 */
export const PROFILE_HUB: HubDefinition = {
  id: 'profile',
  labelAr: 'الملف والحضور',
  labelFr: 'Profil & Présence',
  basePath: '/dashboard/profile',
  defaultPath: '/dashboard/profile/my-profile',
  icon: 'User',
  tabs: [
    {
      id: 'my-profile',
      labelAr: 'ملفي الشخصي',
      labelFr: 'Mon profil',
      path: '/dashboard/profile/my-profile',
      icon: 'User',
    },
    {
      id: 'my-attendance',
      labelAr: 'جدول حضوري',
      labelFr: 'Mon calendrier',
      path: '/dashboard/profile/my-attendance',
      icon: 'CalendarCheck',
    },
  ],
};

/**
 * Hub 5 : الإدارة (Administration système & Direction)
 */
export const ADMIN_HUB: HubDefinition = {
  id: 'admin',
  labelAr: 'الإدارة',
  labelFr: 'Administration',
  basePath: '/dashboard/admin',
  defaultPath: '/dashboard/admin/users',
  icon: 'Building2',
  roles: ['Admin', 'Director'],
  tabs: [
    {
      id: 'users',
      labelAr: 'المستخدمون',
      labelFr: 'Utilisateurs',
      path: '/dashboard/admin/users',
      icon: 'Users2',
      roles: ['Admin', 'Director'],
    },
    {
      id: 'departments',
      labelAr: 'الأقسام',
      labelFr: 'Départements',
      path: '/dashboard/admin/departments',
      icon: 'Building2',
      roles: ['Admin', 'Director'],
    },
    {
      id: 'audit-trail',
      labelAr: 'سجل العمليات',
      labelFr: "Piste d'audit",
      path: '/dashboard/admin/audit-trail',
      icon: 'History',
      roles: ['Admin', 'Director'],
    },
    {
      id: 'organization-chart',
      labelAr: 'الهيكل التنظيمي',
      labelFr: 'Organigramme',
      path: '/dashboard/admin/organization-chart',
      icon: 'Network',
      roles: ['Admin', 'Director'],
    },
    {
      id: 'settings',
      labelAr: 'الإعدادات',
      labelFr: 'Paramètres',
      path: '/dashboard/admin/settings',
      icon: 'Settings',
      roles: ['Admin'],
    },
    {
      id: 'guide',
      labelAr: 'دليل التثبيت',
      labelFr: 'Guide installation',
      path: '/dashboard/admin/guide',
      icon: 'BookOpen',
      roles: ['Admin', 'Director'],
    },
  ],
};

/**
 * Liste de tous les hubs
 */
export const ALL_HUBS: HubDefinition[] = [
  MAIL_HUB,
  HR_HUB,
  TOOLS_HUB,
  PROFILE_HUB,
  ADMIN_HUB,
];

/**
 * Items de navigation directe (sans onglets internes)
 */
export const DIRECT_ITEMS: DirectNavigationItem[] = [
  {
    id: 'dashboard',
    labelAr: 'لوحة التحكم',
    labelFr: 'Tableau de bord',
    path: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    id: 'messages',
    labelAr: 'الرسائل',
    labelFr: 'Messagerie',
    path: '/dashboard/messages',
    icon: 'MessageCircle',
  },
  {
    id: 'trash',
    labelAr: 'سلة المحذوفات',
    labelFr: 'Corbeille',
    path: '/dashboard/trash',
    icon: 'Trash2',
    roles: ['Admin', 'AdminTuningDesk', 'AdminDepartment'],
  },
];

/**
 * Utilitaires de recherche de Hub
 */
export function getHubById(hubId: string): HubDefinition | undefined {
  return ALL_HUBS.find((h) => h.id === hubId);
}

export function getHubByPath(pathname: string): HubDefinition | undefined {
  return ALL_HUBS.find((h) => pathname.startsWith(h.basePath));
}

export function getActiveTabForPath(hub: HubDefinition, pathname: string): HubTabConfig | undefined {
  // Recherche par correspondance exacte ou préfixe le plus spécifique
  const sortedTabs = [...hub.tabs].sort((a, b) => b.path.length - a.path.length);
  return sortedTabs.find((t) => pathname.startsWith(t.path));
}
