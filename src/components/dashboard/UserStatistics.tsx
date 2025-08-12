
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
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">إحصائيات المستخدمين</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Active Users */}
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">المستخدمون النشطون</CardTitle>
              <UserCheck className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-emerald-700">{stats.activeUsers}</div>
              )}
            </CardContent>
          </Card>

          {/* Inactive Users */}
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">المستخدمون غير النشطون</CardTitle>
              <UserX className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-red-700">{stats.inactiveUsers}</div>
              )}
            </CardContent>
          </Card>

          {/* Admin Users */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">المدراء</CardTitle>
              <Crown className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-purple-700">{stats.adminUsers}</div>
              )}
            </CardContent>
          </Card>

          {/* Department Admins */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">مدراء الأقسام</CardTitle>
              <Shield className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-blue-700">{stats.adminDeptUsers}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Roles Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-slate-700 font-medium">مدراء المكاتب</span>
            </div>
            <span className="text-lg font-bold text-slate-800">{stats.adminTuningUsers}</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
              <span className="text-slate-700 font-medium">المستخدمون العاديون</span>
            </div>
            <span className="text-lg font-bold text-slate-800">{stats.regularUsers}</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-slate-700 font-medium">إجمالي النشطين</span>
            </div>
            <span className="text-lg font-bold text-slate-800">{stats.activeUsers}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStatistics;
