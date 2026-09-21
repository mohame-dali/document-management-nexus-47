
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, RefreshCw } from 'lucide-react';
import { getAuditLogs, type AuditLogFilters } from '@/services/auditService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import AuditStats from '@/components/dashboard/AuditStats';
import AuditTable from './AuditTable';
import AuditFilters from './AuditFilters';
import AuditExport from './AuditExport';

const AuditTrailViewer: React.FC = () => {
  const { currentUser } = useAuth();
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 50
  });

  const { data: auditResponse, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: () => getAuditLogs(filters),
    enabled: currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Admin',
    staleTime: 30000, // 30 seconds
  });

  const auditLogs = Array.isArray(auditResponse) ? auditResponse : auditResponse?.data || [];
  const pagination = auditResponse?.pagination;

  const handleApplyFilters = async () => {
    try {
      await refetch();
      toast.success('تم تطبيق المرشحات بنجاح');
    } catch (error) {
      console.error('Filter error:', error);
      toast.error('فشل في تطبيق المرشحات');
    }
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 50
    });
    toast.success('تم إعادة تعيين المرشحات');
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('تم تحديث البيانات');
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('فشل في تحديث البيانات');
    }
  };

  if (currentUser?.role !== 'SuperAdmin' && currentUser?.role !== 'Admin') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">غير مصرح</h3>
          <p className="text-gray-500">ليس لديك صلاحية لعرض سجل التدقيق</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Audit Stats */}
      <AuditStats />

      {/* Header */}
      <Card className="bg-white border border-[#e2e8f0] shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#2c5282] rounded shadow-sm">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-[#1a202c]">
                  سجل التدقيق والمراجعة
                </CardTitle>
                <p className="text-gray-600">مراقبة شاملة لجميع العمليات والأنشطة في النظام</p>
                {pagination && (
                  <p className="text-sm text-gray-500 mt-1">
                    عرض {auditLogs.length} من أصل {pagination.total} سجل
                    (الصفحة {pagination.current} من {pagination.pages})
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRefresh}
                disabled={isFetching}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Filters - Left Side */}
        <div className="xl:col-span-1">
          <div className="space-y-4">
            <AuditFilters
              filters={filters}
              onFiltersChange={setFilters}
              onApplyFilters={handleApplyFilters}
              onResetFilters={handleResetFilters}
            />
            
            <AuditExport
              filters={filters}
              totalRecords={pagination?.total || auditLogs.length}
            />
          </div>
        </div>

        {/* Audit Table - Right Side */}
        <div className="xl:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>سجل العمليات المفصل</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AuditTable auditLogs={auditLogs} isLoading={isLoading} />
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    الصفحة {pagination.current} من {pagination.pages}
                    ({pagination.total} سجل إجمالي)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                      disabled={pagination.current <= 1}
                      variant="outline"
                      size="sm"
                    >
                      السابق
                    </Button>
                    <Button
                      onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                      disabled={pagination.current >= pagination.pages}
                      variant="outline"
                      size="sm"
                    >
                      التالي
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditTrailViewer;
