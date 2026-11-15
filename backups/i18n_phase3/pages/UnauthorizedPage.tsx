
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7fafc]" dir="rtl">
      <div className="text-center p-8 bg-white border border-[#e2e8f0] rounded shadow-sm max-w-md w-full mx-4">
        <div className="flex justify-center mb-4">
          <ShieldAlert className="h-16 w-16 text-[#e53e3e]" />
        </div>
        <h1 className="text-2xl font-bold text-[#1a202c] mb-3">غير مصرح بالوصول</h1>
        <p className="text-[#4a5568] text-sm leading-relaxed mb-6">
          ليس لديك صلاحية للوصول إلى هذه الصفحة. يرجى التواصل مع مسؤول النظام إذا كنت تعتقد أن هذا خطأ.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => navigate('/dashboard')}
            className="h-11 px-6 bg-[#2c5282] text-white hover:bg-[#2a4365] rounded font-medium"
          >
            الصفحة الرئيسية
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="h-11 px-6 border-[#e2e8f0] text-[#4a5568] hover:bg-[#f7fafc] rounded font-medium"
          >
            العودة
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
