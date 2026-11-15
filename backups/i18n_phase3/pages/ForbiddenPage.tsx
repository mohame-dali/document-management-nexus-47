import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft, Home, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7fafc] p-4 text-right" dir="rtl">
      <div className="max-w-md w-full bg-white border border-[#e2e8f0] rounded shadow-sm p-8 text-center space-y-5">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-bold text-red-600 uppercase tracking-widest bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
            خطأ 403 — وصول غير مسموح
          </span>
          <h1 className="text-xl font-bold text-[#1a202c] mt-3">
            ليس لديك صلاحية للوصول إلى هذه الصفحة
          </h1>
          <p className="text-xs text-[#4a5568] mt-2 leading-relaxed">
            حسابك الحالي لا يمتلك الأذونات الكافية لعرض هذا المسار أو تنفيذ هذا الإجراء.
          </p>
        </div>

        {currentUser && (
          <div className="bg-[#f8fafc] border border-[#edf2f7] rounded p-3 text-xs text-[#718096] text-right space-y-1">
            <div className="flex justify-between">
              <span className="text-[#4a5568] font-medium">المستخدم الحالي:</span>
              <span className="font-semibold text-[#1a202c]">{currentUser.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4a5568] font-medium">الدور الوظيفي:</span>
              <span className="font-semibold text-[#2c5282]">{currentUser.role}</span>
            </div>
            {location.state?.from && (
              <div className="flex justify-between pt-1 border-t border-[#e2e8f0]">
                <span className="text-[#4a5568] font-medium">المسار المطلوب:</span>
                <span className="font-mono text-[11px] text-red-500">{location.state.from.pathname}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto bg-[#2c5282] hover:bg-[#2a4365] text-white text-xs h-9 px-4"
          >
            <Home className="w-4 h-4 ml-1.5" />
            لوحة القيادة
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto border-[#cbd5e1] text-[#4a5568] hover:bg-[#f7fafc] text-xs h-9 px-4"
          >
            <ArrowLeft className="w-4 h-4 ml-1.5" />
            الرجوع للخلف
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
