
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowLeftRight, CheckCircle, Building2, MessageSquare, Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useAuth } from '@/contexts/AuthContext';

const CrossRoleMessagingInfo: React.FC = () => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  
  const roles = [
    { name: t('roles.Admin'), role: 'Admin', color: 'bg-red-100 text-red-800 border-red-200', icon: Shield },
    { name: t('roles.AdminDepartment'), role: 'AdminDepartment', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Building2 },
    { name: t('roles.AdminTuningDesk'), role: 'AdminTuningDesk', color: 'bg-green-100 text-green-800 border-green-200', icon: Users },
    { name: t('roles.User'), role: 'User', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Users }
  ];

  const getUserRoleMessage = () => {
    const currentDept = currentUser?.activeDepartment?.name || 'النظام';
    
    switch (currentUser?.role) {
      case 'User':
        return `كمستخدم في قسم ${currentDept}، يمكنك إرسال واستقبال الرسائل من جميع المستخدمين في كافة الأقسام والأدوار`;
      case 'AdminDepartment':
        return `كمدير قسم ${currentDept}، يمكنك التواصل مع جميع مديري الأقسام الأخرى والمستخدمين في كافة الأقسام`;
      case 'AdminTuningDesk':
        return `كمدير مكتب التنسيق، يمكنك التواصل مع جميع الأقسام والأدوار في النظام`;
      case 'Admin':
        return 'كمدير عام، يمكنك التواصل مع جميع المستخدمين في كافة الأقسام';
      default:
        return 'يمكنك التواصل مع جميع المستخدمين في كافة الأقسام';
    }
  };

  return (
    <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200" dir="rtl">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-full">
            <MessageSquare className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              {t('messages.crossRoleEnabled')} - تواصل متكامل بين الأقسام
              <CheckCircle className="h-5 w-5 text-green-600" />
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              نظام رسائل متطور يدعم التواصل الفوري والآمن
            </p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-green-100 mb-4">
          <div className="text-sm text-gray-700 mb-3 flex items-start gap-2">
            <Building2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span className="font-medium">{getUserRoleMessage()}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center mb-4">
          {roles.map((role, index) => {
            const IconComponent = role.icon;
            return (
              <div key={role.role} className="flex items-center gap-2">
                <Badge className={`text-sm px-3 py-2 border ${role.color} ${currentUser?.role === role.role ? 'ring-2 ring-green-400 shadow-md' : ''}`}>
                  <IconComponent className="h-3 w-3 ml-1" />
                  {role.name}
                  {currentUser?.role === role.role && ' (أنت)'}
                </Badge>
                {index < roles.length - 1 && (
                  <ArrowLeftRight className="h-4 w-4 text-gray-400" />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Cross-department communication examples */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            أمثلة على التواصل بين الأقسام والأدوار:
          </div>
          <div className="text-sm text-blue-700 space-y-2">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-3 w-3" />
              <span>مدير قسم LABO ↔ مدير قسم PKI</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-3 w-3" />
              <span>مستخدم في قسم IT ↔ مدير قسم HR</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-3 w-3" />
              <span>مدير التنسيق ↔ جميع الأقسام</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-3 w-3" />
              <span>المدير العام ↔ كافة المستخدمين</span>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            <div className="flex flex-wrap gap-4 text-green-800">
              <span>✓ رسائل فردية</span>
              <span>✓ رسائل جماعية</span>
              <span>✓ {t('messages.fullHistory')}</span>
              <span>✓ تواصل بين جميع الأدوار والأقسام</span>
              <span>✓ إشعارات فورية</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CrossRoleMessagingInfo;
