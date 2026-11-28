import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import Sidebar from '../navigation/Sidebar';
import Header from '../navigation/Header';
import DepartmentSwitcher from '../department/DepartmentSwitcher';
import NotificationSystem from '../notifications/NotificationSystem';
import ResponsibleNotificationOverlay from '../notifications/ResponsibleNotificationOverlay';
import { FloatingAIChat } from '@/components/ai/FloatingAIChat';
import { useDirection } from '@/i18n/useDirection';

const DashboardLayout = () => {
  const { currentUser } = useAuth();
  const { dir } = useDirection();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background" dir={dir}>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar - Responsive behavior handled in SidebarProvider */}
          <Sidebar />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header - Fixed */}
            <Header />
            
            {/* Department Switcher for AdminDepartment with multiple departments */}
            {currentUser?.role === 'AdminDepartment' && 
             currentUser?.departments?.length > 1 && (
              <div className="container-responsive py-2 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex-shrink-0 print:hidden">
                <DepartmentSwitcher />
              </div>
            )}
            
            {/* Main Content - Scrollable */}
            <main ref={mainRef} className="flex-1 overflow-auto custom-scrollbar bg-slate-50/70 dark:bg-slate-950">
              <div className="container-responsive padding-responsive min-h-full">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
        
        {/* Notification System - runs in background */}
        <NotificationSystem />
        
        {/* Responsible Assignment Notifications - persistent overlay */}
        <ResponsibleNotificationOverlay />
        
        {/* Floating AI Chat Assistant */}
        <FloatingAIChat />
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
