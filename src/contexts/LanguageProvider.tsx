import React from 'react';
import { useTranslation } from 'react-i18next';
import '../i18n/config';

export const useLanguage = () => {
  const { t, i18n } = useTranslation();
  return {
    language: i18n.language,
    setLanguage: (l: string) => {
      if (l !== 'ar' && l !== 'fr') return;
      i18n.changeLanguage(l);
      localStorage.setItem('dms-language', l);
    },
    t: (key: string) => t(key),
  };
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
