import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme as NavLight, DarkTheme as NavDark, Theme as NavTheme } from '@react-navigation/native';

type Mode = 'light' | 'dark';

type Palette = {
  background: string;
  surface: string;
  text: string;
  subtext: string;
  brand: string;
  danger: string;
  border: string;
};

const light: Palette = {
  background: '#f8f9fb',
  surface: '#ffffff',
  text: '#111827',
  subtext: '#6b7280',
  brand: '#176b3b',
  danger: '#e11d48',
  border: '#e5e7eb',
};

const dark: Palette = {
  background: '#0b0f14',
  surface: '#11151b',
  text: '#e5e7eb',
  subtext: '#9ca3af',
  brand: '#59d18a',
  danger: '#fb7185',
  border: '#253040',
};

function toNavTheme(p: Palette, mode: Mode): NavTheme {
  const base = mode === 'dark' ? NavDark : NavLight;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: p.background,
      card: p.surface,
      text: p.text,
      primary: p.brand,
      border: p.border,
      notification: p.brand,
    },
  };
}

type ThemeCtx = {
  mode: Mode;
  colors: Palette;
  navTheme: NavTheme;
  setMode: (m: Mode) => void;
  toggle: () => void;
  ready: boolean;
};

export const ThemeContext = React.createContext<ThemeCtx>({
  mode: 'light',
  colors: light,
  navTheme: toNavTheme(light, 'light'),
  setMode: () => {},
  toggle: () => {},
  ready: false,
});

export function useTheme() {
  return React.useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<Mode>('light');
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem('settings.darkMode');
      if (v === '1') setModeState('dark');
      setReady(true);
    })();
  }, []);

  const setMode = React.useCallback((m: Mode) => {
    setModeState(m);
    AsyncStorage.setItem('settings.darkMode', m === 'dark' ? '1' : '0').catch(() => {});
  }, []);

  const toggle = React.useCallback(() => setMode(mode === 'dark' ? 'light' : 'dark'), [mode, setMode]);

  const colors = mode === 'dark' ? dark : light;
  const navTheme = toNavTheme(colors, mode);

  return (
    <ThemeContext.Provider value={{ mode, colors, navTheme, setMode, toggle, ready }}>
      {children}
    </ThemeContext.Provider>
  );
}
