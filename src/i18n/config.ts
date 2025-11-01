
/**
 * Internationalization Configuration
 * 
 * Sets up i18next for multi-language support.
 * Currently configured for English with preparation for additional languages.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  // Future languages:
  // es: 'Español',
  // fr: 'Français',
  // de: 'Deutsch',
  // zh: '中文',
  // ja: '日本語',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Initialize i18next
 */
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
    },
    
    // Fallback language
    fallbackLng: 'en',
    
    // Default language
    lng: 'en',
    
    // Debug mode (disable in production)
    debug: import.meta.env.DEV,
    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Detection options
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator'],
      
      // Cache user language
      caches: ['localStorage'],
      
      // localStorage key
      lookupLocalStorage: 'i18nextLng',
    },
    
    // React options
    react: {
      useSuspense: false, // Disable suspense for now
    },
  });

export default i18n;
