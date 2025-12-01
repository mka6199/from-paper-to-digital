import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeProvider';
import AuthProvider from './src/context/AuthProvider';
import SyncProvider from './src/context/SyncProvider';
import RootNavigator from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/system/ErrorBoundary';

import { CurrencyProvider } from './src/context/CurrencyProvider';

export default function App() {
  return (
    <ErrorBoundary>
      <CurrencyProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <AuthProvider>
              <SyncProvider>
                <RootNavigator />
              </SyncProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </CurrencyProvider>
    </ErrorBoundary>
  );
}
