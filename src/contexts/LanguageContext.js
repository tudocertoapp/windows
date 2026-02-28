import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tudocerto_language';

export const LANGUAGES = {
  pt: { code: 'pt', label: 'Português', currency: 'R$', decimalSep: ',', thousandsSep: '.' },
  en: { code: 'en', label: 'English', currency: '$', decimalSep: '.', thousandsSep: ',' },
  es: { code: 'es', label: 'Español', currency: '$', decimalSep: ',', thousandsSep: '.' },
};

const LanguageContext = createContext(undefined);

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState('pt');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v && LANGUAGES[v]) setLocale(v);
    });
  }, []);

  const setLanguage = (code) => {
    if (!LANGUAGES[code]) return;
    setLocale(code);
    AsyncStorage.setItem(STORAGE_KEY, code);
  };

  const lang = LANGUAGES[locale] || LANGUAGES.pt;

  return (
    <LanguageContext.Provider value={{ locale, setLocale: setLanguage, lang, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  return ctx || { locale: 'pt', setLocale: () => {}, lang: LANGUAGES.pt, LANGUAGES };
}
