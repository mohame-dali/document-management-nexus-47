
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '@/services/messageService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Bell, User, Menu, LogOut, FileText, Shield, Users, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '@/components/notifications/NotificationBell';

const Header = () => {
  const { currentUser, logout } = useAuth();
  const { toggle } = useSidebar();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Fetch unread message count
  const { data: unreadData } = useQuery({
    queryKey: ['unreadMessages'],
    queryFn: getUnreadCount,
    enabled: !!currentUser,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 0, // Always consider data stale to ensure fresh counts
  });

  const unreadCount = unreadData?.count || 0;

  const handleNotificationClick = () => {
    navigate('/dashboard/messages');
  };


  if (!currentUser) return null;

  const getHeaderTitle = () => {
    if (currentUser.role === 'AdminDepartment' && currentUser.activeDepartment) {
      return `${t('header.departmentDashboard')} - ${currentUser.activeDepartment.name}`;
    }
    return t('header.title');
  };

  const getRoleIcon = () => {
    switch (currentUser.role) {
      case 'Admin':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'AdminTuningDesk':
        return <Settings className="h-4 w-4 text-blue-600" />;
      case 'AdminDepartment':
        return <Users className="h-4 w-4 text-green-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = () => {
    switch (currentUser.role) {
      case 'Admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'AdminTuningDesk':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'AdminDepartment':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUserInitials = (username: string) => {
    return username ? username.charAt(0).toUpperCase() : 'U';
  };

  const getUserPhotoUrl = (user: any) => {
    if (user?.photo) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      return `${API_URL}/${user.photo}`;
    }
    return null;
  };

  return (
    <header className="h-16 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 flex items-center justify-between px-6 shadow-lg" dir="rtl">
      {/* Left side - Sidebar Toggle */}
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggle}
          title={t('header.toggleSidebar')}
          className="hover:bg-blue-500/20 text-white"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Right side - All other header items grouped together */}
      <div className="flex items-center space-x-reverse space-x-6">
        {/* User Info with Photo */}
        <div className="flex items-center space-x-reverse space-x-3 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={getUserPhotoUrl(currentUser)} 
              alt={currentUser.username}
            />
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
              {getUserInitials(currentUser.username)}
            </AvatarFallback>
          </Avatar>
          <div className="text-right">
            <p className="text-sm font-medium text-white">
              {t('header.welcome')} {currentUser.username}
            </p>
            <Badge variant="secondary" className={`text-xs ${getRoleBadgeColor()}`}>
              {t(`roles.${currentUser.role}`)}
            </Badge>
          </div>
        </div>

        {/* Title with Icon */}
        <div className="flex items-center space-x-reverse space-x-2">
          <FileText className="h-6 w-6 text-white/80" />
          <h2 className="text-lg font-semibold text-white">
            {getHeaderTitle()}
          </h2>
        </div>

        {/* Activity Notifications Bell */}
        <NotificationBell />

        {/* Message Notifications */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNotificationClick}
            title={unreadCount > 0 ? `${unreadCount} ${t('header.unreadMessages')}` : t('header.viewMessages')}
            className="hover:bg-white/20 text-white relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-xs text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </div>
            )}
          </Button>
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 text-white border-red-600 hover:border-red-700 transition-all duration-200 shadow-lg"
          title={t('header.logout')}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
