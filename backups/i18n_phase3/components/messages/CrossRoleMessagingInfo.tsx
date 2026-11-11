import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, MessageSquare, Shield, Users, ChevronDown, ChevronUp } from 'lucide-react';
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
    <div className="mb-6 bg-white border border-[#e2e8f0] rounded text-right shadow-xs overflow-hidden" dir="rtl">
      <div className="p-5 sm:p-6 lg:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#ebf4ff] rounded border border-[#bee3f8] text-[#2c5282] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <Building2 className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <p className="text-base sm:text-lg lg:text-xl font-bold text-[#1a202c] leading-relaxed">
              {getUserRoleMessage()}
            </p>
            <p className="text-sm sm:text-base text-[#4a5568] leading-relaxed">
              نظام المراسلات الإدارية الموحدة — قناة آمنة وموثقة للمراسلات بين مختلف الإدارات والأقسام
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-11 min-h-[44px] px-5 py-2.5 text-base font-semibold text-[#2c5282] border-[#cbd5e1] hover:bg-[#ebf4ff] hover:text-[#234269] hover:border-[#bee3f8] rounded flex items-center gap-2.5 flex-shrink-0 self-end sm:self-center transition-colors duration-200"
        >
          <span>{isExpanded ? 'إخفاء التفاصيل' : 'دليل الصلاحيات'}</span>
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="px-5 sm:px-6 lg:px-7 pb-6 pt-5 border-t border-[#e2e8f0] bg-[#f8fafc] space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <div className="p-5 bg-white rounded border border-[#e2e8f0] shadow-xs space-y-2.5 hover:border-[#cbd5e1] transition-colors">
              <div className="flex items-center gap-2.5">
                <Shield className="h-5 w-5 text-[#9b2c2c] flex-shrink-0" />
                <span className="text-base sm:text-lg font-bold text-[#9b2c2c]">الإدارة العامة (Admin)</span>
              </div>
              <p className="text-sm sm:text-base text-[#4a5568] leading-relaxed">
                مراسلات مركزية، توجيهات عامة وإعلانات رسمية لكافة المكاتب والأقسام.
              </p>
            </div>

            <div className="p-5 bg-white rounded border border-[#e2e8f0] shadow-xs space-y-2.5 hover:border-[#cbd5e1] transition-colors">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-5 w-5 text-[#2c5282] flex-shrink-0" />
                <span className="text-base sm:text-lg font-bold text-[#2c5282]">مديرو الأقسام (Department)</span>
              </div>
              <p className="text-sm sm:text-base text-[#4a5568] leading-relaxed">
                مراسلات رسمية متبادلة وتنسيق مباشر بين الإدارات والأقسام المعتمدة.
              </p>
            </div>

            <div className="p-5 bg-white rounded border border-[#e2e8f0] shadow-xs space-y-2.5 hover:border-[#cbd5e1] transition-colors">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="h-5 w-5 text-[#276749] flex-shrink-0" />
                <span className="text-base sm:text-lg font-bold text-[#276749]">مكتب التنسيق (TuningDesk)</span>
              </div>
              <p className="text-sm sm:text-base text-[#4a5568] leading-relaxed">
                متابعة سير المعاملات الإدارية وتبادل المذكرات التنسيقية المشتركة.
              </p>
            </div>

            <div className="p-5 bg-white rounded border border-[#e2e8f0] shadow-xs space-y-2.5 hover:border-[#cbd5e1] transition-colors">
              <div className="flex items-center gap-2.5">
                <Users className="h-5 w-5 text-[#4a5568] flex-shrink-0" />
                <span className="text-base sm:text-lg font-bold text-[#4a5568]">الموظفون (User)</span>
              </div>
              <p className="text-sm sm:text-base text-[#4a5568] leading-relaxed">
                رفع التقارير الميدانية والمراسلة المباشرة مع المسؤولين والمصالح المعنية.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossRoleMessagingInfo;
