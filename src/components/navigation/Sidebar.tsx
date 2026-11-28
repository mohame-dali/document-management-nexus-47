import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDirection } from '@/i18n/useDirection';
import {
  Building2,
  FileText,
  FolderOpen,
  FolderTree,
  MessageCircle,
  LayoutDashboard,
  User,
  UserCheck,
  Trash2,
  Sliders,
  Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOrganizationSettings } from '@/services/hr/personnelApi';
import FolderSidebar from '@/components/folders/FolderSidebar';
import { useHubBadges } from '@/hooks/useHubBadges';
import { useServerConnection } from '@/hooks/useServerConnection';
import { isExecutiveDashboardUser } from '@/utils/roleUtils';

const Sidebar = () => {
  const { currentUser } = useAuth();
  const { isOpen, isMobileOpen, setIsMobileOpen, closeMobile } = useSidebar();
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadMessages } = useHubBadges();
  const serverStatus = useServerConnection();
  const isFr = language === 'fr';

  React.useEffect(() => {
    closeMobile();
  }, [location.pathname, location.search, closeMobile]);

  // Récupérer les paramètres de l'organisation pour rhDepartmentId (LOT 8)
  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: 5 * 60 * 1000,
  });

  const rhDepartmentId = (typeof orgSettings?.rhDepartmentId === 'object' && orgSettings?.rhDepartmentId !== null)
    ? (orgSettings.rhDepartmentId as { _id?: string })._id
    : orgSettings?.rhDepartmentId;

  const userActiveDeptId = typeof currentUser?.activeDepartment === 'object'
    ? currentUser?.activeDepartment?._id
    : currentUser?.activeDepartment;

  // Accès RH restreint selon LOT 8 :
  // Visible pour Admin, Director, et AdminDepartment UNIQUEMENT si son département actif est rhDepartmentId
  const canAccessHR =
    currentUser?.role === 'Director' ||
    currentUser?.role === 'Admin' ||
    (currentUser?.role === 'AdminDepartment' &&
      Boolean(rhDepartmentId) &&
      Boolean(userActiveDeptId) &&
      String(userActiveDeptId) === String(rhDepartmentId));

  const canAccessDashboard = isExecutiveDashboardUser(currentUser);

  // Définition des 5-8 items directs de la sidebar (SANS accordéon, approche Hubs Gmail)
  const directMenuItems = [
    // 1. لوحة التحكم — réservé exclusivement à Admin et Directeur
    ...(canAccessDashboard ? [{
      id: 'dashboard',
      path: '/dashboard',
      label: t('sidebar.dashboard'),
      icon: LayoutDashboard,
      isActive: () => location.pathname === '/dashboard',
    }] : []),

    // 2. 📁 البريد والمستندات (hub 1)
    {
      id: 'mail',
      path: '/dashboard/mail',
      label: t('sidebar.mailAndDocuments'),
      icon: FolderOpen,
      isActive: () =>
        location.pathname.startsWith('/dashboard/mail') ||
        location.pathname.startsWith('/dashboard/incoming-documents') ||
        location.pathname.startsWith('/dashboard/outgoing-documents') ||
        location.pathname.startsWith('/dashboard/advanced-search'),
    },

    // 2b. 🗂️ الأرشيف والمجلدات (direct primary item)
    {
      id: 'folders',
      path: '/dashboard/folders',
      label: t('sidebar.archivesAndFolders'),
      icon: FolderTree,
      isActive: () => location.pathname.startsWith('/dashboard/folders'),
    },

    // 3. 🏛️ الموارد البشرية (hub 2) — affiché UNIQUEMENT si canAccessHR
    ...(canAccessHR ? [{
      id: 'hr',
      path: '/dashboard/hr',
      label: t('sidebar.humanResources'),
      icon: UserCheck,
      isActive: () =>
        location.pathname.startsWith('/dashboard/hr') &&
        !location.pathname.startsWith('/dashboard/hr/my-'),
    }] : []),

    // 4. ⚙️ الأدوات (hub 3) — non-User
    ...(currentUser?.role !== 'User' ? [{
      id: 'tools',
      path: '/dashboard/tools',
      label: t('sidebar.tools'),
      icon: Sliders,
      isActive: () =>
        location.pathname.startsWith('/dashboard/tools') ||
        location.pathname.startsWith('/dashboard/templates') ||
        location.pathname.startsWith('/dashboard/document-options'),
    }] : []),

    // 5. 👤 الملف والحضور (hub 4)
    {
      id: 'profile',
      path: '/dashboard/profile',
      label: t('sidebar.profileAndAttendance'),
      icon: User,
      isActive: () =>
        location.pathname.startsWith('/dashboard/profile') ||
        location.pathname.startsWith('/dashboard/hr/my-'),
    },

    // 6. 🏢 الإدارة (hub 5) — Admin et Director
    ...(['Admin', 'Director'].includes(currentUser?.role || '') ? [{
      id: 'admin',
      path: '/dashboard/admin',
      label: t('sidebar.administration'),
      icon: Building2,
      isActive: () =>
        location.pathname.startsWith('/dashboard/admin') ||
        location.pathname.startsWith('/dashboard/users') ||
        location.pathname.startsWith('/dashboard/departments') ||
        location.pathname.startsWith('/dashboard/audit-trail') ||
        location.pathname.startsWith('/dashboard/organization-chart') ||
        location.pathname.startsWith('/dashboard/settings') ||
        location.pathname.startsWith('/dashboard/guide'),
    }] : []),

    // 6b. 🌐 الهيكل التنظيمي (organigramme) — Pour tous les rôles non-Admin/Director (AdminTuningDesk, AdminDepartment, User)
    ...(!['Admin', 'Director'].includes(currentUser?.role || '') ? [{
      id: 'organization-chart',
      path: '/dashboard/admin/organization-chart',
      label: t('sidebar.organizationChart'),
      icon: Network,
      isActive: () => location.pathname.startsWith('/dashboard/admin/organization-chart'),
    }] : []),

    // 7. 💬 الرسائل (direct)
    {
      id: 'messages',
      path: '/dashboard/messages',
      label: t('sidebar.messages'),
      icon: MessageCircle,
      isActive: () => location.pathname.startsWith('/dashboard/messages'),
      badge: unreadMessages,
    },

    // 8. 🗑️ سلة المحذوفات (direct) — rôles autorisés
    ...(['Admin', 'AdminTuningDesk', 'AdminDepartment'].includes(currentUser?.role || '') ? [{
      id: 'trash',
      path: '/dashboard/trash',
      label: t('sidebar.trash'),
      icon: Trash2,
      isActive: () => location.pathname.startsWith('/dashboard/trash'),
    }] : []),
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    closeMobile();
  };

  const renderSidebarBody = (expanded: boolean) => (
    <div
      data-surface="dark"
      className={cn(
        "h-full flex flex-col bg-[#1a202c] text-slate-100 border-e border-slate-800/90 shadow-sm transition-all duration-200 ease-in-out select-none",
        expanded ? "w-full md:w-64" : "w-16"
      )}
    >
      {/* Header - Fixed compact brand only */}
      <div className={cn(
        "flex-shrink-0 border-b border-slate-800 bg-[#161b24] transition-all duration-200",
        expanded ? "px-4 py-4" : "p-3"
      )}>
        <div className={cn("flex flex-row items-center gap-3", !expanded && "justify-center")}>
          <div className="p-2 bg-[#2c5282]/25 text-[#90cdf4] border border-[#2c5282]/40 rounded-lg shadow-sm shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          {expanded && (
            <div className="min-w-0 pe-8 md:pe-0">
              <h1 className="text-base font-bold text-white truncate">
                {t('sidebar.dmsSystem')}
              </h1>
              <p className="text-xs text-slate-300 truncate mt-0.5">{t('sidebar.documentManagement')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content Area */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col h-full">
          {/* Navigation with refined pill highlights & spacing — 5-8 items directs, PAS d'accordéon */}
          <nav className="flex-1 px-3 py-4 space-y-1.5">
            {directMenuItems.map((item) => {
              const active = item.isActive();
              const hasBadge = Boolean(item.badge && item.badge > 0);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "w-full h-11 text-sm font-medium rounded-lg transition-all duration-200 flex flex-row items-center group text-start relative focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#FFCB56] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a202c]",
                    expanded ? "justify-start gap-3 px-3.5" : "justify-center px-2",
                    active 
                      ? "bg-[#2c5282]/95 text-white shadow-sm ring-1 ring-white/15 font-semibold" 
                      : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  )}
                  onClick={() => handleNavClick(item.path)}
                  title={item.label}
                >
                  {active && expanded && (
                    <span
                      aria-hidden="true"
                      className="absolute start-1 top-2 bottom-2 w-1 rounded-full bg-[#FFCB56]"
                    />
                  )}
                  <item.icon className={cn(
                    "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                    active ? "text-[#FFCB56]" : "text-slate-300 group-hover:text-white"
                  )} />
                  {expanded ? (
                    <>
                      <span className="truncate flex-1">
                        {item.label}
                      </span>
                      {hasBadge && (
                        <Badge className="bg-[#FFD758] text-[#1a202c] border border-[#FFCB56] text-xs px-1.5 py-0 h-5 font-bold rounded-full tabular-nums animate-pulse-subtle">
                          <bdi dir="ltr">{(item.badge ?? 0) > 99 ? '99+' : item.badge}</bdi>
                        </Badge>
                      )}
                    </>
                  ) : (
                    hasBadge && (
                      <span className="absolute top-1 end-1 w-2.5 h-2.5 bg-[#FFD758] rounded-full border border-[#1a202c]" />
                    )
                  )}
                </button>
              );
            })}
          </nav>

          {/* Folder Categorization Sidebar for Users */}
          {expanded && currentUser?.role === 'User' && (
            <div className="flex-shrink-0 p-3 border-t border-slate-800 bg-[#161b24]/60">
              <FolderSidebar onNavigate={closeMobile} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Subtle Live Server Connection Footer */}
      <div
        className={cn(
          "flex-shrink-0 border-t border-slate-800/80 bg-[#161b24] px-3 py-2.5 flex items-center print:hidden",
          expanded ? "justify-between gap-2" : "justify-center"
        )}
        title={
          serverStatus === 'connected'
            ? isFr
              ? 'Système connecté'
              : 'متصل بالنظام'
            : isFr
              ? 'Reconnexion en cours...'
              : 'جاري إعادة الاتصال...'
        }
        aria-label={
          serverStatus === 'connected'
            ? isFr
              ? 'Système connecté'
              : 'متصل بالنظام'
            : isFr
              ? 'Reconnexion en cours'
              : 'جاري إعادة الاتصال'
        }
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              serverStatus === 'connected'
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.65)]"
                : "bg-amber-400 animate-pulse"
            )}
          />
          {expanded && (
            <span className="text-[13px] font-medium text-slate-200 truncate">
              {serverStatus === 'connected'
                ? isFr
                  ? 'Système connecté'
                  : 'متصل بالنظام'
                : isFr
                  ? 'Reconnexion...'
                  : 'جاري إعادة الاتصال...'}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (>= 768px) */}
      <aside className="hidden md:flex h-screen shrink-0 print:hidden">
        {renderSidebarBody(isOpen)}
      </aside>

      {/* Mobile Drawer (< 768px) */}
      {isMobile && (
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetContent
            side={dir === 'rtl' ? 'right' : 'left'}
            dir={dir}
            className="w-72 sm:max-w-72 p-0 bg-[#1a202c] text-slate-100 border-slate-800 flex flex-col gap-0 print:hidden"
            closeButtonClassName="text-slate-200 hover:text-white hover:bg-[#2d3748] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#FFCB56] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a202c]"
          >
            <SheetTitle className="sr-only">{t('sidebar.dmsSystem')}</SheetTitle>
            <SheetDescription className="sr-only">{t('sidebar.documentManagement')}</SheetDescription>
            {renderSidebarBody(true)}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};

export default Sidebar;
