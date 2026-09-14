
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Crown, 
  Shield
} from 'lucide-react';
import { User } from '@/types';

interface UserStatisticsProps {
  currentUser: User;
  stats: {
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    adminDeptUsers: number;
    adminTuningUsers: number;
    regularUsers: number;
  };
  isLoading: boolean;
}

const UserStatistics = ({ currentUser, stats, isLoading }: UserStatisticsProps) => {
  if (!['Admin', 'AdminDepartment'].includes(currentUser?.role || '')) {
    return null;
  }

  return (
    <div className="bg-white rounded border border-[#e2e8f0] shadow-sm overflow-hidden">
      <div className="bg-[#f7fafc] border-b border-[#e2e8f0] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#ebf4ff] rounded border border-[#bee3f8] text-[#2c5282]">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#1a202c]">إحصائيات المستخدمين</h2>
        </div>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {/* Active Users */}
          <Card className="bg-white rounded border border-[#bbf0d0] shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
              <CardTitle className="text-xs font-medium text-[#22543d]">المستخدمون النشطون</CardTitle>
              <UserCheck className="h-4 w-4 text-[#38a169]" />
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-[#22543d]">{stats.activeUsers}</div>
              )}
            </CardContent>
          </Card>

          {/* Inactive Users */}
          <Card className="bg-white rounded border border-[#fed7d7] shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
              <CardTitle className="text-xs font-medium text-[#742a2a]">المستخدمون غير النشطون</CardTitle>
              <UserX className="h-4 w-4 text-[#e53e3e]" />
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-[#742a2a]">{stats.inactiveUsers}</div>
              )}
            </CardContent>
          </Card>

          {/* Admin Users */}
          <Card className="bg-white rounded border border-[#bee3f8] shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
              <CardTitle className="text-xs font-medium text-[#2c5282]">المدراء</CardTitle>
              <Crown className="h-4 w-4 text-[#2c5282]" />
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-[#2c5282]">{stats.adminUsers}</div>
              )}
            </CardContent>
          </Card>

          {/* Department Admins */}
          <Card className="bg-white rounded border border-[#e2e8f0] shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
              <CardTitle className="text-xs font-medium text-[#4a5568]">مدراء الأقسام</CardTitle>
              <Shield className="h-4 w-4 text-[#4a5568]" />
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-[#1a202c]">{stats.adminDeptUsers}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Roles Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center justify-between p-3 bg-[#f7fafc] rounded border border-[#e2e8f0]">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 bg-[#d69e2e] rounded-full"></div>
              <span className="text-xs font-medium text-[#4a5568]">مدراء المكاتب</span>
            </div>
            <span className="text-base font-bold text-[#1a202c]">{stats.adminTuningUsers}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-[#f7fafc] rounded border border-[#e2e8f0]">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 bg-[#2c5282] rounded-full"></div>
              <span className="text-xs font-medium text-[#4a5568]">المستخدمون العاديون</span>
            </div>
            <span className="text-base font-bold text-[#1a202c]">{stats.regularUsers}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#f7fafc] rounded border border-[#e2e8f0]">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 bg-[#38a169] rounded-full"></div>
              <span className="text-xs font-medium text-[#4a5568]">إجمالي النشطين</span>
            </div>
            <span className="text-base font-bold text-[#1a202c]">{stats.activeUsers}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStatistics;
