import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';

// Every visible string goes through i18next from day one (requirements §13.2). English in MVP 1;
// Hindi arrives in P1 as a second resource file.
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React escapes
  returnNull: false,
});

export { i18n };
