import React from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageProvider';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const isAr = language === 'ar';
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(isAr ? 'fr' : 'ar')}
      className="h-9 sm:h-10 px-2.5 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-200 hover:text-[#2c5282] dark:hover:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      title={isAr ? 'Passer au français' : 'التبديل إلى العربية'}
      aria-label={isAr ? 'Passer au français' : 'التبديل إلى العربية'}
    >
      <Globe className="w-4 h-4" />
      <span>{isAr ? 'FR' : 'AR'}</span>
    </Button>
  );
};

export default LanguageSwitcher;
