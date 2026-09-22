import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

/* Light is the default workspace. Dark exists only as an explicit, cached
   operator choice under this key. */
const STORAGE_KEY = 'bms_theme';
const THEMES = ['light', 'dark'];

/**
 * Read the cached choice defensively.
 *
 * localStorage throws on access in a private window and in some embedded
 * WebViews — unguarded, that exception happens during the very first render
 * and takes the whole app down before anything paints. An unrecognised stored
 * value (a stale key from an earlier rollout) also falls back to light rather
 * than stamping an attribute no stylesheet answers to.
 */
function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* Preference cannot be persisted (private mode) — the session still
         honours the toggle, it just will not survive a reload. */
    }
  }, [theme]);

  const toggleTheme = () => {
    document.documentElement.classList.add('theme-transitioning');
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 280);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
