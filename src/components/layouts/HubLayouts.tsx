import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { HubLayout, HubTab } from './HubLayout';
import {
  FolderOpen,
  FileInput,
  FileOutput,
  Search,
  UserCheck,
  Users2,
  UserPlus,
  CalendarCheck,
  CalendarRange,
  ClipboardList,
  CalendarDays,
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
  const { t } = useLanguage();

  const tabs: HubTab[] = [
    {
      to: '/dashboard/mail/incoming',
      label: t('sidebar.incomingDocuments'),
      icon: FileInput,
    },
    {
      to: '/dashboard/mail/outgoing',
      label: t('sidebar.outgoingDocuments'),
      icon: FileOutput,
    },
    {
      to: '/dashboard/mail/folders',
      label: t('sidebar.folders'),
      icon: FolderOpen,
    },
    {
      to: '/dashboard/mail/search',
      label: t('sidebar.advancedSearch'),
      icon: Search,
    },
  ];

  return (
    <HubLayout
      title={t('sidebar.mailAndDocuments')}
      icon={FolderOpen}
      tabs={tabs}
      currentUserRole={currentUser?.role}
    />
  );
};

/**
 * Hub 2 : الموارد البشرية (Ressources Humaines - 7 onglets)
 */
export const HRHubLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const tabs: HubTab[] = [
    {
      to: '/dashboard/hr/personnel',
      label: t('sidebar.employees'),
      icon: Users2,
    },
    {
      to: '/dashboard/hr/personnel/new',
      label: t('sidebar.addEmployee'),
      icon: UserPlus,
      allowedRoles: ['Admin', 'AdminDepartment'],
    },
    {
      to: '/dashboard/hr/attendance',
      label: t('sidebar.attendanceRecord'),
      icon: CalendarCheck,
    },
    {
      to: '/dashboard/hr/all-personnel-situation',
      label: t('sidebar.employeeStatus'),
      icon: CalendarRange,
    },
    {
      to: '/dashboard/hr/attendance-declarations',
      label: t('sidebar.pendingAnnouncements'),
      icon: ClipboardList,
    },
    {
      to: '/dashboard/hr/leave-reasons',
      label: t('sidebar.absenceTypes'),
      icon: CalendarDays,
    },
    {
      to: '/dashboard/hr/stages',
      label: t('sidebar.internships'),
      icon: GraduationCap,
    },
  ];

  return (
    <HubLayout
      title={t('sidebar.humanResources')}
      icon={UserCheck}
      tabs={tabs}
      currentUserRole={currentUser?.role}
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
    },
    {
      to: '/dashboard/tools/document-options',
      label: t('sidebar.documentOptions'),
      icon: Sliders,
      allowedRoles: ['Admin', 'AdminTuningDesk'],
    },
  ];

  return (
    <HubLayout
      title={t('sidebar.tools')}
      icon={Sliders}
      tabs={tabs}
      currentUserRole={currentUser?.role}
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
    },
    {
      to: '/dashboard/profile/my-attendance',
      label: t('sidebar.myAttendance'),
      icon: CalendarCheck,
    },
  ];

  return (
    <HubLayout
      title={t('sidebar.profileAndAttendance')}
      icon={User}
      tabs={tabs}
      currentUserRole={currentUser?.role}
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
      allowedRoles: ['Admin', 'Director'],
    },
    {
      to: '/dashboard/admin/departments',
      label: t('sidebar.departments'),
      icon: Building2,
      allowedRoles: ['Admin', 'Director'],
    },
    {
      to: '/dashboard/admin/audit-trail',
      label: t('sidebar.auditTrail'),
      icon: History,
      allowedRoles: ['Admin', 'Director'],
    },
    {
      to: '/dashboard/admin/organization-chart',
      label: t('sidebar.organizationChart'),
      icon: Network,
      allowedRoles: ['Admin', 'Director'],
    },
    {
      to: '/dashboard/admin/settings',
      label: t('sidebar.settings'),
      icon: Settings,
      allowedRoles: ['Admin'],
    },
    {
      to: '/dashboard/admin/guide',
      label: t('sidebar.setupGuide'),
      icon: BookOpen,
      allowedRoles: ['Admin', 'Director'],
    },
  ];

  return (
    <HubLayout
      title={t('sidebar.administration')}
      icon={Building2}
      tabs={tabs}
      currentUserRole={currentUser?.role}
    />
  );
};
