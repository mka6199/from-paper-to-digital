import React from 'react';
import AuthProvider from './src/context/AuthProvider';
import RootNavigator from './src/navigation/RootNavigator';
import ThemeProvider from './src/theme/ThemeProvider';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
