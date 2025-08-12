
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Users, 
  FolderOpen, 
  TrendingUp,
  CheckCircle,
  Building2
} from 'lucide-react';
import { User } from '@/types';

interface StatsCardsProps {
  currentUser: User;
  currentYear: string;
  stats: {
    totalDocuments: number;
    totalIncoming: number;
    totalOutgoing: number;
    activeUsers: number;
    totalFolders: number;
    totalDepartments: number;
  };
  isLoading: boolean;
}

const StatsCards = ({ currentUser, currentYear, stats, isLoading }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Documents */}
      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-100">إجمالي الوثائق</CardTitle>
          <div className="p-2 bg-white/20 rounded-lg">
            <FileText className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16 bg-white/20" />
          ) : (
            <div className="text-3xl font-bold">{stats.totalDocuments}</div>
          )}
          <p className="text-xs text-blue-100 mt-1">
            للعام {currentYear}
          </p>
        </CardContent>
      </Card>

      {/* Incoming Documents */}
      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-100">الوثائق الواردة</CardTitle>
          <div className="p-2 bg-white/20 rounded-lg">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16 bg-white/20" />
          ) : (
            <div className="text-3xl font-bold">{stats.totalIncoming}</div>
          )}
          <p className="text-xs text-green-100 mt-1">
            مستند وارد
          </p>
        </CardContent>
      </Card>

      {/* Outgoing Documents */}
      <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orange-100">الوثائق الصادرة</CardTitle>
          <div className="p-2 bg-white/20 rounded-lg">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16 bg-white/20" />
          ) : (
            <div className="text-3xl font-bold">{stats.totalOutgoing}</div>
          )}
          <p className="text-xs text-orange-100 mt-1">
            مستند صادر
          </p>
        </CardContent>
      </Card>

      {/* Dynamic 4th Card based on role */}
      {(currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Admin') ? (
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-100">الأقسام</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 bg-white/20" />
            ) : (
              <div className="text-3xl font-bold">{stats.totalDepartments}</div>
            )}
            <p className="text-xs text-purple-100 mt-1">
              قسم نشط
            </p>
          </CardContent>
        </Card>
      ) : ['Admin', 'AdminDepartment'].includes(currentUser?.role || '') ? (
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-100">المستخدمون النشطون</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 bg-white/20" />
            ) : (
              <div className="text-3xl font-bold">{stats.activeUsers}</div>
            )}
            <p className="text-xs text-indigo-100 mt-1">
              مستخدم نشط
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-teal-100">المجلدات</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <FolderOpen className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 bg-white/20" />
            ) : (
              <div className="text-3xl font-bold">{stats.totalFolders}</div>
            )}
            <p className="text-xs text-teal-100 mt-1">
              مجلد منظم
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatsCards;
