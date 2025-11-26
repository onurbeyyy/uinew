import tr from '@/locales/tr.json';
import en from '@/locales/en.json';

export type Locale = 'tr' | 'en';
export type TranslationKey = string;

const translations = {
  tr,
  en,
};

/**
 * Nested object'ten deep key ile değer almak için yardımcı fonksiyon
 * Örnek: get(obj, 'api.errors.general') => obj.api.errors.general
 */
function getNestedValue(obj: any, key: string): string {
  return key.split('.').reduce((acc, part) => acc?.[part], obj) || key;
}

/**
 * Çeviri fonksiyonu
 * @param locale - Dil kodu ('tr' veya 'en')
 * @param key - Çeviri anahtarı (örn: 'api.errors.general')
 * @param params - Opsiyonel parametreler için object
 * @returns Çevrilmiş metin
 */
export function t(locale: Locale, key: TranslationKey, params?: Record<string, string | number>): string {
  const translation = getNestedValue(translations[locale], key);

  if (!params) {
    return translation;
  }

  // Parametreleri {{param}} formatında değiştir
  return Object.entries(params).reduce((text, [key, value]) => {
    return text.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }, translation);
}

/**
 * Varsayılan dil
 */
export const DEFAULT_LOCALE: Locale = 'tr';

/**
 * Tarayıcı dilini tespit et
 */
export function detectBrowserLocale(): Locale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const browserLang = navigator.language.split('-')[0];
  return (browserLang === 'en' || browserLang === 'tr') ? browserLang as Locale : DEFAULT_LOCALE;
}

/**
 * Locale'i localStorage'a kaydet
 */
export function saveLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale);
  }
}

/**
 * Locale'i localStorage'dan oku
 */
export function loadLocale(): Locale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const stored = localStorage.getItem('locale');
  return (stored === 'tr' || stored === 'en') ? stored : detectBrowserLocale();
}
