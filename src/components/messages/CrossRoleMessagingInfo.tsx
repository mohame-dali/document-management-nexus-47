import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MessageSquare, Shield, Users, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useAuth } from '@/contexts/AuthContext';

const CrossRoleMessagingInfo: React.FC = () => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const getUserRoleMessage = () => {
    const currentDept = currentUser?.activeDepartment?.name || 'النظام';
    
    switch (currentUser?.role) {
      case 'User':
        return `كمستخدم في قسم ${currentDept}، يمكنك إرسال واستقبال المراسلات الرسمية مع جميع الأقسام والأدوار بدون قيود`;
      case 'AdminDepartment':
        return `كمدير قسم ${currentDept}، يمكنك التواصل المباشر مع جميع الإدارات والأقسام المعتمدة`;
      case 'AdminTuningDesk':
        return `كمدير مكتب التنسيق، يمكنك المراسلة والتنسيق عبر كافة أقسام ووحدات المنظومة`;
      case 'Admin':
        return 'كمدير عام للمنظومة، تملك صلاحيات المراسلة الشاملة لجميع المستخدمين والأقسام';
      default:
        return 'يمكنك التواصل والمراسلة مع جميع الأقسام والجهات المصرح لها';
    }
  };

  return (
    <div className="mb-4 bg-white border border-[#e2e8f0] rounded text-right shadow-xs overflow-hidden" dir="rtl">
      <div className="p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-slate-100 rounded text-[#2c5282] flex-shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {getUserRoleMessage()}
            </p>
            <p className="text-[11px] text-slate-500">
              نظام المراسلات الإدارية الموحدة — قناة آمنة وموثقة للمراسلات بين الأقسام
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-7 px-2 text-xs text-slate-600 hover:text-[#2c5282] hover:bg-slate-50 rounded flex items-center gap-1 flex-shrink-0"
        >
          <span>{isExpanded ? 'إخفاء التفاصيل' : 'دليل الصلاحيات'}</span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-3.5 pt-1 border-t border-[#edf2f7] bg-[#f8fafc] text-xs space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            <div className="p-2 bg-white rounded border border-[#e2e8f0]">
              <span className="font-semibold text-red-700 block mb-0.5">الإدارة العامة (Admin)</span>
              <span className="text-[11px] text-slate-500">مراسلات مركزية، إعلانات عامة وتوجيهات لكافة المكاتب</span>
            </div>
            <div className="p-2 bg-white rounded border border-[#e2e8f0]">
              <span className="font-semibold text-[#2c5282] block mb-0.5">مديرو الأقسام (Department)</span>
              <span className="text-[11px] text-slate-500">مراسلات رسمية داخلية وخارجية بين مختلف الإدارات</span>
            </div>
            <div className="p-2 bg-white rounded border border-[#e2e8f0]">
              <span className="font-semibold text-emerald-700 block mb-0.5">مكتب التنسيق (TuningDesk)</span>
              <span className="text-[11px] text-slate-500">متابعة سير المعاملات وتبادل المذكرات التنسيقية</span>
            </div>
            <div className="p-2 bg-white rounded border border-[#e2e8f0]">
              <span className="font-semibold text-slate-700 block mb-0.5">الموظفون (User)</span>
              <span className="text-[11px] text-slate-500">رفع التقارير والتواصل المباشر مع المسؤولين والزملاء</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossRoleMessagingInfo;
