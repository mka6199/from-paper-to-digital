import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import OfflineIndicator from '../system/OfflineIndicator';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  statusBarStyle?: 'dark' | 'light';
  backgroundColor?: string;
  keyboardOffset?: number;
};

export default function Screen({
  children,
  scroll = false,
  padded = true,
  style,
  statusBarStyle = 'dark',
  backgroundColor,
  keyboardOffset = 0,
}: Props) {
  const { colors, mode } = useTheme();
  const Container = scroll ? ScrollView : View;
  const contentStyle = { padding: padded ? spacing.lg : 0 };
  const bg = backgroundColor ?? colors.background;
  const barStyle =
    mode === 'dark'
      ? 'light-content'
      : statusBarStyle === 'dark'
      ? 'dark-content'
      : 'light-content';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar barStyle={barStyle} />
      <OfflineIndicator />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardOffset}
      >
        <Container
          style={[!scroll && { flex: 1 }, style]}
          contentContainerStyle={scroll ? contentStyle : undefined}
        >
          {!scroll ? <View style={contentStyle}>{children}</View> : children}
        </Container>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
