import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { StorageKeys } from '{{IMPORT:storage.keys}}';
import { storageService } from '{{IMPORT:storage.service}}';
import { darkTheme, lightTheme, type Theme, type ThemeMode } from '{{IMPORT:theme.index}}';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  /** light → dark → system → light */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const NEXT_MODE: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' };

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeMode;
}

/** Light / dark / system theme. The chosen mode is persisted. */
export function ThemeProvider({ children, initialTheme = 'light' }: ThemeProviderProps): React.JSX.Element {
  // Re-renders when the OS appearance changes, which is what 'system' follows.
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialTheme);

  useEffect(() => {
    storageService.get<ThemeMode>(StorageKeys.THEME_MODE).then(saved => {
      if (isThemeMode(saved)) setThemeModeState(saved);
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    storageService.set(StorageKeys.THEME_MODE, mode);
  }, []);

  const toggleTheme = useCallback(() => setThemeMode(NEXT_MODE[themeMode]), [setThemeMode, themeMode]);

  const value = useMemo<ThemeContextType>(() => {
    const dark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
    const theme = dark ? darkTheme : lightTheme;
    return { theme, themeMode, setThemeMode, isDark: theme.isDark, toggleTheme };
  }, [themeMode, systemColorScheme, setThemeMode, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
