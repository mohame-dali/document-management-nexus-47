import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageProvider';
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
  ChevronDown,
  ChevronLeft,
  Trash2
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

const Sidebar = () => {
  const { currentUser } = useAuth();
  const { isOpen } = useSidebar();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false);

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
  // Visible pour Admin, SuperAdmin, et AdminDepartment UNIQUEMENT si son département actif est rhDepartmentId
  const canAccessHR =
    currentUser?.role === 'SuperAdmin' ||
    currentUser?.role === 'Admin' ||
    (currentUser?.role === 'AdminDepartment' &&
      Boolean(rhDepartmentId) &&
      Boolean(userActiveDeptId) &&
      String(userActiveDeptId) === String(rhDepartmentId));

  const isHrPersonnelActive = location.pathname.startsWith('/dashboard/hr/personnel');
  const [hrExpanded, setHrExpanded] = React.useState(true);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const menuItems = [
    // SuperAdmin menu items (same as Admin with full access, sans mon-profil)
    ...(currentUser?.role === 'SuperAdmin' ? [
      { path: '/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard, color: 'text-blue-600' },
      { path: '/dashboard/departments', label: t('sidebar.departments'), icon: Building2, color: 'text-purple-600' },
      { path: '/dashboard/users', label: t('sidebar.users'), icon: Users2, color: 'text-green-600' },
      { path: '/dashboard/incoming-documents', label: t('sidebar.incomingDocuments'), icon: FileInput, color: 'text-orange-600' },
      { path: '/dashboard/outgoing-documents', label: t('sidebar.outgoingDocuments'), icon: FileOutput, color: 'text-red-600' },
      { path: '/dashboard/folders', label: t('sidebar.folders'), icon: FolderOpen, color: 'text-yellow-600' },
      { path: '/dashboard/advanced-search', label: t('sidebar.advancedSearch'), icon: Search, color: 'text-cyan-600' },
      { path: '/dashboard/messages', label: t('sidebar.messages'), icon: MessageCircle, color: 'text-indigo-600' },
      { path: '/dashboard/trash', label: 'سلة المحذوفات', icon: Trash2, color: 'text-red-500' },
    ] : []),

    // Admin menu items (avec mon-profil)
    ...(currentUser?.role === 'Admin' ? [
      { path: '/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard, color: 'text-blue-600' },
      { path: '/dashboard/departments', label: t('sidebar.departments'), icon: Building2, color: 'text-purple-600' },
      { path: '/dashboard/users', label: t('sidebar.users'), icon: Users2, color: 'text-green-600' },
      { path: '/dashboard/incoming-documents', label: t('sidebar.incomingDocuments'), icon: FileInput, color: 'text-orange-600' },
      { path: '/dashboard/outgoing-documents', label: t('sidebar.outgoingDocuments'), icon: FileOutput, color: 'text-red-600' },
      { path: '/dashboard/folders', label: t('sidebar.folders'), icon: FolderOpen, color: 'text-yellow-600' },
      { path: '/dashboard/advanced-search', label: t('sidebar.advancedSearch'), icon: Search, color: 'text-cyan-600' },
      { path: '/dashboard/messages', label: t('sidebar.messages'), icon: MessageCircle, color: 'text-indigo-600' },
      { path: '/dashboard/hr/my-profile', label: 'ملفي الشخصي', icon: User, color: 'text-amber-500' },
      { path: '/dashboard/trash', label: 'سلة المحذوفات', icon: Trash2, color: 'text-red-500' },
      { path: '/dashboard/settings', label: 'الإعدادات', icon: Settings, color: 'text-gray-600' },
    ] : []),

    // AdminTuningDesk menu items (avec mon-profil)
    ...(currentUser?.role === 'AdminTuningDesk' ? [
      { path: '/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard, color: 'text-blue-600' },
      { path: '/dashboard/incoming-documents', label: t('sidebar.incomingDocuments'), icon: FileInput, color: 'text-orange-600' },
      { path: '/dashboard/outgoing-documents', label: t('sidebar.outgoingDocuments'), icon: FileOutput, color: 'text-red-600' },
      { path: '/dashboard/folders', label: t('sidebar.folders'), icon: FolderOpen, color: 'text-yellow-600' },
      { path: '/dashboard/document-options', label: t('sidebar.documentOptions'), icon: Settings, color: 'text-purple-600' },
      { path: '/dashboard/templates', label: 'النماذج', icon: FileText, color: 'text-blue-600' },
      { path: '/dashboard/advanced-search', label: t('sidebar.advancedSearch'), icon: Search, color: 'text-cyan-600' },
      { path: '/dashboard/messages', label: t('sidebar.messages'), icon: MessageCircle, color: 'text-indigo-600' },
      { path: '/dashboard/hr/my-profile', label: 'ملفي الشخصي', icon: User, color: 'text-amber-500' },
    ] : []),

    // AdminDepartment menu items (avec mon-profil)
    ...(currentUser?.role === 'AdminDepartment' ? [
      { path: '/dashboard/admin-department', label: t('sidebar.departmentDashboard'), icon: Building2, color: 'text-purple-600' },
      { path: '/dashboard/users', label: t('sidebar.users'), icon: Users2, color: 'text-green-600' },
      { path: '/dashboard/incoming-documents', label: t('sidebar.incomingDocuments'), icon: FileInput, color: 'text-orange-600' },
      { path: '/dashboard/outgoing-documents', label: t('sidebar.outgoingDocuments'), icon: FileOutput, color: 'text-red-600' },
      { path: '/dashboard/folders', label: t('sidebar.folders'), icon: FolderOpen, color: 'text-yellow-600' },
      { path: '/dashboard/templates', label: 'النماذج', icon: FileText, color: 'text-blue-600' },
      { path: '/dashboard/advanced-search', label: t('sidebar.advancedSearch'), icon: Search, color: 'text-cyan-600' },
      { path: '/dashboard/messages', label: t('sidebar.messages'), icon: MessageCircle, color: 'text-indigo-600' },
      { path: '/dashboard/hr/my-profile', label: 'ملفي الشخصي', icon: User, color: 'text-amber-500' },
    ] : []),

    // User menu items (avec mon-profil)
    ...(currentUser?.role === 'User' ? [
      { path: '/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard, color: 'text-blue-600' },
      { path: '/dashboard/incoming-documents', label: t('sidebar.incomingDocuments'), icon: FileInput, color: 'text-orange-600' },
      { path: '/dashboard/outgoing-documents', label: t('sidebar.outgoingDocuments'), icon: FileOutput, color: 'text-red-600' },
      { path: '/dashboard/templates', label: 'النماذج', icon: FileText, color: 'text-blue-600' },
      { path: '/dashboard/advanced-search', label: t('sidebar.advancedSearch'), icon: Search, color: 'text-cyan-600' },
      { path: '/dashboard/messages', label: t('sidebar.messages'), icon: MessageCircle, color: 'text-indigo-600' },
      { path: '/dashboard/hr/my-profile', label: 'ملفي الشخصي', icon: User, color: 'text-amber-500' },
    ] : []),
  ];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
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
      "h-screen flex flex-col bg-[#1a202c] text-slate-100 border-l border-slate-800 shadow-sm transition-all duration-200 ease-in-out select-none",
      isOpen ? "w-64" : "w-16"
    )} dir="rtl">
      {/* Header - Fixed */}
      <div className={cn(
        "flex-shrink-0 border-b border-slate-800/80 bg-[#161b24] transition-all duration-200",
        isOpen ? "p-4 sm:p-5" : "p-3"
      )}>
        <div>
          <div className="flex items-center gap-3 mb-3">
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
            <div className="flex items-center gap-3 p-2.5 bg-[#242d3d] rounded border border-slate-700/60 shadow-sm">
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
                <ContextMenuContent className="text-right">
                  <ContextMenuItem onClick={() => setProfileDialogOpen(true)}>
                    <User className="h-4 w-4 ml-2" />
                    إعدادات الملف الشخصي
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
          {/* Navigation with clean calm styling */}
          <nav className="flex-1 p-3 space-y-1">
            {menuItems.map((item) => {
              const active = isActive(item.path);
              const isUsersItem = item.path === '/dashboard/users';
              return (
                <React.Fragment key={item.path}>
                  <button
                    type="button"
                    className={cn(
                      "w-full h-10 text-sm font-medium rounded transition-colors duration-200 flex items-center group text-right",
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
                    {isOpen && (
                      <span className="truncate">
                        {item.label}
                      </span>
                    )}
                  </button>

                  {/* Section "الموارد البشرية" avec sous-menu (LOT 8) */}
                  {isUsersItem && canAccessHR && (
                    isOpen ? (
                      <div className="space-y-1 my-1">
                        <button
                          type="button"
                          onClick={() => setHrExpanded(!hrExpanded)}
                          className={cn(
                            "w-full h-10 text-sm font-medium rounded transition-colors duration-200 flex items-center justify-between group text-right px-3",
                            isHrPersonnelActive
                              ? "bg-[#2c5282]/50 text-white font-medium"
                              : "text-slate-300 hover:text-white hover:bg-[#2d3748]"
                          )}
                          title="الموارد البشرية"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <UserCheck className={cn(
                              "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                              isHrPersonnelActive ? "text-white" : "text-gray-400 group-hover:text-gray-200"
                            )} />
                            <span className="truncate">الموارد البشرية</span>
                          </div>
                          {hrExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronLeft className="h-4 w-4 text-gray-400" />
                          )}
                        </button>

                        {hrExpanded && (
                          <div className="pr-5 pl-1 space-y-1 mt-0.5 border-r border-slate-700/60 mr-3">
                            <button
                              type="button"
                              onClick={() => navigate('/dashboard/hr/personnel')}
                              title={!isOpen ? "الموظفون" : undefined}
                              className={cn(
                                "w-full h-9 text-sm font-medium rounded transition-colors duration-200 flex items-center gap-2 text-right px-2.5",
                                location.pathname === '/dashboard/hr/personnel'
                                  ? "bg-[#2c5282] text-white font-bold"
                                  : "text-slate-300 hover:text-white hover:bg-[#2d3748]"
                              )}
                            >
                              <Users2 className={cn(
                                "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                                location.pathname === '/dashboard/hr/personnel' ? "text-white" : "text-gray-400"
                              )} />
                              <span className="truncate">الموظفون</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate('/dashboard/hr/personnel/new')}
                              title={!isOpen ? "إضافة موظف" : undefined}
                              className={cn(
                                "w-full h-9 text-sm font-medium rounded transition-colors duration-200 flex items-center gap-2 text-right px-2.5",
                                location.pathname === '/dashboard/hr/personnel/new'
                                  ? "bg-[#2c5282] text-white font-bold"
                                  : "text-slate-300 hover:text-white hover:bg-[#2d3748]"
                              )}
                            >
                              <UserPlus className={cn(
                                "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                                location.pathname === '/dashboard/hr/personnel/new' ? "text-white" : "text-gray-400"
                              )} />
                              <span className="truncate">إضافة موظف</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard/hr/personnel')}
                        title="الموارد البشرية"
                        className={cn(
                          "w-full h-10 text-sm font-medium rounded transition-colors duration-200 flex items-center justify-center px-2 group",
                          isHrPersonnelActive
                            ? "bg-[#2c5282] text-white shadow-sm font-medium"
                            : "text-slate-300 hover:text-white hover:bg-[#2d3748]"
                        )}
                      >
                        <UserCheck className={cn(
                          "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                          isHrPersonnelActive ? "text-white" : "text-gray-400 group-hover:text-gray-200"
                        )} />
                      </button>
                    )
                  )}
                </React.Fragment>
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
