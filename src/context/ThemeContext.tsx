import React, { createContext, useContext, useState, useMemo } from 'react';

export type ThemeType = 'indigo' | 'cream';

export interface ThemeColors {
  primaryDark: string;
  primary: string;
  primaryLight: string;
  background: string;
  card: string;
  text: string;
}

const themeColorMap: Record<ThemeType, ThemeColors> = {
  indigo: {
    primaryDark: '#4338CA',
    primary: '#4F46E5',
    primaryLight: '#6366F1',
    background: '#F5F3FF',
    card: '#FFFFFF',
    text: '#1E1B4B',
  },
  cream: {
    primaryDark: '#C25E2D', // Softer dark orange
    primary: '#D97746', // Softer orange
    primaryLight: '#E28A5D', // Softer light orange
    background: '#FFFBF0', // Cream
    card: '#FFFFFF',
    text: '#1E1B4B',
  },
};

interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('indigo');

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'indigo' ? 'cream' : 'indigo'));
  };

  const colors = useMemo(() => themeColorMap[theme], [theme]);

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme: setThemeState }}>
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
