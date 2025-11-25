'use client';

import { useState, useEffect, useCallback } from 'react';
import { t as translateFn, type Locale, loadLocale, saveLocale, DEFAULT_LOCALE } from '@/lib/i18n';

/**
 * useTranslation hook - Component'lerde çeviri kullanımı için
 *
 * @example
 * const { t, locale, setLocale } = useTranslation();
 *
 * // Kullanım
 * t('api.errors.general') // => "Bir hata oluştu"
 * t('api.errors.network') // => "Bağlantı hatası"
 *
 * // Dil değiştirme
 * setLocale('en');
 */
export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Component mount olduğunda localStorage'dan dil yükle
  useEffect(() => {
    const savedLocale = loadLocale();
    setLocaleState(savedLocale);
  }, []);

  // Dil değiştirme fonksiyonu
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    saveLocale(newLocale);
  }, []);

  // Çeviri fonksiyonu
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translateFn(locale, key, params);
    },
    [locale]
  );

  return {
    t,
    locale,
    setLocale,
  };
}
