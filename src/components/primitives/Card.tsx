import React from 'react';
import { View, ViewProps } from 'react-native';
import { radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

export default function Card({ style, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
        },
        style,
      ]}
      {...rest}
    />
  );
}
