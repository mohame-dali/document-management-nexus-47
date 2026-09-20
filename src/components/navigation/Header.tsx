
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '@/services/messageService';
import { getMyProfile } from '@/services/hr/personnelApi';
import PersonnelAvatar from '@/components/hr/PersonnelAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, User, Menu, LogOut, FileText, Shield, Users, Settings, Network, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '@/components/notifications/NotificationBell';

const Header = () => {
  const { currentUser, logout } = useAuth();
  const { toggle } = useSidebar();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Charger la fiche Personnel liée via React Query
  const { data: myProfile } = useQuery({
    queryKey: ['hr', 'my-profile'],
    queryFn: getMyProfile,
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Ne pas insister si pas de fiche Personnel (ex: admin système)
    refetchOnWindowFocus: false,
  });

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

  // Priorité 1 : photo fiche Personnel, Priorité 2 : photo User
  const photoSource = myProfile?.photo || currentUser?.photo;

  return (
    <header className="h-16 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-4 sm:px-6 shadow-sm z-10 select-none" dir="rtl">
      {/* Left side - Sidebar Toggle */}
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggle}
          title={t('header.toggleSidebar')}
          aria-label={t('header.toggleSidebar') || "القائمة الجانبية"}
          className="text-slate-600 hover:text-slate-900 hover:bg-[#f7fafc] rounded transition-colors duration-200"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Right side - Header items */}
      <div className="flex items-center space-x-reverse space-x-3 sm:space-x-4">
        {/* Title with Icon */}
        <div className="hidden md:flex items-center space-x-reverse space-x-2">
          <div className="p-1.5 bg-[#ebf4ff] text-[#2c5282] rounded">
            <FileText className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold text-[#1a202c]">
            {getHeaderTitle()}
          </h2>
        </div>

        {/* User Info with DropdownMenu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              aria-label="قائمة المستخدم"
              className="flex items-center min-h-[44px] space-x-reverse space-x-2.5 bg-[#f7fafc] border border-[#e2e8f0] rounded px-3 py-1.5 hover:bg-[#edf2f7] transition-colors cursor-pointer outline-none"
            >
              <PersonnelAvatar
                photo={photoSource}
                nom={myProfile?.nom}
                prenom={myProfile?.prenom}
                username={currentUser.username}
                size="md"
              />
              <div className="text-right">
                <p className="text-xs font-semibold text-[#1a202c] leading-tight">
                  {currentUser.username}
                </p>
                <Badge variant="outline" className={`text-xs px-2 py-0.5 rounded font-medium ${getRoleBadgeColor()}`}>
                  {t(`roles.${currentUser.role}`)}
                </Badge>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 mr-1" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 text-right" dir="rtl">
            <DropdownMenuItem onClick={() => navigate('/dashboard/hr/my-profile')} className="cursor-pointer">
              <User className="w-4 h-4 ml-2" />
              <span>ملفي الشخصي</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => navigate('/dashboard/organization-chart')} className="cursor-pointer">
              <Network className="w-4 h-4 ml-2" />
              <span>الهيكل التنظيمي</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem 
              onClick={logout} 
              className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
            >
              <LogOut className="w-4 h-4 ml-2" />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Activity Notifications Bell */}
        <NotificationBell />

        {/* Message Notifications */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNotificationClick}
            title={unreadCount > 0 ? `${unreadCount} ${t('header.unreadMessages')}` : t('header.viewMessages')}
            aria-label={unreadCount > 0 ? `${unreadCount} ${t('header.unreadMessages')}` : (t('header.viewMessages') || "الرسائل")}
            className="text-slate-600 hover:text-slate-900 hover:bg-[#f7fafc] rounded relative transition-colors duration-200"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#38a169] rounded px-1 flex items-center justify-center shadow-xs">
                <span className="text-[10px] text-white font-bold leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
