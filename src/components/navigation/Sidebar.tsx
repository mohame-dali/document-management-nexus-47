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
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800 border-yellow-200 shadow-sm';
      case 'Admin':
        return 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-200 shadow-sm';
      case 'AdminTuningDesk':
        return 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-200 shadow-sm';
      case 'AdminDepartment':
        return 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border-purple-200 shadow-sm';
      case 'User':
        return 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-200 shadow-sm';
      default:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-200 shadow-sm';
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
      "h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 border-l border-border/50 shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out",
      isOpen ? "w-64" : "w-16"
    )} dir="rtl">
      {/* Header with enhanced styling - Fixed */}
      <div className={cn(
        "flex-shrink-0 border-b border-border/50 bg-gradient-to-r from-white via-slate-50 to-white backdrop-blur-sm transition-all duration-300 relative",
        isOpen ? "p-6" : "p-3"
      )}>
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-t-lg" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl shadow-sm ring-1 ring-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            {isOpen && (
              <div>
                <h1 className="text-xl font-bold text-foreground bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  {t('sidebar.dmsSystem')}
                </h1>
                <p className="text-xs text-muted-foreground/70">{t('sidebar.documentManagement')}</p>
              </div>
            )}
          </div>
          
          {currentUser && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200/50 shadow-sm ring-1 ring-slate-200/20 backdrop-blur-sm">
              <ContextMenu>
                <ContextMenuTrigger>
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20 shadow-md cursor-pointer hover:ring-primary/40 transition-all">
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
                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-medium text-sm">
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
                  <p className="text-sm font-semibold text-foreground truncate mb-1">
                    {currentUser.username}
                  </p>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs font-medium", getRoleBadgeColor(currentUser.role))}
                  >
                    {getRoleLabel(currentUser.role)}
                  </Badge>
                  {currentUser.activeDepartment && (
                    <p className="text-xs text-muted-foreground/70 mt-1 truncate">
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
          {/* Navigation with enhanced styling */}
          <nav className="flex-1 p-4 space-y-2 relative">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/30 to-transparent pointer-events-none" />
            
            <div className="relative z-10 space-y-2">
              {menuItems.map((item, index) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className={cn(
                    "w-full h-12 font-medium transition-all duration-300 ease-in-out group relative overflow-hidden",
                    isOpen ? "justify-start gap-3 px-4" : "justify-center px-2",
                    isActive(item.path) 
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                      : "hover:bg-gradient-to-r hover:from-accent hover:to-accent/80 hover:text-accent-foreground hover:shadow-md hover:scale-105 hover:translate-x-1"
                  )}
                  onClick={() => navigate(item.path)}
                  title={!isOpen ? item.label : undefined}
                >
                  {/* Button glow effect */}
                  {isActive(item.path) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-md blur-sm" />
                  )}
                  
                  <item.icon className={cn(
                    "h-5 w-5 transition-all duration-300 relative z-10",
                    isActive(item.path) ? "text-primary-foreground" : item.color,
                    "group-hover:scale-110"
                  )} />
                  {isOpen && (
                    <span className="truncate relative z-10 transition-all duration-300">
                      {item.label}
                    </span>
                  )}
                  
                  {/* Hover indicator */}
                  {!isActive(item.path) && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/60 to-primary/30 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 rounded-r-full" />
                  )}
                </Button>
              ))}
            </div>
          </nav>

          {/* Folder Categorization Sidebar for Users with enhanced styling */}
          {isOpen && currentUser?.role === 'User' && (
            <div className="flex-shrink-0 p-4 border-t border-border/50 bg-gradient-to-r from-slate-50/50 to-white/50 backdrop-blur-sm">
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
