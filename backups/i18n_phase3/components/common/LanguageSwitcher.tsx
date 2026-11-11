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
      className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium"
      title={isAr ? 'Passer au français' : 'التبديل إلى العربية'}
      aria-label={isAr ? 'Passer au français' : 'التبديل إلى العربية'}
    >
      <Globe className="w-4 h-4" />
      {isAr ? 'FR' : 'AR'}
    </Button>
  );
};

export default LanguageSwitcher;
