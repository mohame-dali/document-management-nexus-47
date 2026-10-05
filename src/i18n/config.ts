import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import fr from './locales/fr.json';

const SUPPORTED = ['ar', 'fr'] as const;
type Lang = (typeof SUPPORTED)[number];

const stored = localStorage.getItem('dms-language');
const initialLang: Lang = SUPPORTED.includes(stored as Lang)
  ? (stored as Lang)
  : 'ar';

const applyHtmlAttributes = (lang: string) => {
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
};

i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, fr: { translation: fr } },
  lng: initialLang,
  fallbackLng: 'ar',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: (lngs, _ns, key) => {
    console.warn(`[i18n] Missing key: ${key} (${lngs.join(',')})`);
  },
});

applyHtmlAttributes(initialLang);
i18n.on('languageChanged', applyHtmlAttributes);

export default i18n;
