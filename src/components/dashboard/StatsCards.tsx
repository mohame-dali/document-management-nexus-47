
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Documents */}
      <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm hover:shadow transition-shadow duration-200 min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-sm font-semibold text-[#4a5568]">إجمالي الوثائق</CardTitle>
          <div className="p-3 bg-[#ebf4ff] rounded text-[#2c5282] border border-[#bee3f8]/50">
            <FileText className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-20 bg-[#edf2f7]" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-[#1a202c]">{stats.totalDocuments}</div>
          )}
          <p className="text-sm text-[#718096] mt-1">
            للعام {currentYear}
          </p>
        </CardContent>
      </Card>

      {/* Incoming Documents */}
      <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm hover:shadow transition-shadow duration-200 min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-sm font-semibold text-[#4a5568]">الوثائق الواردة</CardTitle>
          <div className="p-3 bg-[#ebf8f1] rounded text-[#38a169] border border-[#bbf0d0]/50">
            <TrendingUp className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-20 bg-[#edf2f7]" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-[#1a202c]">{stats.totalIncoming}</div>
          )}
          <p className="text-sm text-[#718096] mt-1">
            مستند وارد
          </p>
        </CardContent>
      </Card>

      {/* Outgoing Documents */}
      <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm hover:shadow transition-shadow duration-200 min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-sm font-semibold text-[#4a5568]">الوثائق الصادرة</CardTitle>
          <div className="p-3 bg-[#fef9e7] rounded text-[#d69e2e] border border-[#fbd38d]/50">
            <CheckCircle className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-20 bg-[#edf2f7]" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-[#1a202c]">{stats.totalOutgoing}</div>
          )}
          <p className="text-sm text-[#718096] mt-1">
            مستند صادر
          </p>
        </CardContent>
      </Card>

      {/* Dynamic 4th Card based on role */}
      {(currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Admin') ? (
        <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm hover:shadow transition-shadow duration-200 min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold text-[#4a5568]">الأقسام</CardTitle>
            <div className="p-3 bg-[#edf2f7] rounded text-[#4a5568] border border-[#e2e8f0]">
              <Building2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-20 bg-[#edf2f7]" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-[#1a202c]">{stats.totalDepartments}</div>
            )}
            <p className="text-sm text-[#718096] mt-1">
              قسم نشط
            </p>
          </CardContent>
        </Card>
      ) : ['Admin', 'AdminDepartment'].includes(currentUser?.role || '') ? (
        <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm hover:shadow transition-shadow duration-200 min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold text-[#4a5568]">المستخدمون النشطون</CardTitle>
            <div className="p-3 bg-[#ebf8f1] rounded text-[#38a169] border border-[#bbf0d0]/50">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-20 bg-[#edf2f7]" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-[#1a202c]">{stats.activeUsers}</div>
            )}
            <p className="text-sm text-[#718096] mt-1">
              مستخدم نشط
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm hover:shadow transition-shadow duration-200 min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold text-[#4a5568]">المجلدات</CardTitle>
            <div className="p-3 bg-[#ebf4ff] rounded text-[#2c5282] border border-[#bee3f8]/50">
              <FolderOpen className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-20 bg-[#edf2f7]" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-[#1a202c]">{stats.totalFolders}</div>
            )}
            <p className="text-sm text-[#718096] mt-1">
              مجلد منظم
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatsCards;
