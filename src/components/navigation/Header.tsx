
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
import { MessageSquare, User, Menu, LogOut, FileText, Shield, Users, Settings, Network, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useSetupStatus } from '@/hooks/useSetupStatus';

const Header = () => {
  const { currentUser, logout } = useAuth();
  const { toggle } = useSidebar();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { nomAdmin } = useSetupStatus();

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
    <header className="flex justify-between items-center h-16 px-6 bg-white border-b border-[#e2e8f0] shadow-sm z-10 select-none" dir="rtl">
      {/* Branding à DROITE (RTL: premier élément) */}
      <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#ebf4ff] text-[#2c5282] rounded">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#2c5282] leading-tight">
              {nomAdmin || 'نظام إدارة المستندات'}
            </h1>
            <p className="text-xs text-[#718096]">
              {currentUser.role === 'AdminDepartment' && currentUser.activeDepartment
                ? currentUser.activeDepartment.name
                : 'نظام متكامل لإدارة المراسلات الإدارية والموارد البشرية'}
            </p>
          </div>
        </div>
      </div>

      {/* Actions & Profil à GAUCHE */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Activity Notifications Bell */}
        <NotificationBell />

        {/* Message Notifications */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNotificationClick}
            title="الرسائل غير المقروءة"
            aria-label="الرسائل غير المقروءة"
            className="p-2.5 min-w-[44px] min-h-[44px] text-[#4a5568] hover:text-[#2c5282] hover:bg-[#f7fafc] rounded relative transition-colors duration-200 flex items-center justify-center"
          >
            <MessageSquare className="h-5 w-5" />
            {unreadCount > 0 && (
              <div className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] bg-[#2c5282] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white px-1 leading-none">
                <span className="text-[10px] text-white font-bold leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </div>
            )}
          </Button>
        </div>

        {/* PROFIL UTILISATEUR (à gauche) */}
        <div className="border-e border-s border-[#e2e8f0] ps-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                aria-label="قائمة المستخدم"
                className="flex items-center min-h-[44px] gap-2.5 bg-white hover:bg-[#f7fafc] border border-[#e2e8f0] rounded px-3 py-1.5 transition-colors cursor-pointer outline-none"
              >
                <PersonnelAvatar
                  photo={photoSource}
                  nom={myProfile?.nom}
                  prenom={myProfile?.prenom}
                  username={currentUser.username}
                  size="md"
                  className="w-10 h-10 rounded-full border border-[#e2e8f0]"
                />
                <div className="text-right">
                  <p className="text-sm font-bold text-[#1a202c] leading-tight">
                    {currentUser.username}
                  </p>
                  <p className="text-xs text-[#718096] leading-tight mt-0.5">
                    {t(`roles.${currentUser.role}`)}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-[#718096]" />
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
        </div>
      </div>
    </header>
  );
};

export default Header;
