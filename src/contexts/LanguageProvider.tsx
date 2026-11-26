import React, { useEffect } from 'react';
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
    t: (key: string, options?: Record<string, unknown>) => t(key, options),
  };
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.title =
      i18n.language === 'fr'
        ? 'Système de Gestion Documentaire'
        : 'نظام إدارة الوثائق';
  }, [i18n.language]);

  return <>{children}</>;
};
