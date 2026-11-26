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
    } else if (role === 'Director') {
      features.push(
        t('dashboard.features.accessAllDocs'),
        t('dashboard.features.advancedSearchAllDepts'),
        t('dashboard.features.viewOrgChart')
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
    <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden">
      <CardHeader className="bg-slate-50/90 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-5 py-4">
        <CardTitle className="flex items-center gap-3 text-base sm:text-lg text-[#1a202c] dark:text-slate-100">
          <div className="p-2 bg-[#ebf4ff] dark:bg-slate-800 rounded-lg border border-[#bee3f8] dark:border-slate-700 text-[#2c5282] dark:text-blue-400">
            <Activity className="h-5 w-5" />
          </div>
          {t('dashboard.features.titleForRole', { role: getRoleDisplayName(currentUser?.role) })}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {getAvailableFeatures().map((feature, index) => (
            <div key={index} className="flex items-center gap-2.5 p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors duration-200">
              <span className="text-[#2d3748] dark:text-slate-200 text-sm font-medium">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailableFeatures;
