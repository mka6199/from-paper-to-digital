import React from 'react';
import { ActivityIndicator, Pressable, Text, View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';

type Variant = 'solid' | 'outline' | 'soft';
type Tone = 'green' | 'gold' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;   // default: 'solid'
  tone?: Tone;         // default: 'green'
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  accessibilityLabel?: string;
};

const wrapIfString = (n?: React.ReactNode, color = '#fff') =>
  typeof n === 'string' ? <Text style={[styles.iconText, { color }]}>{n}</Text> : n ?? null;

export default function Button({
  label,
  onPress,
  variant = 'solid',
  tone = 'green',
  fullWidth,
  disabled,
  loading = false,
  style,
  iconLeft,
  iconRight,
  accessibilityLabel,
}: Props) {
  // tone colors
  const main =
    tone === 'gold'   ? colors.gold   :
    tone === 'danger' ? colors.danger :
                        colors.brand; // green

  const fgSolid = '#fff';
  const fgOutline = main;
  const bgSolid = main;
  const bgSoft = `${main}22`; // translucent

  let backgroundColor = bgSolid;
  let textColor = fgSolid;
  let border: ViewStyle | undefined;

  if (variant === 'outline') {
    backgroundColor = 'transparent';
    textColor = fgOutline;
    border = { borderWidth: 1, borderColor: main };
  } else if (variant === 'soft') {
    backgroundColor = bgSoft;
    textColor = main;
  }

  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor },
        border,
        fullWidth && { width: '100%' },
        isDisabled && { opacity: 0.6 },
        pressed && !isDisabled && { opacity: 0.92 },
        style,
      ]}
    >
      <View style={styles.row}>
        {!loading && wrapIfString(iconLeft, textColor)}
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        )}
        {!loading && wrapIfString(iconRight, textColor)}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    minHeight: 44,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: 16, fontWeight: '700' },
  iconText: { fontSize: 16 },
});
