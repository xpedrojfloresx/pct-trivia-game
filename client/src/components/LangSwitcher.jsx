import { useLanguage } from '../context/LanguageContext';

const LANGS = [
  { code: 'es', flag: '🇦🇷', label: 'ES' },
  { code: 'en', flag: '🇺🇸', label: 'EN' },
  { code: 'pt', flag: '🇧🇷', label: 'PT' },
];

export default function LangSwitcher() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="lang-switcher">
      {LANGS.map(l => (
        <button
          key={l.code}
          className={`lang-btn ${lang === l.code ? 'active' : ''}`}
          onClick={() => setLang(l.code)}
        >
          <span className="lang-flag">{l.flag}</span>
          <span className="lang-code">{l.label}</span>
        </button>
      ))}
    </div>
  );
}
