import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_PALETTES, ThemeColors, ThemeType } from '../theme/tokens';
import { Language, TRANSLATIONS } from '../i18n/translations';

export type { ThemeType, ThemeColors };

interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  language: Language;
  t: typeof TRANSLATIONS.mr | typeof TRANSLATIONS.en;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_ORDER: ThemeType[] = ['emerald', 'teal', 'cream'];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('emerald');
  const [language, setLanguageState] = useState<Language>('mr');

  useEffect(() => {
    AsyncStorage.multiGet(['APP_THEME', 'APP_LANG'])
      .then((entries) => {
        const savedTheme = entries[0]?.[1];
        const savedLang = entries[1]?.[1];
        if (savedTheme === 'emerald' || savedTheme === 'teal' || savedTheme === 'cream') {
          setThemeState(savedTheme);
        }
        if (savedLang === 'mr' || savedLang === 'en') {
          setLanguageState(savedLang);
        }
      })
      .catch(() => {});
  }, []);

  const setTheme = (next: ThemeType) => {
    setThemeState(next);
    AsyncStorage.setItem('APP_THEME', next).catch(() => {});
  };

  const toggleTheme = () => {
    const idx = THEME_ORDER.indexOf(theme);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    setTheme(next);
  };

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    AsyncStorage.setItem('APP_LANG', next).catch(() => {});
  };

  const toggleLanguage = () => {
    setLanguage(language === 'mr' ? 'en' : 'mr');
  };

  const colors = useMemo(() => THEME_PALETTES[theme] || THEME_PALETTES.emerald, [theme]);
  const t = useMemo(() => TRANSLATIONS[language], [language]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        language,
        t,
        toggleTheme,
        setTheme,
        toggleLanguage,
        setLanguage,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeColors = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeColors must be used within a ThemeProvider');
  }
  return context;
};
