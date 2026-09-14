
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import Sidebar from '../navigation/Sidebar';
import Header from '../navigation/Header';
import DepartmentSwitcher from '../department/DepartmentSwitcher';
import NotificationSystem from '../notifications/NotificationSystem';
import ResponsibleNotificationOverlay from '../notifications/ResponsibleNotificationOverlay';
import { Department } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';

const DashboardLayout = () => {
  const { currentUser } = useAuth();
  const isMobile = useIsMobile();

  const getActiveDepartmentName = (): string => {
    if (!currentUser?.activeDepartment) return 'None';
    
    // If activeDepartment is a populated object
    if (typeof currentUser.activeDepartment === 'object' && 'name' in currentUser.activeDepartment) {
      return (currentUser.activeDepartment as Department).name;
    }
    
    // If activeDepartment is just an ObjectId string
    if (typeof currentUser.activeDepartment === 'string') {
      return (currentUser.activeDepartment as string).slice(-4); // Show last 4 chars
    }
    
    return 'None';
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar - Responsive behavior handled in SidebarProvider */}
          <Sidebar />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header - Fixed */}
            <Header />
            
            {/* Department Switcher for AdminDepartment with multiple departments */}
            {currentUser?.role === 'AdminDepartment' && 
             currentUser?.departments?.length > 1 && (
              <div className="container-responsive py-2 border-b bg-gray-50 flex-shrink-0">
                <DepartmentSwitcher />
              </div>
            )}
            
            {/* Development Debug Info - Responsive */}
            {process.env.NODE_ENV === 'development' && currentUser?.role === 'AdminDepartment' && (
              <div className="container-responsive py-1 bg-yellow-50 border-b text-responsive-xs text-yellow-800 flex-shrink-0">
                Debug: Active Department: {getActiveDepartmentName()} | 
                Total Departments: {currentUser.departments?.length || 0}
              </div>
            )}
            
            {/* Main Content - Scrollable */}
            <main className="flex-1 overflow-auto">
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
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
