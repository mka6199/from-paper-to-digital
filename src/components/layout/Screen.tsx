import React from 'react';
import { colors, spacing } from '../../theme/tokens';
import {
  KeyboardAvoidingView, Platform, ScrollView, StatusBar, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  backgroundColor = colors.bg,
  keyboardOffset = 0,
}: Props) {
  const Container = scroll ? ScrollView : View;
  const contentStyle = { padding: padded ? spacing.lg : 0 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <StatusBar barStyle={statusBarStyle === 'dark' ? 'dark-content' : 'light-content'} />
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
