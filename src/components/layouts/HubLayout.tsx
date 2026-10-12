import React from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { LucideIcon, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDirection } from '@/i18n/useDirection';

export interface HubTab {
  to: string;
  label: string;
  icon: LucideIcon;
  /** NOUVEAU : couleur de l'icône */
  color?: string;
  /** Badge compteur */
  badge?: number;
  allowedRoles?: string[];
}

export interface HubLayoutProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tabs: HubTab[];
  currentUserRole?: string;
  /** NOUVEAU : breadcrumb path (ex: [{label: 'الرئيسية', to: '/dashboard'}, {label: 'البريد'}]) */
  breadcrumb?: Array<{ label: string; to?: string }>;
}

export const HubLayout: React.FC<HubLayoutProps> = ({
  title,
  description,
  icon: HubIcon,
  tabs,
  currentUserRole,
  breadcrumb,
}) => {
  const { isRTL } = useDirection();
  const location = useLocation();

  // Filtrer les onglets selon le rôle
  const visibleTabs = React.useMemo(() => {
    return tabs.filter((tab) => {
      if (!tab.allowedRoles || tab.allowedRoles.length === 0) return true;
      if (!currentUserRole) return false;
      return tab.allowedRoles.includes(currentUserRole);
    });
  }, [tabs, currentUserRole]);

  // Détecter si un onglet est actif
  const isTabActive = (tabTo: string): boolean => {
    if (tabTo.startsWith('/dashboard') || tabTo.startsWith('/')) {
      return location.pathname === tabTo || 
             location.pathname.startsWith(tabTo + '/');
    }
    const currentBase = location.pathname.split('/').slice(0, -1).join('/');
    const fullPath = `${currentBase}/${tabTo}`;
    return location.pathname === fullPath || 
           location.pathname.startsWith(fullPath + '/');
  };

  // Chevron selon RTL
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc]" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* En-tête du hub */}
      <div className="bg-white border-b border-[#e2e8f0]">
        <div className="px-5 sm:px-6 lg:px-8 pt-5 pb-0 max-w-[1600px] mx-auto">
          {/* Breadcrumb */}
          {breadcrumb && breadcrumb.length > 0 && (
            <nav className="flex items-center gap-1.5 text-xs text-[#718096] mb-3" aria-label="Breadcrumb">
              <Link to="/dashboard" className="flex items-center gap-1 hover:text-[#2c5282] transition-colors">
                <Home className="w-3.5 h-3.5" />
                <span>الرئيسية</span>
              </Link>
              {breadcrumb.map((item, idx) => (
                <React.Fragment key={idx}>
                  <Chevron className="w-3 h-3 text-slate-400" />
                  {item.to ? (
                    <Link to={item.to} className="hover:text-[#2c5282] transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-[#1a202c] font-medium">{item.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* Titre */}
          <div className="flex items-center gap-3 mb-4">
            {HubIcon && (
              <div className="p-2 bg-[#2c5282]/10 rounded-lg">
                <HubIcon className="w-6 h-6 text-[#2c5282]" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1a202c]">
                {title}
              </h1>
              {description && (
                <p className="text-sm text-[#718096] mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Onglets horizontaux (style Gmail) avec icônes colorées */}
          <nav
            className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-px"
            role="tablist"
          >
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = isTabActive(tab.to);

              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={`
                    relative flex items-center gap-2 px-4 py-3 text-sm font-medium
                    whitespace-nowrap transition-all duration-200
                    border-b-[3px] -mb-px
                    ${
                      isActive
                        ? 'text-[#2c5282] border-[#2c5282] font-bold'
                        : 'text-slate-600 border-transparent hover:text-[#2c5282] hover:border-slate-300'
                    }
                  `}
                  role="tab"
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? tab.color || 'text-[#2c5282]' : 'text-slate-400'
                    }`}
                  />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <Badge className="bg-[#FFD758] text-[#1a202c] border border-[#FFCB56] text-xs px-1.5 py-0 h-5 font-bold animate-pulse-subtle">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </Badge>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenu de l'onglet actif — avec animation fade+slide */}
      <div
        key={location.pathname}
        className="p-5 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-slide-in"
      >
        <Outlet />
      </div>
    </div>
  );
};

export default HubLayout;
