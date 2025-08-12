
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { User } from '@/types';

interface AvailableFeaturesProps {
  currentUser: User;
}

const AvailableFeatures = ({ currentUser }: AvailableFeaturesProps) => {
  const getAvailableFeatures = () => {
    const role = currentUser?.role;
    const features = [];

    if (role === 'Admin') {
      features.push(
        'إدارة المستخدمين والأقسام',
        'الوصول لجميع الوثائق في النظام',
        'البحث المتقدم عبر جميع الأقسام',
        'إعدادات النظام'
      );
    } else if (role === 'AdminTuningDesk') {
      features.push(
        'رقمنة ومسح الوثائق',
        'استخراج النصوص OCR',
        'تخصيص الوثائق للأقسام',
        'البحث المتقدم عبر جميع الأقسام',
        'التبديل بين عرض الشبكة والقائمة'
      );
    } else if (role === 'AdminDepartment') {
      features.push(
        'إدارة مستخدمي القسم',
        'تخصيص والرد على الوثائق',
        'إدارة وتصنيف المجلدات',
        'البحث داخل القسم',
        'تحديد المسؤولين عن الوثائق'
      );
    } else if (role === 'User') {
      features.push(
        'عرض وثائق القسم',
        'البحث داخل القسم',
        'عرض تصنيف الوثائق',
        'نظام المراسلة'
      );
    }

    return features;
  };

  return (
    <Card className="bg-white shadow-lg border border-slate-200 rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="h-6 w-6 text-blue-600" />
          </div>
          الميزات المتاحة لـ {currentUser?.role}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {getAvailableFeatures().map((feature, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex-shrink-0" />
              <span className="text-slate-700 font-medium">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailableFeatures;
