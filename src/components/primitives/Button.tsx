import React from 'react';
import { ActivityIndicator, Pressable, Text, View, StyleSheet, ViewStyle } from 'react-native';
import { radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import type { TextStyle } from 'react-native';

type Variant = 'solid' | 'outline' | 'soft';
type Tone = 'green' | 'warn' | 'gold' | 'danger';
type Size = 'md' | 'sm';
type Density = 'comfortable' | 'compact';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  tone?: Tone;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  accessibilityLabel?: string;

  size?: Size;
  density?: Density;
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

  size = 'md',
  density = 'comfortable',
}: Props) {
  const { colors } = useTheme();

  const main =
    tone === 'danger' ? colors.danger :
    tone === 'warn' || tone === 'gold' ? colors.warn :
    colors.brand;

  const fgSolid = '#fff';
  const fgOutline = main;
  const bgSolid = main;
  const bgSoft = `${main}22`;

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

  const verticalPad = size === 'sm'
    ? spacing.sm
    : spacing.md;

  const textStyle: TextStyle =
      size === 'sm'
        ? { fontSize: 14, fontWeight: 600 }
        : { fontSize: 16, fontWeight: 700 };

  const compactAdjust = density === 'compact' ? { paddingVertical: verticalPad - 4 } : { paddingVertical: verticalPad };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        compactAdjust,
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
          <Text style={[textStyle, { color: textColor }]}>{label}</Text>
        )}
        {!loading && wrapIfString(iconRight, textColor)}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    minHeight: 36, 
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconText: { fontSize: 16 },
});
