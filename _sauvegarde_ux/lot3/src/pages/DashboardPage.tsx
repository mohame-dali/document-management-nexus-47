
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStatsAPI } from '@/services/documentService';
import { getUsers } from '@/services/userService';
import { getFolders } from '@/services/folderService';
import { getDepartments } from '@/services/departmentService';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsCards from '@/components/dashboard/StatsCards';
import UserStatistics from '@/components/dashboard/UserStatistics';
import AvailableFeatures from '@/components/dashboard/AvailableFeatures';
import AuditSummary from '@/components/dashboard/AuditSummary';

import { AlertCircle, RefreshCw } from 'lucide-react';

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const currentYear = new Date().getFullYear().toString();

  // Fetch real count data directly via MongoDB aggregation
  const { 
    data: docStats, 
    isLoading: loadingDocStats,
    isError: errorDocStats,
    refetch: refetchDocStats 
  } = useQuery({
    queryKey: ['dashboardStats', currentYear],
    queryFn: () => getDashboardStatsAPI(currentYear),
    enabled: !!currentUser
  });

  const { 
    data: users, 
    isLoading: loadingUsers,
    isError: errorUsers,
    refetch: refetchUsers 
  } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: !!currentUser && ['Admin', 'AdminDepartment'].includes(currentUser.role)
  });

  const { 
    data: folders, 
    isLoading: loadingFolders,
    isError: errorFolders,
    refetch: refetchFolders 
  } = useQuery({
    queryKey: ['folders'],
    queryFn: () => getFolders(currentUser?.activeDepartment?._id),
    enabled: !!currentUser
  });

  const { 
    data: departments, 
    isLoading: loadingDepartments,
    isError: errorDepartments,
    refetch: refetchDepartments 
  } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    enabled: !!currentUser && currentUser.role === 'Admin'
  });

  const isError = errorDocStats || errorUsers || errorFolders || errorDepartments;

  const handleRefetch = () => {
    refetchDocStats();
    refetchUsers();
    refetchFolders();
    refetchDepartments();
  };

  const getDashboardStats = () => {
    const totalIncoming = docStats?.incomingTotal || 0;
    const totalOutgoing = docStats?.outgoingTotal || 0;
    const totalDocuments = docStats?.totalDocuments ?? (totalIncoming + totalOutgoing);
    const activeUsers = users?.filter(user => user.isActive)?.length || 0;
    const inactiveUsers = users?.filter(user => !user.isActive)?.length || 0;
    const totalFolders = folders?.length || 0;
    const totalDepartments = departments?.length || 0;

    // User role statistics
    const adminUsers = users?.filter(user => user.role === 'Admin' && user.isActive)?.length || 0;
    const adminDeptUsers = users?.filter(user => user.role === 'AdminDepartment' && user.isActive)?.length || 0;
    const adminTuningUsers = users?.filter(user => user.role === 'AdminTuningDesk' && user.isActive)?.length || 0;
    const regularUsers = users?.filter(user => user.role === 'User' && user.isActive)?.length || 0;

    return {
      totalDocuments,
      totalIncoming,
      totalOutgoing,
      activeUsers,
      inactiveUsers,
      totalFolders,
      totalDepartments,
      adminUsers,
      adminDeptUsers,
      adminTuningUsers,
      regularUsers
    };
  };

  const stats = getDashboardStats();
  const isLoading = loadingDocStats || loadingUsers || loadingFolders || loadingDepartments;

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#f7fafc]">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Dashboard Header */}
        <DashboardHeader currentUser={currentUser} currentYear={currentYear} />

        {/* Error Banner */}
        {isError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm font-medium text-red-800">
                Erreur de connexion au serveur. Impossible de charger les statistiques.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefetch}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Réessayer
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <StatsCards 
          currentUser={currentUser}
          currentYear={currentYear}
          stats={stats}
          isLoading={isLoading}
        />

        {/* User Statistics Section */}
        <UserStatistics 
          currentUser={currentUser}
          stats={stats}
          isLoading={isLoading}
        />

        {/* Audit Summary for Admin */}
        {currentUser.role === 'Admin' && (
          <AuditSummary />
        )}

        {/* Available Features */}
        <AvailableFeatures currentUser={currentUser} />
      </div>
    </div>
  );
};

export default DashboardPage;
