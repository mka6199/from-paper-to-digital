import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

type Props = {
  title?: string;
  /** Called when back is pressed. If omitted, no back button is shown. */
  onBack?: () => void;
  /** Optional text label shown to the right of the back chevron, e.g. "Settings" */
  backLabel?: string;
  /** Optional element rendered on the right side (e.g., a button) */
  right?: React.ReactNode;
};

export default function AppHeader({ title, onBack, backLabel, right }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
            {backLabel ? (
              <Text style={[styles.backLabel, { color: colors.text }]}>
                {backLabel}
              </Text>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      {!!title && (
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      )}

      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    flexDirection: 'row',
  },
  left: { width: 120, flexDirection: 'row', alignItems: 'center' },
  right: { width: 120, alignItems: 'flex-end' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 },
  backLabel: { fontSize: 16, fontWeight: '600' },
});
