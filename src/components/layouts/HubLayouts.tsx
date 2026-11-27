import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useHubBadges } from '@/hooks/useHubBadges';
import { HubLayout, HubTab } from './HubLayout';
import {
  FolderOpen,
  FileInput,
  FileOutput,
  Search,
  UserCheck,
  Users2,
  CalendarCheck,
  CalendarRange,
  GraduationCap,
  Sliders,
  FileText,
  User,
  Building2,
  History,
  Network,
  Settings,
  BookOpen,
} from 'lucide-react';

/**
 * Hub 1 : البريد والمستندات (Courrier & Documents)
 */
export const MailHubLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const { pendingIncoming } = useHubBadges();

  const tabs: HubTab[] = [
    {
      to: '/dashboard/mail/incoming',
      label: t('sidebar.incomingDocuments'),
      icon: FileInput,
      color: 'text-orange-500',
      badge: pendingIncoming,
    },
    {
      to: '/dashboard/mail/outgoing',
      label: t('sidebar.outgoingDocuments'),
      icon: FileOutput,
      color: 'text-red-500',
    },
    {
      to: '/dashboard/mail/search',
      label: t('sidebar.advancedSearch'),
      icon: Search,
      color: 'text-cyan-500',
    },
  ];

  const breadcrumb = [
    { label: t('sidebar.mailAndDocuments') },
  ];

  return (
    <HubLayout
      title={t('sidebar.mailAndDocuments')}
      description={
        language === 'fr'
          ? 'Gestion du courrier entrant, sortant et recherche avancée'
          : 'إدارة المراسلات الواردة والصادرة والبحث المتقدم'
      }
      icon={FolderOpen}
      tabs={tabs}
      currentUserRole={currentUser?.role}
      breadcrumb={breadcrumb}
      compact
    />
  );
};

/**
 * Hub 2 : الموارد البشرية (Ressources Humaines - 4 onglets principaux)
 */
export const HRHubLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();

  const tabs: HubTab[] = [
    {
      to: '/dashboard/hr/personnel',
      label: t('sidebar.employees'),
      icon: Users2,
      color: 'text-green-500',
    },
    {
      to: '/dashboard/hr/attendance',
      label: t('sidebar.attendanceRecord'),
      icon: CalendarCheck,
      color: 'text-emerald-500',
    },
    {
      to: '/dashboard/hr/all-personnel-situation',
      label: t('sidebar.employeeStatus'),
      icon: CalendarRange,
      color: 'text-indigo-500',
    },
    {
      to: '/dashboard/hr/stages',
      label: t('sidebar.internships'),
      icon: GraduationCap,
      color: 'text-pink-500',
    },
  ];

  const breadcrumb = [
    { label: t('sidebar.humanResources') },
  ];

  return (
    <HubLayout
      title={t('sidebar.humanResources')}
      description={
        language === 'fr'
          ? 'Gestion du personnel, pointage quotidien, situation globale et stages'
          : 'إدارة الموظفين وتسجيل الحضور والوضعية والتربصات'
      }
      icon={UserCheck}
      tabs={tabs}
      currentUserRole={currentUser?.role}
      breadcrumb={breadcrumb}
      compact
    />
  );
};

/**
 * Hub 3 : الأدوات (Outils & Modèles - 2 onglets)
 */
export const ToolsHubLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const tabs: HubTab[] = [
    {
      to: '/dashboard/tools/templates',
      label: t('sidebar.templates'),
      icon: FileText,
      color: 'text-blue-500',
    },
    {
      to: '/dashboard/tools/document-options',
      label: t('sidebar.documentOptions'),
      icon: Sliders,
      color: 'text-purple-500',
      allowedRoles: ['Admin', 'AdminTuningDesk'],
    },
  ];

  const breadcrumb = [
    { label: t('sidebar.tools') },
  ];

  return (
    <HubLayout
      title={t('sidebar.tools')}
      description="النماذج وإعدادات الوثائق"
      icon={Sliders}
      tabs={tabs}
      currentUserRole={currentUser?.role}
      breadcrumb={breadcrumb}
    />
  );
};

/**
 * Hub 4 : الملف والحضور (Profil & Présence - 2 onglets)
 */
export const ProfileHubLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const tabs: HubTab[] = [
    {
      to: '/dashboard/profile/my-profile',
      label: t('sidebar.myProfile'),
      icon: User,
      color: 'text-amber-500',
    },
    {
      to: '/dashboard/profile/my-attendance',
      label: t('sidebar.myAttendance'),
      icon: CalendarCheck,
      color: 'text-emerald-500',
    },
  ];

  const breadcrumb = [
    { label: t('sidebar.profileAndAttendance') },
  ];

  return (
    <HubLayout
      title={t('sidebar.profileAndAttendance')}
      description="معلوماتك الشخصية وسجل الحضور"
      icon={User}
      tabs={tabs}
      currentUserRole={currentUser?.role}
      breadcrumb={breadcrumb}
    />
  );
};

/**
 * Hub 5 : الإدارة (Administration - 6 onglets)
 */
export const AdminHubLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const tabs: HubTab[] = [
    {
      to: '/dashboard/admin/users',
      label: t('sidebar.users'),
      icon: Users2,
      color: 'text-green-500',
      allowedRoles: ['Admin', 'Director'],
    },
    {
      to: '/dashboard/admin/departments',
      label: t('sidebar.departments'),
      icon: Building2,
      color: 'text-purple-500',
      allowedRoles: ['Admin', 'Director'],
    },
    {
      to: '/dashboard/admin/audit-trail',
      label: t('sidebar.auditTrail'),
      icon: History,
      color: 'text-amber-500',
      allowedRoles: ['Admin', 'Director'],
    },
    {
      to: '/dashboard/admin/organization-chart',
      label: t('sidebar.organizationChart'),
      icon: Network,
      color: 'text-emerald-500',
    },
    {
      to: '/dashboard/admin/settings',
      label: t('sidebar.settings'),
      icon: Settings,
      color: 'text-slate-700 dark:text-slate-300',
      allowedRoles: ['Admin'],
    },
    {
      to: '/dashboard/admin/guide',
      label: t('sidebar.setupGuide'),
      icon: BookOpen,
      color: 'text-teal-500',
      allowedRoles: ['Admin', 'Director'],
    },
  ];

  const breadcrumb = [
    { label: t('sidebar.administration') },
  ];

  return (
    <HubLayout
      title={t('sidebar.administration')}
      description="إدارة النظام والمستخدمين والإعدادات"
      icon={Building2}
      tabs={tabs}
      currentUserRole={currentUser?.role}
      breadcrumb={breadcrumb}
    />
  );
};
