
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import AuditTrailViewer from '@/components/audit/AuditTrailViewer';

const AuditTrailPage = () => {
  const { currentUser } = useAuth();

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6" dir="rtl">
        <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
          <CardContent className="p-8 text-center space-y-4">
            <Lock className="h-12 w-12 mx-auto text-gray-400" />
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-[#1a202c]">ليس لديك صلاحية</h2>
              <p className="text-sm text-[#4a5568] leading-relaxed">
                ليس لديك الصلاحية لعرض سجل التدقيق والمراجعة
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6" dir="rtl">
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1a202c]">
            سجل التدقيق والمراجعة
          </h1>
          <p className="text-sm text-[#4a5568] mt-1">
            مراقبة جميع العمليات والأنشطة في النظام مع إمكانية التصدير والتحليل
          </p>
        </div>

        {/* Audit Trail Component */}
        <div>
          <AuditTrailViewer />
        </div>
      </div>
    </div>
  );
};

export default AuditTrailPage;
