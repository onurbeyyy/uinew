'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSelector() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <div className="language-selector">
      <button
        id="languageToggle"
        className={`language-toggle ${language === 'en' ? 'active' : ''}`}
        onClick={toggleLanguage}
      >
        <span id="languageText">{language.toUpperCase()}</span>
      </button>
    </div>
  );
}
