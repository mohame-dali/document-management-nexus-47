
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getIncomingDocumentsList, getOutgoingDocumentsList } from '@/services/documentService';
import { getUsers } from '@/services/userService';
import { getFolders } from '@/services/folderService';
import { getDepartments } from '@/services/departmentService';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsCards from '@/components/dashboard/StatsCards';
import UserStatistics from '@/components/dashboard/UserStatistics';
import AvailableFeatures from '@/components/dashboard/AvailableFeatures';
import AuditSummary from '@/components/dashboard/AuditSummary';

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const currentYear = new Date().getFullYear().toString();

  // Fetch real data
  const { data: incomingDocs, isLoading: loadingIncoming } = useQuery({
    queryKey: ['incomingDocuments', currentYear],
    queryFn: () => getIncomingDocumentsList({ year: currentYear }),
    enabled: !!currentUser
  });

  const { data: outgoingDocs, isLoading: loadingOutgoing } = useQuery({
    queryKey: ['outgoingDocuments', currentYear],
    queryFn: () => getOutgoingDocumentsList({ year: currentYear }),
    enabled: !!currentUser
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: !!currentUser && ['Admin', 'AdminDepartment'].includes(currentUser.role)
  });

  const { data: folders, isLoading: loadingFolders } = useQuery({
    queryKey: ['folders'],
    queryFn: () => getFolders(currentUser?.activeDepartment?._id),
    enabled: !!currentUser
  });

  const { data: departments, isLoading: loadingDepartments } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    enabled: !!currentUser && currentUser.role === 'Admin'
  });

  const getDashboardStats = () => {
    const totalIncoming = incomingDocs?.length || 0;
    const totalOutgoing = outgoingDocs?.length || 0;
    const totalDocuments = totalIncoming + totalOutgoing;
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
  const isLoading = loadingIncoming || loadingOutgoing || loadingUsers || loadingFolders || loadingDepartments;

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" dir="rtl">
      <div className="p-6 space-y-8">
        {/* Dashboard Header */}
        <DashboardHeader currentUser={currentUser} currentYear={currentYear} />

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
