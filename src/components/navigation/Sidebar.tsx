import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  Users2, 
  FileText, 
  FolderOpen, 
  MessageCircle,
  LayoutDashboard,
  FileInput,
  FileOutput,
  User,
  Search,
  Settings,
  UserCheck,
  UserPlus,
  CalendarDays,
  CalendarCheck,
  CalendarRange,
  GraduationCap,
  ClipboardList,
  ChevronDown,
  ChevronLeft,
  Trash2,
  Sliders,
  History,
  Network,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOrganizationSettings } from '@/services/hr/personnelApi';
import FolderSidebar from '@/components/folders/FolderSidebar';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import ProfileSettingsDialog from '@/components/users/ProfileSettingsDialog';
import { useHubBadges } from '@/hooks/useHubBadges';

const Sidebar = () => {
  const { currentUser } = useAuth();
  const { isOpen } = useSidebar();
  const { t } = useLanguage();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false);
  const { unreadMessages } = useHubBadges();

  // Récupérer les paramètres de l'organisation pour rhDepartmentId (LOT 8)
  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: 5 * 60 * 1000,
  });

  const rhDepartmentId = typeof orgSettings?.rhDepartmentId === 'object'
    ? (orgSettings?.rhDepartmentId as any)?._id
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

  // Définition des 5-8 items directs de la sidebar (SANS accordéon, approche Hubs Gmail)
  const directMenuItems = [
    // 1. لوحة التحكم (direct)
    {
      id: 'dashboard',
      path: currentUser?.role === 'AdminDepartment' ? '/dashboard/admin-department' : '/dashboard',
      label: currentUser?.role === 'AdminDepartment' ? t('sidebar.departmentDashboard') : t('sidebar.dashboard'),
      icon: currentUser?.role === 'AdminDepartment' ? Building2 : LayoutDashboard,
      isActive: () => location.pathname === '/dashboard' || location.pathname === '/dashboard/admin-department',
    },

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
        location.pathname.startsWith('/dashboard/folders') ||
        location.pathname.startsWith('/dashboard/advanced-search'),
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Director':
        return 'border-[#d69e2e]/40 bg-[#d69e2e]/15 text-[#fbd38d]';
      case 'Admin':
        return 'border-[#e53e3e]/40 bg-[#e53e3e]/15 text-[#feb2b2]';
      case 'AdminTuningDesk':
        return 'border-[#2c5282]/40 bg-[#2c5282]/30 text-[#bee3f8]';
      case 'AdminDepartment':
        return 'border-purple-400/30 bg-purple-500/15 text-purple-200';
      case 'User':
        return 'border-[#38a169]/40 bg-[#38a169]/15 text-[#9ae6b4]';
      default:
        return 'border-slate-600 bg-slate-700/50 text-slate-300';
    }
  };

  const getRoleLabel = (role: string) => {
    return t(`roles.${role}`);
  };

  const getUserInitials = (username: string) => {
    return username ? username.charAt(0).toUpperCase() : 'U';
  };

  const getUserPhotoUrl = (user: any) => {
    if (user?.photo) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      // Remove leading slash if it exists to avoid double slashes
      const photoPath = user.photo.startsWith('/') ? user.photo.slice(1) : user.photo;
      return `${API_URL}/${photoPath}`;
    }
    return null;
  };

  return (
    <div className={cn(
      "h-screen flex flex-col bg-[#1a202c] text-slate-100 border-e border-slate-800 shadow-sm transition-all duration-200 ease-in-out select-none",
      isOpen ? "w-64" : "w-16"
    )}>
      {/* Header - Fixed */}
      <div className={cn(
        "flex-shrink-0 border-b border-slate-800/80 bg-[#161b24] transition-all duration-200",
        isOpen ? "p-4 sm:p-5" : "p-3"
      )}>
        <div>
          <div className={cn("flex items-center gap-3 mb-3", isRTL ? "flex-row-reverse" : "flex-row")}>
            <div className="p-2 bg-[#2c5282]/25 text-[#90cdf4] border border-[#2c5282]/40 rounded shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            {isOpen && (
              <div className="min-w-0">
                <h1 className="text-base font-bold text-white tracking-tight truncate">
                  {t('sidebar.dmsSystem')}
                </h1>
                <p className="text-sm text-slate-400 truncate">{t('sidebar.documentManagement')}</p>
              </div>
            )}
          </div>
          
          {currentUser && (
            <div className={cn("flex items-center gap-3 p-2.5 bg-[#242d3d] rounded border border-slate-700/60 shadow-sm", isRTL ? "flex-row-reverse" : "flex-row")}>
              <ContextMenu>
                <ContextMenuTrigger>
                  <Avatar 
                    className="h-10 w-10 ring-1 ring-slate-600 cursor-pointer hover:ring-[#2c5282] transition-colors duration-200"
                    title={!isOpen ? currentUser.username : undefined}
                  >
                    <AvatarImage 
                      src={getUserPhotoUrl(currentUser)} 
                      alt={currentUser.username}
                      className="object-cover"
                      onError={(e) => {
                        console.log('Image failed to load:', getUserPhotoUrl(currentUser));
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', getUserPhotoUrl(currentUser));
                      }}
                    />
                    <AvatarFallback className="bg-[#2c5282] text-white font-medium text-xs">
                      {getUserInitials(currentUser.username)}
                    </AvatarFallback>
                  </Avatar>
                </ContextMenuTrigger>
                <ContextMenuContent className="text-start">
                  <ContextMenuItem onClick={() => setProfileDialogOpen(true)}>
                    <User className="h-4 w-4 ms-2" />
                    {t('sidebar.profileSettings')}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
              {isOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {currentUser.username}
                  </p>
                  <div className="mt-1">
                    <Badge 
                      variant="outline" 
                      className={cn("text-[11px] px-2 py-0.2 rounded font-medium", getRoleBadgeColor(currentUser.role))}
                    >
                      {getRoleLabel(currentUser.role)}
                    </Badge>
                  </div>
                  {currentUser.activeDepartment && (
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      {currentUser.activeDepartment.name}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content Area */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col h-full">
          {/* Navigation with clean calm styling — 5-8 items directs, PAS d'accordéon */}
          <nav className="flex-1 p-3 space-y-1">
            {directMenuItems.map((item) => {
              const active = item.isActive();
              const hasBadge = Boolean(item.badge && item.badge > 0);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "w-full h-11 text-sm font-medium rounded transition-colors duration-200 flex items-center group text-start relative",
                    isRTL ? "flex-row-reverse" : "flex-row",
                    isOpen ? "justify-start gap-3 px-3" : "justify-center px-2",
                    active 
                      ? "bg-[#2c5282] text-white shadow-sm font-medium" 
                      : "text-slate-300 hover:text-white hover:bg-[#2d3748]"
                  )}
                  onClick={() => navigate(item.path)}
                  title={item.label}
                >
                  <item.icon className={cn(
                    "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                    active ? "text-white" : "text-gray-400 group-hover:text-gray-200"
                  )} />
                  {isOpen ? (
                    <>
                      <span className="truncate flex-1">
                        {item.label}
                      </span>
                      {hasBadge && (
                        <Badge className="bg-[#FFD758] text-[#1a202c] border border-[#FFCB56] text-xs px-1.5 py-0 h-5 font-bold animate-pulse-subtle">
                          {(item.badge ?? 0) > 99 ? '99+' : item.badge}
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
          {isOpen && currentUser?.role === 'User' && (
            <div className="flex-shrink-0 p-3 border-t border-slate-800 bg-[#161b24]/60">
              <FolderSidebar />
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Profile Settings Dialog */}
      <ProfileSettingsDialog 
        open={profileDialogOpen} 
        onOpenChange={setProfileDialogOpen} 
      />
    </div>
  );
};

export default Sidebar;
