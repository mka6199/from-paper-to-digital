import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

type Props = {
  title?: string;
  subtitle?: string;
  /** Called when back is pressed. If omitted, no back button is shown. */
  onBack?: () => void;
  /** Optional element rendered on the right side (e.g., a button) */
  right?: React.ReactNode;
  /** If true, removes the bottom border */
  noBorder?: boolean;
  /** If true, increases vertical padding for larger header */
  large?: boolean;
  /** If true, makes background transparent */
  transparent?: boolean;
};

export default function AppHeader({ 
  title, 
  subtitle, 
  onBack, 
  right, 
  noBorder,
  large,
  transparent
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          borderBottomColor: colors.border,
          backgroundColor: transparent ? 'transparent' : colors.surface,
          paddingVertical: large ? spacing.xl : spacing.md,
        },
        noBorder && { borderBottomWidth: 0 },
      ]}
    >
      {/* Left side - Back button */}
      <View style={styles.left}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        )}
      </View>

      {/* Center - Title and subtitle */}
      <View style={styles.center}>
        {!!title && (
          <Text 
            style={[
              large ? typography.h1 : styles.title, 
              { color: colors.text }
            ]} 
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
        {!!subtitle && (
          <Text 
            style={[typography.small, { color: colors.subtext, marginTop: 2 }]} 
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right side - Optional action */}
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  left: { 
    width: 40,
    justifyContent: 'center',
  },
  center: { 
    flex: 1,
    justifyContent: 'center',
  },
  right: { 
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: { 
    fontSize: 20, 
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  backBtn: { 
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
});
