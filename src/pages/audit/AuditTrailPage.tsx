
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import AuditTrailViewer from '@/components/audit/AuditTrailViewer';

const AuditTrailPage = () => {
  const { currentUser } = useAuth();

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="container-responsive padding-responsive animate-fade-in-up" dir="rtl">
        <Card className="enhanced-card">
          <CardContent className="padding-responsive-lg text-center space-y-4">
            <Lock className="h-12 w-12 mx-auto text-gray-400" />
            <div className="space-y-2">
              <h2 className="text-responsive-lg font-medium text-gray-600">ليس لديك صلاحية</h2>
              <p className="text-responsive-sm text-gray-500 leading-relaxed">
                ليس لديك الصلاحية لعرض سجل التدقيق والمراجعة
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-responsive padding-responsive-sm animate-fade-in-up" dir="rtl">
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-responsive-xl font-bold text-[#1a202c]">
            سجل التدقيق والمراجعة
          </h1>
          <p className="text-responsive-sm text-muted-foreground">
            مراقبة جميع العمليات والأنشطة في النظام مع إمكانية التصدير والتحليل
          </p>
        </div>

        {/* Audit Trail Component */}
        <div className="animate-scale-in">
          <AuditTrailViewer />
        </div>
      </div>
    </div>
  );
};

export default AuditTrailPage;
