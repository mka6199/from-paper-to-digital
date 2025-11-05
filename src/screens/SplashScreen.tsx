// src/screens/SplashScreen.tsx
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export default function SplashScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
