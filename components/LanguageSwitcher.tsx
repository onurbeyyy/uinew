'use client';

import { useTranslation } from '@/hooks/useTranslation';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setLocale('tr')}
        className={`px-3 py-1 rounded transition-colors ${
          locale === 'tr'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
        aria-label="Türkçe"
      >
        TR
      </button>
      <button
        onClick={() => setLocale('en')}
        className={`px-3 py-1 rounded transition-colors ${
          locale === 'en'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
