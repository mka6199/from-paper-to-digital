// App.tsx
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeProvider';
import AuthProvider from './src/context/AuthProvider';
import RootNavigator from './src/navigation/RootNavigator';

// ✅ ADD: currency provider wrapper (non-breaking)
import { CurrencyProvider } from './src/context/CurrencyProvider';

export default function App() {
  return (
    <CurrencyProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </CurrencyProvider>
  );
}
