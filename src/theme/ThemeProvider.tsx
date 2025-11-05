import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';
import { DarkTheme, DefaultTheme, Theme as NavTheme } from '@react-navigation/native';

type Palette = {
  background: string;
  surface: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  brand: string;
  danger: string;
  warn: string;
  focus: string;

  // form helpers
  inputBg?: string;
  inputBorder?: string;
  // elevations (optional)
  cardElev?: string;
};

type ThemeContextType = {
  ready: boolean;
  mode: 'light' | 'dark';
  colors: Palette;
  navTheme: NavTheme;
  setMode: (m: 'light' | 'dark') => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);
const STORAGE_KEY = 'themeMode:v1';

const LIGHT: Palette = {
  background: '#F8F5EF',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#111827',
  subtext: '#6B7280',
  border: '#E5E7EB',
  brand: '#166534',
  danger: '#B91C1C',
  warn: '#92400E',
  focus: '#2563EB',
  inputBg: '#F9FAFB',
  inputBorder: '#E5E7EB',
  cardElev: '#FFFFFF',
};

const DARK: Palette = {
  background: '#0B0F13',
  surface: '#12171D',
  card: '#12171D',
  text: '#F3F4F6',
  subtext: '#A7AFB8',
  border: '#1F2937',
  brand: '#22C55E',
  danger: '#F87171',
  warn: '#F59E0B',
  focus: '#60A5FA',
  inputBg: '#1A2129',
  inputBorder: '#253041',
  cardElev: '#12171D',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start as not ready to avoid rendering with the wrong theme
  const [ready, setReady] = useState(false);

  // Default to system scheme if no stored pref exists
  const system: ColorSchemeName = Appearance.getColorScheme();
  const systemDefault: 'light' | 'dark' = system === 'dark' ? 'dark' : 'light';

  const [mode, setModeState] = useState<'light' | 'dark'>(systemDefault);

  // Hydrate from storage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') {
          setModeState(saved);
        } else {
          setModeState(systemDefault);
        }
      } catch {
        setModeState(systemDefault);
      } finally {
        setReady(true);
      }
    })();
  }, [systemDefault]);

  // Persist on change
  const setMode = React.useCallback(async (m: 'light' | 'dark') => {
    setModeState(m);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, m);
    } catch {}
  }, []);

  const colors = mode === 'dark' ? DARK : LIGHT;

  const navTheme: NavTheme = useMemo(
    () => ({
      ...(mode === 'dark' ? DarkTheme : DefaultTheme),
      colors: {
        ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        primary: colors.brand,
        notification: colors.danger,
      },
    }),
    [mode, colors.background, colors.surface, colors.text, colors.border, colors.brand, colors.danger]
  );

  const value = useMemo(
    () => ({ ready, mode, colors, navTheme, setMode }),
    [ready, mode, colors, navTheme, setMode]
  );

  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
