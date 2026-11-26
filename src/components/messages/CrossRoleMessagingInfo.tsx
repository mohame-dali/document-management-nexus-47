import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, MessageSquare, Shield, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDirection } from '@/i18n/useDirection';

const CrossRoleMessagingInfo: React.FC = () => {
  const { currentUser } = useAuth();
  const { dir, isRTL } = useDirection();
  const [isExpanded, setIsExpanded] = useState(false);

  const getUserRoleMessage = () => {
    const currentDept = currentUser?.activeDepartment?.name || (isRTL ? 'النظام' : 'système');

    if (!isRTL) {
      switch (currentUser?.role) {
        case 'User':
          return `En tant qu'utilisateur du service ${currentDept}, vous pouvez échanger des messages officiels avec tous les services.`;
        case 'AdminDepartment':
          return `En tant que chef du service ${currentDept}, vous pouvez communiquer directement avec toutes les directions.`;
        case 'AdminTuningDesk':
          return `En tant que responsable du bureau de coordination, vous pouvez échanger avec tous les services du système.`;
        case 'Admin':
          return `En tant qu'administrateur général, vous disposez d'un accès complet à la messagerie interservices.`;
        default:
          return `Vous pouvez communiquer librement avec tous les services et interlocuteurs autorisés.`;
      }
    }

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
    <div
      className="mb-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg text-start shadow-xs overflow-hidden"
      dir={dir}
    >
      <div className="px-3.5 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 bg-[#ebf4ff] dark:bg-sky-950/60 rounded-md border border-[#bee3f8] dark:border-sky-800/70 text-[#2c5282] dark:text-sky-300 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {getUserRoleMessage()}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 px-2.5 text-xs font-medium text-[#2c5282] dark:text-sky-300 hover:bg-[#ebf4ff] dark:hover:bg-slate-800 hover:text-[#234269] dark:hover:text-sky-200 rounded-md flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <span>
            {isExpanded
              ? (isRTL ? 'إخفاء التفاصيل' : 'Masquer')
              : (isRTL ? 'دليل الصلاحيات' : 'Guide des rôles')}
          </span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#9b2c2c] dark:text-red-400 shrink-0" />
                <span className="text-xs font-bold text-[#9b2c2c] dark:text-red-400">
                  {isRTL ? 'الإدارة العامة (Admin)' : 'Direction Générale (Admin)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {isRTL
                  ? 'مراسلات مركزية، توجيهات عامة وإعلانات رسمية لكافة المكاتب والأقسام.'
                  : 'Correspondances centrales, directives et annonces officielles.'}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#2c5282] dark:text-sky-400 shrink-0" />
                <span className="text-xs font-bold text-[#2c5282] dark:text-sky-400">
                  {isRTL ? 'مديرو الأقسام (Department)' : 'Chefs de service'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {isRTL
                  ? 'مراسلات رسمية متبادلة وتنسيق مباشر بين الإدارات والأقسام المعتمدة.'
                  : 'Échanges officiels et coordination directe entre directions.'}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#276749] dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-[#276749] dark:text-emerald-400">
                  {isRTL ? 'مكتب التنسيق (TuningDesk)' : 'Bureau de coordination'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {isRTL
                  ? 'متابعة سير المعاملات الإدارية وتبادل المذكرات التنسيقية المشتركة.'
                  : 'Suivi des dossiers administratifs et notes de coordination.'}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-600 dark:text-slate-300 shrink-0" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isRTL ? 'الموظفون (User)' : 'Collaborateurs (User)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {isRTL
                  ? 'رفع التقارير الميدانية والمراسلة المباشرة مع المسؤولين والمصالح المعنية.'
                  : 'Remontée de rapports et échanges directs avec les responsables.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossRoleMessagingInfo;
