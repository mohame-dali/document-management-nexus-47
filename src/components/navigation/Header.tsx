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
        return <Shield className="h-5 w-5 text-red-600" />;
      case 'AdminTuningDesk':
        return <Settings className="h-5 w-5 text-blue-600" />;
      case 'AdminDepartment':
        return <Users className="h-5 w-5 text-green-600" />;
      default:
        return <User className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = () => {
    switch (currentUser.role) {
      case 'Admin':
      case 'SuperAdmin':
        return 'bg-[#feeeee] text-[#9b2c2c] border-[#feb2b2]';
      case 'AdminTuningDesk':
        return 'bg-[#ebf4ff] text-[#2c5282] border-[#bee3f8]';
      case 'AdminDepartment':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-[#f1f5f9] text-[#475569] border-[#e2e8f0]';
    }
  };

  const getUserInitials = (username: string) => {
    return username ? username.charAt(0).toUpperCase() : 'U';
  };

  const getUserPhotoUrl = (user: any) => {
    if (user?.photo) {
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
      return `${API_URL}/${user.photo}`;
    }
    return null;
  };

  return (
    <header className="h-16 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-4 sm:px-6 shadow-sm z-10 select-none" dir="rtl">
      {/* Left side - Sidebar Toggle */}
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggle}
          title={t('header.toggleSidebar')}
          className="text-slate-600 hover:text-slate-900 hover:bg-[#f7fafc] rounded transition-colors duration-200"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Right side - Header items */}
      <div className="flex items-center space-x-reverse space-x-3 sm:space-x-4">
        {/* Title with Icon */}
        <div className="hidden md:flex items-center space-x-reverse space-x-2">
          <div className="p-2 bg-[#ebf4ff] text-[#2c5282] rounded">
            <FileText className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-[#1a202c]">
            {getHeaderTitle()}
          </h2>
        </div>

        {/* User Info with Photo */}
        <div className="flex items-center space-x-reverse space-x-2.5 bg-[#f7fafc] border border-[#e2e8f0] rounded px-4 py-2">
          <Avatar className="h-9 w-9 ring-1 ring-[#e2e8f0]">
            <AvatarImage 
              src={getUserPhotoUrl(currentUser)} 
              alt={currentUser.username}
            />
            <AvatarFallback className="bg-[#2c5282] text-white font-medium text-sm">
              {getUserInitials(currentUser.username)}
            </AvatarFallback>
          </Avatar>
          <div className="text-right">
            <p className="text-sm font-semibold text-[#1a202c] leading-tight">
              {currentUser.username}
            </p>
            <Badge variant="outline" className={`text-xs px-2 py-0 rounded font-normal ${getRoleBadgeColor()}`}>
              {t(`roles.${currentUser.role}`)}
            </Badge>
          </div>
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
            className="text-slate-600 hover:text-slate-900 hover:bg-[#f7fafc] rounded relative transition-colors duration-200"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-[#38a169] rounded px-1 flex items-center justify-center shadow-xs">
                <span className="text-xs text-white font-bold leading-none">
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
          className="text-[#e53e3e] hover:bg-[#feeeee] border border-[#feb2b2] hover:border-[#e53e3e] rounded transition-colors duration-200 shadow-xs"
          title={t('header.logout')}
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
