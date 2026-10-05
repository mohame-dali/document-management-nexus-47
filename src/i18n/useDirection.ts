import { useTranslation } from 'react-i18next';

export const useDirection = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return {
    lang,
    isRTL: lang === 'ar',
    dir: lang === 'ar' ? 'rtl' : 'ltr'
  } as const;
};
