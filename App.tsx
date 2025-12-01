import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeProvider';
import AuthProvider from './src/context/AuthProvider';
import SyncProvider from './src/context/SyncProvider';
import NotificationPreferencesProvider from './src/context/NotificationPreferencesProvider';
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
              <NotificationPreferencesProvider>
                <SyncProvider>
                  <RootNavigator />
                </SyncProvider>
              </NotificationPreferencesProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </CurrencyProvider>
    </ErrorBoundary>
  );
}
