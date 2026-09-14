import React from 'react';
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
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

  const isActive = (path: string) => location.pathname.startsWith(path);

  const menuItems = [
    // SuperAdmin menu items (same as Admin with full access)
    ...(currentUser?.role === 'SuperAdmin' ? [
      { path: '/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard, color: 'text-blue-600' },
      { path: '/dashboard/departments', label: t('sidebar.departments'), icon: Building2, color: 'text-purple-600' },
      { path: '/dashboard/users', label: t('sidebar.users'), icon: Users2, color: 'text-green-600' },
      { path: '/dashboard/incoming-documents', label: t('sidebar.incomingDocuments'), icon: FileInput, color: 'text-orange-600' },
      { path: '/dashboard/outgoing-documents', label: t('sidebar.outgoingDocuments'), icon: FileOutput, color: 'text-red-600' },
      { path: '/dashboard/folders', label: t('sidebar.folders'), icon: FolderOpen, color: 'text-yellow-600' },
      { path: '/dashboard/advanced-search', label: t('sidebar.advancedSearch'), icon: Search, color: 'text-cyan-600' },
      { path: '/dashboard/messages', label: t('sidebar.messages'), icon: MessageCircle, color: 'text-indigo-600' },
    ] : []),

    // Admin menu items
    ...(currentUser?.role === 'Admin' ? [
      { path: '/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard, color: 'text-blue-600' },
      { path: '/dashboard/departments', label: t('sidebar.departments'), icon: Building2, color: 'text-purple-600' },
      { path: '/dashboard/users', label: t('sidebar.users'), icon: Users2, color: 'text-green-600' },
      { path: '/dashboard/incoming-documents', label: t('sidebar.incomingDocuments'), icon: FileInput, color: 'text-orange-600' },
      { path: '/dashboard/outgoing-documents', label: t('sidebar.outgoingDocuments'), icon: FileOutput, color: 'text-red-600' },
      { path: '/dashboard/folders', label: t('sidebar.folders'), icon: FolderOpen, color: 'text-yellow-600' },
      { path: '/dashboard/advanced-search', label: t('sidebar.advancedSearch'), icon: Search, color: 'text-cyan-600' },
      { path: '/dashboard/messages', label: t('sidebar.messages'), icon: MessageCircle, color: 'text-indigo-600' },
      { path: '/dashboard/settings', label: 'الإعدادات', icon: Settings, color: 'text-gray-600' },
    ] : []),

    // AdminTuningDesk menu items
    ...(currentUser?.role === 'AdminTuningDesk' ? [
      { path: '/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard, color: 'text-blue-600' },
      { path: '/dashboard/incoming-documents', label: t('sidebar.incomingDocuments'), icon: FileInput, color: 'text-orange-600' },
      { path: '/dashboard/outgoing-documents', label: t('sidebar.outgoingDocuments'), icon: FileOutput, color: 'text-red-600' },
      { path: '/dashboard/folders', label: t('sidebar.folders'), icon: FolderOpen, color: 'text-yellow-600' },
      { path: '/dashboard/document-options', label: t('sidebar.documentOptions'), icon: Settings, color: 'text-purple-600' },
      { path: '/dashboard/templates', label: 'النماذج', icon: FileText, color: 'text-blue-600' },
      { path: '/dashboard/advanced-search', label: t('sidebar.advancedSearch'), icon: Search, color: 'text-cyan-600' },
      { path: '/dashboard/messages', label: t('sidebar.messages'), icon: MessageCircle, color: 'text-indigo-600' },
    ] : []),

    // AdminDepartment menu items
    ...(currentUser?.role === 'AdminDepartment' ? [
      { path: '/dashboard/admin-department', label: t('sidebar.departmentDashboard'), icon: Building2, color: 'text-purple-600' },
      { path: '/dashboard/users', label: t('sidebar.users'), icon: Users2, color: 'text-green-600' },
      { path: '/dashboard/incoming-documents', label: t('sidebar.incomingDocuments'), icon: FileInput, color: 'text-orange-600' },
      { path: '/dashboard/outgoing-documents', label: t('sidebar.outgoingDocuments'), icon: FileOutput, color: 'text-red-600' },
      { path: '/dashboard/folders', label: t('sidebar.folders'), icon: FolderOpen, color: 'text-yellow-600' },
      { path: '/dashboard/templates', label: 'النماذج', icon: FileText, color: 'text-blue-600' },
      { path: '/dashboard/advanced-search', label: t('sidebar.advancedSearch'), icon: Search, color: 'text-cyan-600' },
      { path: '/dashboard/messages', label: t('sidebar.messages'), icon: MessageCircle, color: 'text-indigo-600' },
    ] : []),

    // User menu items
    ...(currentUser?.role === 'User' ? [
      { path: '/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard, color: 'text-blue-600' },
      { path: '/dashboard/incoming-documents', label: t('sidebar.incomingDocuments'), icon: FileInput, color: 'text-orange-600' },
      { path: '/dashboard/outgoing-documents', label: t('sidebar.outgoingDocuments'), icon: FileOutput, color: 'text-red-600' },
      { path: '/dashboard/templates', label: 'النماذج', icon: FileText, color: 'text-blue-600' },
      { path: '/dashboard/advanced-search', label: t('sidebar.advancedSearch'), icon: Search, color: 'text-cyan-600' },
      { path: '/dashboard/messages', label: t('sidebar.messages'), icon: MessageCircle, color: 'text-indigo-600' },
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
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
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
            <div className="p-2.5 bg-[#2c5282]/25 text-[#90cdf4] border border-[#2c5282]/40 rounded shadow-sm">
              <FileText className="h-6 w-6" />
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
                  <Avatar className="h-10 w-10 ring-1 ring-slate-600 cursor-pointer hover:ring-[#2c5282] transition-colors duration-200">
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
                    <AvatarFallback className="bg-[#2c5282] text-white font-medium text-sm">
                      {getUserInitials(currentUser.username)}
                    </AvatarFallback>
                  </Avatar>
                </ContextMenuTrigger>
                <ContextMenuContent className="text-right">
                  <ContextMenuItem onClick={() => setProfileDialogOpen(true)}>
                    <User className="h-5 w-5 ml-2" />
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
                      className={cn("text-sm px-2 py-0.5 rounded font-medium", getRoleBadgeColor(currentUser.role))}
                    >
                      {getRoleLabel(currentUser.role)}
                    </Badge>
                  </div>
                  {currentUser.activeDepartment && (
                    <p className="text-sm text-slate-400 mt-1 truncate">
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
          <nav className="flex-1 p-3 space-y-1.5">
            {menuItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  className={cn(
                    "w-full h-11 text-base font-medium rounded transition-colors duration-200 flex items-center group text-right",
                    isOpen ? "justify-start gap-3 px-3" : "justify-center px-2",
                    active 
                      ? "bg-[#2c5282] text-white shadow-sm font-medium" 
                      : "text-slate-300 hover:text-white hover:bg-[#2d3748]"
                  )}
                  onClick={() => navigate(item.path)}
                  title={!isOpen ? item.label : undefined}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                    active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                  )} />
                  {isOpen && (
                    <span className="truncate">
                      {item.label}
                    </span>
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
