import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';

interface AvailableFeaturesProps {
  currentUser: User;
}

const AvailableFeatures = ({ currentUser }: AvailableFeaturesProps) => {
  const { t } = useLanguage();

  const getRoleDisplayName = (role?: string) => {
    if (!role) return '';
    const roleKey = `roles.${role}`;
    const translated = t(roleKey);
    return translated !== roleKey ? translated : role;
  };

  const getAvailableFeatures = () => {
    const role = currentUser?.role;
    const features: string[] = [];

    if (role === 'Admin') {
      features.push(
        t('dashboard.features.manageUsersAndDepts'),
        t('dashboard.features.accessAllDocs'),
        t('dashboard.features.advancedSearchAllDepts'),
        t('dashboard.features.systemSettings')
      );
    } else if (role === 'AdminTuningDesk') {
      features.push(
        t('dashboard.features.scanAndDigitizeDocs'),
        t('dashboard.features.ocrExtraction'),
        t('dashboard.features.assignDocsToDepts'),
        t('dashboard.features.advancedSearchAllDepts'),
        t('dashboard.features.switchGridListView')
      );
    } else if (role === 'AdminDepartment') {
      features.push(
        t('dashboard.features.manageDeptUsers'),
        t('dashboard.features.assignAndReplyDocs'),
        t('dashboard.features.manageAndClassifyFolders'),
        t('dashboard.features.searchWithinDept'),
        t('dashboard.features.assignDocResponsible')
      );
    } else if (role === 'User') {
      features.push(
        t('dashboard.features.viewDeptDocs'),
        t('dashboard.features.searchWithinDept'),
        t('dashboard.features.viewDocClassification'),
        t('dashboard.features.messagingSystem')
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
          {t('dashboard.features.titleForRole', { role: getRoleDisplayName(currentUser?.role) })}
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
