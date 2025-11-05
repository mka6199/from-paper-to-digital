import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';
import { DarkTheme, DefaultTheme, Theme as NavTheme } from '@react-navigation/native';

import {
  colors as LIGHT_TOKENS,
  colorsDark as DARK_TOKENS,
  spacing as spacingComfortable,
  spacingCompact as spacingCompactScale,
} from '../theme/tokens';

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

  inputBg?: string;
  inputBorder?: string;
  cardElev?: string;
};

type ThemeContextType = {
  ready: boolean;
  mode: 'light' | 'dark';
  colors: Palette;
  navTheme: NavTheme;
  setMode: (m: 'light' | 'dark') => void;

  density: 'comfortable' | 'compact';
  setDensity: (d: 'comfortable' | 'compact') => void;
  spacingScale: typeof spacingComfortable;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_MODE = 'themeMode:v1';
const STORAGE_DENSITY = 'themeDensity:v1';

function mapTokensToPalette(isDark: boolean): Palette {
  const t = isDark ? DARK_TOKENS : LIGHT_TOKENS;

  const inputBg = isDark ? '#1A2129' : '#F9FAFB';
  const inputBorder = isDark ? t.border || '#253041' : t.border || '#E5E7EB';
  const cardElev = t.surface || (isDark ? '#11161A' : '#FFFFFF');

  return {
    background: t.background ?? t.bg ?? (isDark ? '#0B0F13' : '#F8F5EF'),
    surface: t.surface ?? t.card ?? (isDark ? '#11161A' : '#FFFFFF'),
    card: t.card ?? t.surface ?? (isDark ? '#11161A' : '#FFFFFF'),
    text: t.text ?? (isDark ? '#E5E7EB' : '#111827'),
    subtext: t.subtext ?? (isDark ? '#9CA3AF' : '#6B7280'),
    border: t.border ?? (isDark ? '#27323A' : '#E5E7EB'),
    brand: t.brand ?? (isDark ? '#22C55E' : '#166534'),
    danger: t.danger ?? (isDark ? '#EF4444' : '#B91C1C'),
    warn: t.warn ?? (isDark ? '#F59E0B' : '#92400E'),
    focus: t.focus ?? (isDark ? '#60A5FA' : '#2563EB'),
    inputBg,
    inputBorder,
    cardElev,
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  const system: ColorSchemeName = Appearance.getColorScheme();
  const systemDefault: 'light' | 'dark' = system === 'dark' ? 'dark' : 'light';
  const [mode, setModeState] = useState<'light' | 'dark'>(systemDefault);

  const [density, setDensityState] = useState<'comfortable' | 'compact'>('comfortable');

  useEffect(() => {
    (async () => {
      try {
        const [savedMode, savedDensity] = await Promise.all([
          AsyncStorage.getItem(STORAGE_MODE),
          AsyncStorage.getItem(STORAGE_DENSITY),
        ]);
        if (savedMode === 'light' || savedMode === 'dark') setModeState(savedMode);
        else setModeState(systemDefault);

        if (savedDensity === 'comfortable' || savedDensity === 'compact') {
          setDensityState(savedDensity);
        }
      } finally {
        setReady(true);
      }
    })();
  }, [systemDefault]);

  const setMode = React.useCallback(async (m: 'light' | 'dark') => {
    setModeState(m);
    try {
      await AsyncStorage.setItem(STORAGE_MODE, m);
    } catch {}
  }, []);

  const setDensity = React.useCallback(async (d: 'comfortable' | 'compact') => {
    setDensityState(d);
    try {
      await AsyncStorage.setItem(STORAGE_DENSITY, d);
    } catch {}
  }, []);

  const colors = useMemo(() => mapTokensToPalette(mode === 'dark'), [mode]);

  const spacingScale = density === 'compact' ? spacingCompactScale : spacingComfortable;

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
    () => ({
      ready,
      mode,
      colors,
      navTheme,
      setMode,

      density,
      setDensity,
      spacingScale,
    }),
    [ready, mode, colors, navTheme, setMode, density, setDensity, spacingScale]
  );

  if (!ready) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
