
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
    <Card className="bg-white shadow-sm border border-[#e2e8f0] rounded overflow-hidden">
      <CardHeader className="bg-[#f7fafc] border-b border-[#e2e8f0] px-5 py-4">
        <CardTitle className="flex items-center gap-3 text-base sm:text-lg text-[#1a202c]">
          <div className="p-2 bg-[#ebf4ff] rounded border border-[#bee3f8] text-[#2c5282]">
            <Activity className="h-5 w-5" />
          </div>
          الميزات المتاحة لـ {currentUser?.role}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {getAvailableFeatures().map((feature, index) => (
            <div key={index} className="flex items-center gap-2.5 p-3 bg-[#f7fafc] rounded border border-[#e2e8f0] hover:bg-[#edf2f7] transition-colors duration-200">
              <div className="w-1.5 h-1.5 bg-[#2c5282] rounded-full flex-shrink-0" />
              <span className="text-[#2d3748] text-sm font-medium">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailableFeatures;
