import React from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, typography } from '../../theme/tokens';
import { AuthContext } from '../../context/AuthProvider';
import { signOut } from '../../config/firebase';


type Props = {
  title?: string;
  children: React.ReactNode;
};

export default function AdminGate({ title, children }: Props) {
  const { colors } = useTheme();
  const { authReady, profileReady, isAdmin } = React.useContext(AuthContext);

  if (!authReady || !profileReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        {title ? (
          <Text style={[typography.h2 as any, { color: colors.subtext, marginBottom: spacing.md }]}>
            {title}
          </Text>
        ) : null}
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={{ color: colors.subtext, marginTop: spacing.sm }}>Loading…</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <Text style={[typography.h2 as any, { color: colors.text }]}>
          Admins only
        </Text>
        <Text style={{ color: colors.subtext, textAlign: 'center' }}>
          You don’t have access to this section.
        </Text>
        <Pressable
          onPress={async () => {
            try { await signOut(); } catch {}
          }}
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>Log out</Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}
