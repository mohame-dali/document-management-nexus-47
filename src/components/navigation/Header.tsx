
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
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import GlobalSearch from '@/components/navigation/GlobalSearch';

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
    queryKey: ['unread-messages-count'],
    queryFn: getUnreadCount,
    enabled: !!currentUser,
    refetchInterval: 60000, // Refetch every 60 seconds
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
      case 'Director':
        return 'border-[#d69e2e]/40 bg-[#d69e2e]/15 text-[#b7791f]';
      case 'Admin':
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
    <header className="sticky top-0 z-30 shrink-0 flex justify-between items-center h-16 px-3 sm:px-4 md:px-6 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-sm select-none gap-2 min-w-0 w-full transition-colors duration-200 print:hidden">
      {/* Branding à DROITE (RTL: premier élément) */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial sm:max-w-[240px] lg:max-w-[300px] xl:max-w-sm">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggle}
          title={t('header.toggleSidebar')}
          aria-label={t('header.toggleSidebar') || t('header.sidebarFallback')}
          className="h-10 w-10 sm:min-w-[44px] sm:min-h-[44px] shrink-0 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-lg transition-colors duration-200"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="hidden lg:flex p-2 bg-[#ebf4ff] dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 rounded-lg shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-[#2c5282] dark:text-slate-100 leading-tight truncate">
              {nomAdmin || t('header.title')}
            </h1>
            <p className="hidden md:block text-xs text-slate-700 dark:text-slate-300 truncate">
              {currentUser.role === 'AdminDepartment' && currentUser.activeDepartment
                ? currentUser.activeDepartment.name
                : t('header.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Recherche globale multi-modules (Centré) */}
      <div className="hidden sm:block flex-1 max-w-md mx-2 lg:mx-6 min-w-0">
        <GlobalSearch />
      </div>

      {/* Actions & Profil à GAUCHE */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Utility Controls Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher />
          <NotificationBell />

          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleNotificationClick}
              title={t('header.unreadMessagesCount')}
              aria-label={t('header.unreadMessagesCount')}
              className="h-9 w-9 sm:h-10 sm:w-10 text-slate-600 dark:text-slate-300 hover:text-[#2c5282] dark:hover:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative transition-colors duration-200 flex items-center justify-center"
            >
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] bg-[#2c5282] dark:bg-blue-600 text-white text-[12px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 px-1 leading-none tabular-nums">
                  <bdi dir="ltr">{unreadCount > 9 ? '9+' : unreadCount}</bdi>
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* PROFIL UTILISATEUR (à gauche) */}
        <div className="border-s border-slate-200/80 dark:border-slate-800 ps-2 sm:ps-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                aria-label={t('header.userMenu')}
                className="flex items-center min-h-[40px] gap-2 bg-white/90 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-1 lg:px-2.5 lg:py-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2c5282] focus-visible:ring-offset-2 shadow-2xs"
              >
                <PersonnelAvatar
                  photo={photoSource}
                  nom={myProfile?.nom}
                  prenom={myProfile?.prenom}
                  username={currentUser.username}
                  size="md"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-200/80 dark:border-slate-700 shrink-0"
                />
                <div className="hidden lg:block text-start max-w-[140px] min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                    {currentUser.username}
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-tight mt-0.5 truncate">
                    {t(`roles.${currentUser.role}`)}
                  </p>
                </div>
                <ChevronDown className="hidden lg:block h-4 w-4 text-slate-700 dark:text-slate-300 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-start">
              <DropdownMenuItem onClick={() => navigate('/dashboard/hr/my-profile')} className="cursor-pointer">
                <User className="w-4 h-4 ms-2" />
                <span>{t('header.myProfile')}</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate('/dashboard/organization/chart')} className="cursor-pointer">
                <Network className="w-4 h-4 ms-2" />
                <span>{t('header.organizationChart')}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem 
                onClick={logout} 
                className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
              >
                <LogOut className="w-4 h-4 ms-2" />
                <span>{t('header.logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
