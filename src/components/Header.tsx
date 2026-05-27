import type { Lang, Theme } from '../types';
import { getStrings } from '../i18n/strings';
interface Props {
  lang: Lang;
  toggleLang(): void;
  theme: Theme;
  toggleTheme(): void;
  menuOpen: boolean;
  setMenuOpen(v: boolean): void;
}
function LangToggle({
  lang,
  onClick,
  extraClass,
}: {
  lang: Lang;
  onClick(e: React.MouseEvent): void;
  extraClass?: string;
}) {
  return (
    <button
      className={`lang-toggle ${extraClass ?? ''}`.trim()}
      onClick={onClick}
      title="Switch Language"
    >
      <span className={`lang-opt ${lang === 'ja' ? 'lang-active' : ''}`}>
        JP
      </span>
      <span className="lang-sep">|</span>
      <span className={`lang-opt ${lang === 'en' ? 'lang-active' : ''}`}>
        EN
      </span>
    </button>
  );
}
function ThemeToggle({
  theme,
  onClick,
  lang,
}: {
  theme: Theme;
  onClick(e: React.MouseEvent): void;
  lang: Lang;
}) {
  const s = getStrings(lang);
  const isDark = theme === 'dark';
  return (
    <button
      className="theme-toggle"
      onClick={onClick}
      title={isDark ? s.lightMode : s.darkMode}
      aria-label="Theme"
    >
      <span className="theme-toggle-icon">🌙</span>
      <span className={`theme-toggle-track ${isDark ? '' : 'light'}`}>
        <span className="theme-toggle-thumb" />
      </span>
      <span className="theme-toggle-icon">☀️</span>
    </button>
  );
}
export function Header({
  lang,
  toggleLang,
  theme,
  toggleTheme,
  menuOpen,
  setMenuOpen,
}: Props) {
  return (
    <header className="header">
      <div className="header-center">
        <img
          src="./assets/favicon.svg"
          className="header-icon"
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="header-title-wrap">
          <h1 className="title">BrewRig</h1>
          <p className="subtitle">{getStrings(lang).appSubtitle}</p>
        </div>
      </div>
      <div className="header-right header-controls-wide">
        <LangToggle lang={lang} onClick={toggleLang} />
        <ThemeToggle theme={theme} onClick={toggleTheme} lang={lang} />
      </div>
      <div className="header-right header-controls-narrow">
        <button
          className="hamburger-btn"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          aria-label="Menu"
        >
          <span className={`hamburger-icon ${menuOpen ? 'open' : ''}`}>
            <span />
            <span />
            <span />
          </span>
        </button>
        {menuOpen && (
          <div
            className="hamburger-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <LangToggle
              lang={lang}
              onClick={toggleLang}
              extraClass="hamburger-lang"
            />
            <ThemeToggle theme={theme} onClick={toggleTheme} lang={lang} />
          </div>
        )}
      </div>
    </header>
  );
}
