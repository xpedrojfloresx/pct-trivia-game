import { createContext, useContext, useState } from 'react';
import { translations } from '../config/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('trivia-lang') || 'es'
  );

  const setLang = (newLang) => {
    localStorage.setItem('trivia-lang', newLang);
    setLangState(newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
