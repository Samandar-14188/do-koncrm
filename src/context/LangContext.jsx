import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations } from '../utils/translations';
import { transliterate as translit } from '../utils/transliterator';

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('dokoncrm_lang') || 'lotin';
  });

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'lotin' ? 'kirill' : 'lotin';
      localStorage.setItem('dokoncrm_lang', next);
      return next;
    });
  }, []);

  // Translate UI key or transliterate if not in dictionary
  const t = useCallback((key) => {
    if (!key) return '';
    const entry = translations[key];
    if (entry) {
      return entry[lang] || entry.lotin || key;
    }
    // Fallback: dynamic transliteration for user-entered text, product names, debtor names
    return translit(key, lang);
  }, [lang]);

  // Transliterate arbitrary user text to current script
  const transliterate = useCallback((text) => {
    if (!text) return '';
    return translit(text, lang);
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, toggleLang, t, transliterate }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLanguage must be inside LangProvider');
  return ctx;
}
